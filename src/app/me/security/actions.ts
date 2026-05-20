"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { Prisma } from "@/generated/prisma";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { fullName } from "@/lib/users";
import { GOOGLE_PROVIDER } from "@/lib/oauth";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  RP_NAME,
  decodeTransports,
  encodeTransports,
  rpID,
  rpOrigin,
  storeChallenge,
  takeChallenge,
} from "@/lib/webauthn";

const PASSWORD_MIN = 8;
const SESSION_COOKIE = "ff_session";

export type RegisterBeginState =
  | { ok: true; options: PublicKeyCredentialCreationOptionsJSON }
  | { ok: false; error: string };

export type RegisterFinishState = { ok: boolean; error?: string };

const MAX_PASSKEYS = 10;
const LABEL_MAX = 40;

/**
 * Count the distinct ways `userId` can still get in. Always called inside the
 * same serializable transaction as the delete it guards, so the check + delete
 * are atomic — two concurrent removals can't both observe count > 1 and strand
 * the account with zero sign-in methods. (Password reset can re-add a password
 * later, but we never let a volunteer lock themselves out here.)
 */
async function signInMethodCount(
  tx: Prisma.TransactionClient,
  userId: string,
) {
  const [user, oauth, passkeys] = await Promise.all([
    tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    }),
    tx.oAuthAccount.count({ where: { userId } }),
    tx.passkey.count({ where: { userId } }),
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
      userDisplayName: fullName(user),
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
    // Only a unique-constraint violation means "already registered" (repo
    // convention: match the Prisma "Unique" error string). Anything else is a
    // real failure — surface a retry rather than a silent false success.
    if (err instanceof Error && err.message.includes("Unique")) {
      return { ok: false, error: "That passkey is already registered." };
    }
    console.error("[passkey] store failed", err);
    return { ok: false, error: "Couldn't save that passkey. Try again." };
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

  // Guard + delete in one serializable transaction; redirect happens after it
  // resolves so control flow never unwinds through an open transaction.
  const outcome = await db.$transaction(
    async (tx) => {
      const passkey = await tx.passkey.findUnique({
        where: { id: parsed.data.passkeyId },
      });
      if (!passkey || passkey.userId !== user.id) return "noop" as const;
      if ((await signInMethodCount(tx, user.id)) <= 1) return "last" as const;
      await tx.passkey.delete({ where: { id: passkey.id } });
      return "removed" as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (outcome === "last") redirect("/me/security?error=last_method");
  if (outcome === "removed") revalidatePath("/me/security");
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters.`),
    confirm: z.string().min(1, "Confirm your new password."),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type ChangePasswordState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<"currentPassword" | "newPassword" | "confirm", string>
  >;
};

/**
 * In-place password change/set for a signed-in user. When the account already
 * has a password we require the current one (standard "change" UX); when it
 * doesn't (Google-/passkey-only sign-up), we let the existing session vouch
 * for the user — they already proved control of the account to reach this
 * page. Either way, every *other* session is revoked: a real password change
 * should kick a lost or compromised device.
 */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? undefined,
    newPassword: formData.get("newPassword"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: ChangePasswordState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "newPassword" ||
        key === "confirm" ||
        key === "currentPassword"
      ) {
        fieldErrors[key] ??= issue.message;
      }
    }
    return Object.keys(fieldErrors).length
      ? { fieldErrors }
      : { error: "Couldn't save that. Please check the form and try again." };
  }

  if (user.passwordHash) {
    const current = parsed.data.currentPassword ?? "";
    if (!current) {
      return {
        fieldErrors: { currentPassword: "Enter your current password." },
      };
    }
    const ok = await verifyPassword(current, user.passwordHash);
    if (!ok) {
      return {
        fieldErrors: {
          currentPassword: "That's not your current password.",
        },
      };
    }
  }

  const newHash = await hashPassword(parsed.data.newPassword);

  // Keep this session alive; kick every other one. Matches the reset flow's
  // intent (a password change invalidates trust everywhere else).
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    }),
    db.session.deleteMany({
      where: {
        userId: user.id,
        ...(currentToken ? { token: { not: currentToken } } : {}),
      },
    }),
  ]);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: user.passwordHash ? "password_changed" : "password_set",
  });
  await posthog.flush();

  revalidatePath("/me/security");
  return { ok: true };
}

export async function disconnectGoogleAction() {
  const user = await requireUser();

  const outcome = await db.$transaction(
    async (tx) => {
      const hasGoogle = await tx.oAuthAccount.count({
        where: { userId: user.id, provider: GOOGLE_PROVIDER },
      });
      if (hasGoogle === 0) return "noop" as const;
      if ((await signInMethodCount(tx, user.id)) <= 1) return "last" as const;
      await tx.oAuthAccount.deleteMany({
        where: { userId: user.id, provider: GOOGLE_PROVIDER },
      });
      return "removed" as const;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (outcome === "last") redirect("/me/security?error=last_method");
  if (outcome === "removed") revalidatePath("/me/security");
}
