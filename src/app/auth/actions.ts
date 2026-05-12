"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  hashPassword,
  signOut,
  verifyPassword,
} from "@/lib/auth";

const PASSWORD_MIN = 8;

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

export async function devSignInAction(formData: FormData) {
  const role = formData.get("role");
  if (role !== "admin" && role !== "volunteer") return;
  const email = DEV_SEED_EMAILS[role];
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;
  await createSession(user.id);
  redirect(role === "admin" ? "/admin" : "/me");
}
