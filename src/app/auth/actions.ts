"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  PASSWORD_MAX,
  appOrigin,
  createSession,
  currentUser,
  hashPassword,
  safeNextPath,
  signOut,
  verifyPassword,
} from "@/lib/auth";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} from "@/lib/email";
import { stopImpersonation } from "@/lib/impersonation";
import { getPostHogClient } from "@/lib/posthog-server";

const PASSWORD_MIN = 8;
const RESET_TTL_HOURS = 24;
const VERIFY_TTL_HOURS = 24;
/** Per-user cooldown between verification email issuances. Stops "resend"
 *  spam from costing Resend quota / damaging sender reputation, and closes
 *  the inbox-flush race where a fresh send invalidates the first one. */
const VERIFY_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Real bcrypt hash precomputed at module load so the "user doesn't exist" path
 * still runs a full key schedule and matches the wall-clock cost of a genuine
 * password check. The previous hand-typed `$2b$10$invalid…` literal short-
 * circuited bcryptjs's format check in <1ms, leaking which emails are
 * registered. Sync hash at load is ~100ms once per worker — acceptable.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "dummy-password-for-timing-equalisation",
  10,
);

/** SHA-256 of the raw reset token — only this is ever stored or queried. */
function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

const SignInSchema = z.object({
  email: z.string().email(),
  // Cap at PASSWORD_MAX (72 bytes — bcrypt's silent-truncation point) on every
  // password input. Without this a multi-MB POST gets bcrypt-hashed on every
  // attempt — trivial CPU DoS — and any passphrase longer than 72 bytes is
  // silently truncated so the same input behaves differently across paths.
  password: z.string().min(1).max(PASSWORD_MAX),
  next: z.string().optional(),
});

const SignUpSchema = z
  .object({
    email: z.string().email(),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().max(80).optional(),
    password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
    confirm: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
    next: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type SignInState = { error?: string };
export type SignUpState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"email" | "firstName" | "lastName" | "password" | "confirm", string>
  >;
};

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please enter your email and password." };
  }
  const lower = parsed.data.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: lower } });
  // Run bcrypt even when the user doesn't exist, to avoid leaking which emails
  // are registered. A null passwordHash (Google-/passkey-only account that
  // never set one) coalesces to a real, precomputed hash so password sign-in
  // fails generically and at the same wall-clock cost as a genuine wrong-
  // password check rather than 500ing on a null.
  const validHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const ok = await verifyPassword(parsed.data.password, validHash);
  if (!user || !ok) {
    return { error: "That email and password don't match." };
  }
  await createSession(user.id);
  if (!user.profileCompletedAt) {
    const back = safeNextPath(parsed.data.next);
    redirect(
      back === "/me"
        ? "/me/profile/complete"
        : `/me/profile/complete?next=${encodeURIComponent(back)}`,
    );
  }
  redirect(safeNextPath(parsed.data.next));
}

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: SignUpState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key as keyof typeof fieldErrors]) {
        fieldErrors[key as keyof typeof fieldErrors] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const lower = parsed.data.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: lower } });
  if (existing) {
    return {
      fieldErrors: {
        email: "An account already exists for this email. Sign in instead.",
      },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.user.create({
    data: {
      email: lower,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName || null,
      passwordHash,
    },
  });
  // Soft gate: they're signed in immediately and can fill the questionnaire,
  // but bookShiftAction stays blocked until they click the emailed link.
  await issueEmailVerification(user);
  await createSession(user.id);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "sign_up_completed",
    // No PII in PostHog properties — distinctId stitches the person; name
    // and email stay in the app's own database where they belong.
    properties: { method: "email" },
  });
  await posthog.flush();

  // New accounts always start at the questionnaire. `next` is preserved through it.
  const back = parsed.data.next ? safeNextPath(parsed.data.next) : "/me";
  redirect(
    back === "/me"
      ? "/me/profile/complete"
      : `/me/profile/complete?next=${encodeURIComponent(back)}`,
  );
}

