"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  hashPassword,
  signOut,
  verifyPassword,
} from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const PASSWORD_MIN = 8;
const RESET_TTL_HOURS = 24;

/** SHA-256 of the raw reset token — only this is ever stored or queried. */
function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Absolute origin reset links resolve against (mirrors emails/brand.ts). */
function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://volunteer.fairfood.org.nz"
  ).replace(/\/$/, "");
}

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

const SignUpSchema = z
  .object({
    email: z.string().email(),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(PASSWORD_MIN),
    confirm: z.string().min(PASSWORD_MIN),
    next: z.string().optional(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type SignInState = { error?: string };
export type SignUpState = {
  error?: string;
  fieldErrors?: Partial<Record<"email" | "name" | "password" | "confirm", string>>;
};

function safeNext(next: string | undefined, fallback = "/me") {
  // Only allow same-origin relative paths.
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

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
  // Run bcrypt even when the user doesn't exist, to avoid leaking which emails are registered.
  const validHash = user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali";
  const ok = await verifyPassword(parsed.data.password, validHash);
  if (!user || !ok) {
    return { error: "That email and password don't match." };
  }
  await createSession(user.id);
  if (!user.profileCompletedAt) {
    const back = safeNext(parsed.data.next);
    redirect(
      back === "/me"
        ? "/me/profile/complete"
        : `/me/profile/complete?next=${encodeURIComponent(back)}`,
    );
  }
  redirect(safeNext(parsed.data.next));
}

export async function signUpAction(
  _prev: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
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
      name: parsed.data.name,
      passwordHash,
    },
  });
  await createSession(user.id);
  // New accounts always start at the questionnaire. `next` is preserved through it.
  const back = parsed.data.next ? safeNext(parsed.data.next) : "/me";
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
    password: z.string().min(PASSWORD_MIN),
    confirm: z.string().min(PASSWORD_MIN),
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
        userName: user.name.split(" ")[0] || undefined,
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

  const passwordHash = await hashPassword(parsed.data.password);
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
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
  redirect(user.profileCompletedAt ? "/me" : "/me/profile/complete");
}

export async function devSignInAction(formData: FormData) {
  const role = formData.get("role");
  if (role !== "admin" && role !== "volunteer") return;
  const email = DEV_SEED_EMAILS[role];
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;
  await createSession(user.id);
  redirect(role === "admin" ? "/admin" : "/me");
}
