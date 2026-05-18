"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { GOOGLE_PROVIDER } from "@/lib/oauth";
import {
  RP_NAME,
  decodeTransports,
  encodeTransports,
  rpID,
  rpOrigin,
  storeChallenge,
  takeChallenge,
} from "@/lib/webauthn";

export type RegisterBeginState =
  | { ok: true; options: PublicKeyCredentialCreationOptionsJSON }
  | { ok: false; error: string };

export type RegisterFinishState = { ok: boolean; error?: string };

const MAX_PASSKEYS = 10;
const LABEL_MAX = 40;

/**
 * Count the distinct ways `userId` can still get in. Used to refuse removing
 * the last one (password reset can re-add a password later, but we never let a
 * volunteer strand themselves with nothing).
 */
async function signInMethodCount(userId: string) {
  const [user, oauth, passkeys] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    }),
    db.oAuthAccount.count({ where: { userId } }),
    db.passkey.count({ where: { userId } }),
  ]);
  return (user.passwordHash ? 1 : 0) + oauth + passkeys;
}

export async function beginPasskeyRegistration(): Promise<RegisterBeginState> {
  const user = await requireUser();
  try {
    const existing = await db.passkey.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    });
    if (existing.length >= MAX_PASSKEYS) {
      return {
        ok: false,
        error: `You can register up to ${MAX_PASSKEYS} passkeys. Remove one first.`,
      };
    }
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpID(),
      userName: user.email,
      userID: new TextEncoder().encode(user.id),
      userDisplayName: user.name,
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: decodeTransports(c.transports) as
          | AuthenticatorTransportFuture[]
          | undefined,
      })),
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
    });
    await storeChallenge("registration", options.challenge);
    return { ok: true, options };
  } catch (err) {
    console.error("[passkey] begin registration failed", err);
    return { ok: false, error: "Couldn't start passkey setup. Try again." };
  }
}

export async function finishPasskeyRegistration(
  response: RegistrationResponseJSON,
  rawLabel: string,
): Promise<RegisterFinishState> {
  const user = await requireUser();

  const label =
    z.string().trim().min(1).max(LABEL_MAX).safeParse(rawLabel).data ??
    "Passkey";

  const expectedChallenge = await takeChallenge("registration");
  if (!expectedChallenge) {
    return { ok: false, error: "That setup attempt expired. Try again." };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: rpOrigin(),
      expectedRPID: rpID(),
      requireUserVerification: false,
    });
  } catch (err) {
    console.error("[passkey] registration verification failed", err);
    return { ok: false, error: "We couldn't register that passkey." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "We couldn't register that passkey." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  try {
    await db.passkey.create({
      data: {
        userId: user.id,
        credentialId: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: encodeTransports(credential.transports),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        name: label,
      },
    });
  } catch (err) {
    // Unique violation == this authenticator is already registered.
    console.error("[passkey] store failed", err);
    return { ok: false, error: "That passkey is already registered." };
  }

  revalidatePath("/me/security");
  return { ok: true };
}

const RemovePasskeySchema = z.object({ passkeyId: z.string().min(1) });

export async function removePasskeyAction(formData: FormData) {
  const user = await requireUser();
  const parsed = RemovePasskeySchema.safeParse({
    passkeyId: formData.get("passkeyId"),
  });
  if (!parsed.success) return;

  const passkey = await db.passkey.findUnique({
    where: { id: parsed.data.passkeyId },
  });
  if (!passkey || passkey.userId !== user.id) return;

  if ((await signInMethodCount(user.id)) <= 1) {
    redirect("/me/security?error=last_method");
  }

  await db.passkey.delete({ where: { id: passkey.id } });
  revalidatePath("/me/security");
}

export async function disconnectGoogleAction() {
  const user = await requireUser();

  const hasGoogle = await db.oAuthAccount.count({
    where: { userId: user.id, provider: GOOGLE_PROVIDER },
  });
  if (hasGoogle === 0) return;

  if ((await signInMethodCount(user.id)) <= 1) {
    redirect("/me/security?error=last_method");
  }

  await db.oAuthAccount.deleteMany({
    where: { userId: user.id, provider: GOOGLE_PROVIDER },
  });
  revalidatePath("/me/security");
}