export async function signOutAction() {
  await signOut();
  redirect("/");
}

/**
 * End an active admin impersonation: restore the admin's original session
 * cookie and close out the audit row. Safe to call when nothing is being
 * impersonated — `stopImpersonation()` is a no-op in that case.
 */
export async function stopImpersonationAction() {
  await stopImpersonation();
  redirect("/admin/volunteers");
}

const DEV_SEED_EMAILS = {
  admin: "admin@fairfood.test",
  volunteer: "volunteer@fairfood.test",
} as const;

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

const ForgotPasswordSchema = z.object({ email: z.string().email() });

const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
    confirm: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type ForgotPasswordState = { error?: string; sent?: boolean };
export type ResetPasswordState = {
  error?: string;
  fieldErrors?: Partial<Record<"password" | "confirm", string>>;
};

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = ForgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    // One live token per user — drop any unredeemed ones before issuing.
    await db.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });
    const raw = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        tokenHash: hashToken(raw),
        userId: user.id,
        expiresAt: new Date(Date.now() + RESET_TTL_HOURS * 3_600_000),
      },
    });
    const resetUrl = `${appOrigin()}/auth/reset-password?token=${raw}`;
    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        userName: user.firstName || undefined,
        expiresInHours: RESET_TTL_HOURS,
      });
    } catch (err) {
      // Never leak account existence through a delivery error — log for ops
      // and still return the generic "if it exists, we sent it" response.
      console.error("[password-reset] email send failed", err);
    }
  }

  // Identical response whether or not the account exists (no enumeration).
  return { sent: true };
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: ResetPasswordState["fieldErrors"] = {};
    let tokenInvalid = false;
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "token") tokenInvalid = true;
      else if (key === "password" || key === "confirm") {
        fieldErrors[key] ??= issue.message;
      }
    }
    if (tokenInvalid) {
      return {
        error:
          "This reset link is invalid or has expired. Request a new one.",
      };
    }
    return Object.keys(fieldErrors).length
      ? { fieldErrors }
      : { error: "Choose a password of at least 8 characters." };
  }

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  // Refuse to swap an active session onto another account — opening someone
  // else's reset link while signed in as yourself must not silently take over
  // the target account's session cookie. Force an explicit sign-out first.
  const sessionUser = await currentUser();
  if (sessionUser && sessionUser.id !== record.userId) {
    return {
      error:
        "You're signed in as a different account. Sign out, then open this reset link again.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    // Receiving the reset email proves control of the inbox — verify it if it
    // wasn't already (updateMany leaves an existing timestamp untouched).
    db.user.updateMany({
      where: { id: record.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // A reset revokes every existing session and any sibling reset tokens.
    db.session.deleteMany({ where: { userId: record.userId } }),
    db.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  const user = await db.user.findUniqueOrThrow({
    where: { id: record.userId },
  });
  await createSession(user.id);

  const posthog = getPostHogClient();
  posthog.capture({ distinctId: user.id, event: "password_reset" });
  await posthog.flush();

  redirect(user.profileCompletedAt ? "/me" : "/me/profile/complete");
}

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

/**
 * Issue a fresh verification token for `user` and email the link. One live
 * token per user — drop any unredeemed ones first (mirrors password reset).
 * Best-effort: a send failure is logged, never thrown, so sign-up itself
 * still succeeds (the user can resend from the dashboard banner).
 */
async function issueEmailVerification(user: {
  id: string;
  email: string;
  firstName: string;
}) {
  await db.emailVerificationToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });
  const raw = randomBytes(32).toString("hex");
  await db.emailVerificationToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId: user.id,
      expiresAt: new Date(Date.now() + VERIFY_TTL_HOURS * 3_600_000),
    },
  });
  const verifyUrl = `${appOrigin()}/auth/verify-email?token=${raw}`;
  try {
    await sendVerificationEmail({
      to: user.email,
      verifyUrl,
      userName: user.firstName || undefined,
      expiresInHours: VERIFY_TTL_HOURS,
    });
  } catch (err) {
    console.error("[email-verification] send failed", err);
  }
}

