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
 */
export async function beginPasskeyLogin(): Promise<PasskeyLoginBeginState> {
  try {
    const options = await generateAuthenticationOptions({
      rpID: rpID(),
      userVerification: "preferred",
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
      requireUserVerification: false,
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

  await db.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  });
  await createSession(passkey.userId);
  return { ok: true, redirectTo: postAuthDestination(passkey.user, next) };
}
