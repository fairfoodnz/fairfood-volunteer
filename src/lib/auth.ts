import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { User } from "@/generated/prisma";

const SESSION_COOKIE = "ff_session";
const SESSION_LENGTH_DAYS = 30;
const BCRYPT_ROUNDS = 10;

function sessionToken() {
  return randomBytes(32).toString("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = sessionToken();
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_DAYS * 24 * 60 * 60_000);
  await db.session.create({
    data: { id: randomUUID(), token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function currentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const t = cookieStore.get(SESSION_COOKIE)?.value;
  if (!t) return null;
  const session = await db.session.findUnique({
    where: { token: t },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  return session.user;
}

export async function signOut() {
  const cookieStore = await cookies();
  const t = cookieStore.get(SESSION_COOKIE)?.value;
  if (t) {
    await db.session.deleteMany({ where: { token: t } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Only allow same-origin relative redirect targets — never an absolute or
 * protocol-relative URL an attacker could smuggle in via `?next=`. Shared by
 * every sign-in entry point (password, Google, passkey) so the rule can't drift.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/me",
) {
  if (!next || !next.startsWith("/")) return fallback;
  // Reject anything whose second char is "/" or "\": "//host" and "/\host"
  // (and "/\/host") are protocol-relative once a browser normalises "\"→"/",
  // which would be an off-site open redirect.
  if (/^\/[/\\]/.test(next)) return fallback;
  return next;
}

/**
 * Where to send someone straight after a successful sign-in. Anyone who hasn't
 * finished the onboarding questionnaire is routed there first (preserving the
 * destination they were heading to); everyone else goes to `next` (validated)
 * or /me. Mirrors the long-standing password sign-in behaviour.
 */
export function postAuthDestination(
  user: { profileCompletedAt: Date | null },
  next?: string | null,
) {
  const back = safeNextPath(next);
  if (!user.profileCompletedAt) {
    return back === "/me"
      ? "/me/profile/complete"
      : `/me/profile/complete?next=${encodeURIComponent(back)}`;
  }
  return back;
}

export async function requireUser(redirectTo: string = "/auth/sign-in") {
  const user = await currentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/auth/sign-in");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