const VerifyEmailSchema = z.object({ token: z.string().min(1) });

export type VerifyEmailState = { error?: string };
export type ResendVerificationState = { error?: string; sent?: boolean };

export async function verifyEmailAction(
  _prev: VerifyEmailState,
  formData: FormData,
): Promise<VerifyEmailState> {
  const parsed = VerifyEmailSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) {
    return {
      error:
        "This verification link is invalid or has expired. Request a new one.",
    };
  }

  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      error:
        "This verification link is invalid or has expired. Request a new one.",
    };
  }

  // Refuse to swap an active session onto another account — a phished or
  // forwarded verification link must not silently overwrite the current
  // session cookie with the target user's. Force explicit sign-out first.
  const sessionUser = await currentUser();
  if (sessionUser && sessionUser.id !== record.userId) {
    return {
      error:
        "You're signed in as a different account. Sign out, then open this verification link again.",
    };
  }

  const [verified] = await db.$transaction([
    // Leave an existing timestamp untouched (e.g. already verified via a
    // password reset) — updateMany no-ops instead of clobbering it. Its
    // `count` is how we know whether this click actually verified anything.
    db.user.updateMany({
      where: { id: record.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    }),
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.emailVerificationToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  const user = await db.user.findUniqueOrThrow({
    where: { id: record.userId },
  });
  // The link may be opened on a device where they're not signed in — drop them
  // straight into a session (mirrors the password-reset tail).
  await createSession(user.id);
  // Only a first-time verification gets the warm welcome. If the account was
  // already verified (e.g. via the password-reset path) the updateMany
  // no-ops, so a still-valid older token must not re-trigger the email.
  if (verified.count > 0) {
    try {
      await sendWelcomeEmail({
        to: user.email,
        userName: user.firstName || undefined,
      });
    } catch (err) {
      console.error("[welcome-email] send failed", err);
    }

    const posthog = getPostHogClient();
    posthog.capture({ distinctId: user.id, event: "email_verified" });
    await posthog.flush();
  }
  redirect(user.profileCompletedAt ? "/me" : "/me/profile/complete");
}

export async function resendVerificationAction(
  _prev: ResendVerificationState,
  _formData: FormData,
): Promise<ResendVerificationState> {
  // useActionState supplies (prevState, formData); this action needs neither —
  // the user comes from the session. Mark consumed so lint stays clean.
  void _formData;
  const user = await currentUser();
  if (!user) {
    return { error: "Please sign in, then resend your verification email." };
  }
  // Idempotent: an already-verified account gets the same calm "sent" reply
  // rather than a confusing error.
  if (!user.emailVerifiedAt) {
    // Rate-limit issuance per user. Two motives: (1) "Resend" mash costs
    // Resend quota and hurts sender reputation; (2) inbox-flush race —
    // issueEmailVerification invalidates the prior token, so an attacker
    // who tricks the signed-in unverified user into hammering this can race
    // the legitimate email out of the inbox between arrival and click.
    const latest = await db.emailVerificationToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (latest) {
      const elapsedMs = Date.now() - latest.createdAt.getTime();
      if (elapsedMs < VERIFY_RESEND_COOLDOWN_SECONDS * 1000) {
        return {
          error: `Please wait a moment before requesting another verification email.`,
        };
      }
    }
    await issueEmailVerification(user);
  }
  return { sent: true };
}

// ---------------------------------------------------------------------------
// Volunteer invite redemption (admin bulk-import claim flow)
// ---------------------------------------------------------------------------

const ClaimInviteSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
    confirm: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type ClaimInviteState = {
  error?: string;
  fieldErrors?: Partial<Record<"password" | "confirm", string>>;
};

/** Look up a raw invite token and return the invitee, or null if the token is
 *  bunk / expired / used / already-claimed. Used by the page server-component
 *  to render a "this link is no longer valid" view before showing the form.
 *  Accounts whose `importedAt` has been cleared have already redeemed an
 *  earlier invite — re-claiming would overwrite the password and revoke any
 *  Google/passkey they've since added, so an old invite link must not work. */
export async function findInviteByToken(rawToken: string): Promise<{
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  };
  expiresAt: Date;
} | null> {
  if (!rawToken) return null;
  const record = await db.volunteerInvite.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          importedAt: true,
        },
      },
    },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  if (!record.user.importedAt) return null;
  return { user: record.user, expiresAt: record.expiresAt };
}

