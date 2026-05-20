"use server";

import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { createSession, postAuthDestination } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  decodeTransports,
  rpID,
  rpOrigin,
  storeChallenge,
  takeChallenge,
} from "@/lib/webauthn";

export type PasskeyLoginBeginState =
  | { ok: true; options: PublicKeyCredentialRequestOptionsJSON }
  | { ok: false; error: string };

export type PasskeyLoginFinishState =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Begin a usernameless (discoverable-credential) sign-in: no `allowCredentials`
 * means the authenticator offers whichever passkey the user has for this site.
 *
 * `userVerification: "required"` enforces a local biometric/PIN (or platform
 * equivalent) so a found-and-tapped hardware key cannot mint a session on
 * physical-access alone — a non-trivial concern given any volunteer account
 * with admin role gains coordinator powers. Modern platform passkeys
 * (Touch/Face ID, Windows Hello, Android biometric) satisfy this transparently.
 */
export async function beginPasskeyLogin(): Promise<PasskeyLoginBeginState> {
  try {
    const options = await generateAuthenticationOptions({
      rpID: rpID(),
      userVerification: "required",
      allowCredentials: [],
    });
    await storeChallenge("authentication", options.challenge);
    return { ok: true, options };
  } catch (err) {
    console.error("[passkey] begin login failed", err);
    return { ok: false, error: "Couldn't start passkey sign-in. Try again." };
  }
}

/**
 * Verify the authenticator's assertion against the stored challenge, advance
 * the signature counter, and open a session. Returns where the client should
 * navigate (it does a full load so server components see the new session).
 */
export async function finishPasskeyLogin(
  response: AuthenticationResponseJSON,
  next?: string | null,
): Promise<PasskeyLoginFinishState> {
  const expectedChallenge = await takeChallenge("authentication");
  if (!expectedChallenge) {
    return {
      ok: false,
      error: "That sign-in attempt expired. Please try again.",
    };
  }

  const passkey = await db.passkey.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });
  if (!passkey) {
    return {
      ok: false,
      error: "We don't recognise that passkey. Try another sign-in method.",
    };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rpOrigin(),
      expectedRPID: rpID(),
      // Pair with the "required" advertised in beginPasskeyLogin: enforce that
      // the authenticator actually performed user verification before we open
      // a session. Without this the server accepts a UP-only assertion (touch
      // but no biometric/PIN), defeating the option we asked the browser for.
      requireUserVerification: true,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: decodeTransports(passkey.transports) as
          | AuthenticatorTransportFuture[]
          | undefined,
      },
    });
  } catch (err) {
    console.error("[passkey] verification failed", err);
    return { ok: false, error: "We couldn't verify that passkey." };
  }

  if (!verification.verified) {
    return { ok: false, error: "We couldn't verify that passkey." };
  }

  // Cloned-authenticator detection. SimpleWebAuthn only checks counter
  // monotonicity when both stored and new are non-zero — most platform
  // passkeys (Apple, Google, Windows Hello) ship counter=0 forever, so this
  // is a no-op for them, but a hardware key that does increment should
  // detect a regression locally rather than trust the library.
  const newCounter = verification.authenticationInfo.newCounter;
  if (passkey.counter > 0 && newCounter <= passkey.counter) {
    console.error(
      `[passkey] counter regression for credential ${passkey.id}: stored=${passkey.counter} new=${newCounter}`,
    );
    return {
      ok: false,
      error: "That passkey looks duplicated. Remove and re-register it.",
    };
  }

  await db.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: newCounter,
      lastUsedAt: new Date(),
    },
  });
  await createSession(passkey.userId);
  const posthog = getPostHogClient();
  posthog.capture({ distinctId: passkey.userId, event: "passkey_sign_in" });
  await posthog.flush();
  return { ok: true, redirectTo: postAuthDestination(passkey.user, next) };
}