/**
 * Set a password from a volunteer-invite token. Mirrors `resetPasswordAction`
 * but additionally clears `User.importedAt` (the volunteer has now claimed the
 * account) and uses the dedicated VolunteerInvite table. As with
 * password-reset, redeeming the link verifies the email (proof of inbox
 * control) and revokes any prior sessions.
 */
export async function claimInviteAction(
  _prev: ClaimInviteState,
  formData: FormData,
): Promise<ClaimInviteState> {
  const parsed = ClaimInviteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: ClaimInviteState["fieldErrors"] = {};
    let tokenInvalid = false;
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "token") tokenInvalid = true;
      else if (key === "password" || key === "confirm") {
        fieldErrors[key] ??= issue.message;
      }
    }
    if (tokenInvalid) {
      return {
        error:
          "This invite link is invalid or has expired. Ask your coordinator to resend it.",
      };
    }
    return Object.keys(fieldErrors).length
      ? { fieldErrors }
      : { error: "Choose a password of at least 8 characters." };
  }

  const record = await db.volunteerInvite.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    include: { user: { select: { importedAt: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return {
      error:
        "This invite link is invalid or has expired. Ask your coordinator to resend it.",
    };
  }
  // Single-use was enforced via usedAt, but the 7-day TTL means an old invite
  // link (forwarded email, archived inbox, shared device) could otherwise
  // re-claim an account that has since signed in, set a passkey, or linked
  // Google — wiping their sessions and resetting the password. Once the
  // volunteer has claimed any earlier invite, importedAt is cleared; refuse
  // redemption from that point on and route them through password reset.
  if (!record.user.importedAt) {
    return {
      error:
        "This account has already been set up. Use the sign-in page — or reset your password if you've forgotten it.",
    };
  }

  // Same session-swap guard as the verify-email and reset-password flows:
  // claiming an invite while signed in as a different account must not
  // silently overwrite the cookie with a session for the invitee.
  const sessionUser = await currentUser();
  if (sessionUser && sessionUser.id !== record.userId) {
    return {
      error:
        "You're signed in as a different account. Sign out, then open this invite link again.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        // Volunteer has claimed — they're no longer "awaiting claim".
        importedAt: null,
      },
    }),
    // Clicking through proves inbox control — verify the email if it wasn't
    // already (idempotent against the password-reset path).
    db.user.updateMany({
      where: { id: record.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    }),
    db.volunteerInvite.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Drop any sibling unredeemed invites — if there were stale ones (e.g. an
    // admin resent), this redemption invalidates them. Same shape as reset.
    db.volunteerInvite.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
    // Wipe any pre-existing sessions for safety (rare for a newly-imported
    // account, but mirrors the reset-password posture).
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  const user = await db.user.findUniqueOrThrow({ where: { id: record.userId } });
  await createSession(user.id);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "invite_claimed",
    properties: { method: "password" },
  });
  await posthog.flush();

  // First-touch: they should complete the questionnaire before booking.
  redirect("/me/profile/complete");
}

export async function devSignInAction(formData: FormData) {
  if (process.env.NODE_ENV !== "development") return;
  const role = formData.get("role");
  if (role !== "admin" && role !== "volunteer") return;
  const email = DEV_SEED_EMAILS[role];
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;
  await createSession(user.id);
  redirect(role === "admin" ? "/admin" : "/me");
}
