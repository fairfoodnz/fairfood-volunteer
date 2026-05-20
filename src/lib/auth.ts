import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { User } from "@/generated/prisma";

export const SESSION_COOKIE = "ff_session";
const SESSION_LENGTH_DAYS = 30;
const BCRYPT_ROUNDS = 10;

function sessionToken() {
  return randomBytes(32).toString("hex");
}

/** SHA-256 of the raw session token — only this is ever stored or queried. */
function hashSessionToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
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
    data: {
      id: randomUUID(),
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    },
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
    where: { tokenHash: hashSessionToken(t) },
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
    await db.session.deleteMany({ where: { tokenHash: hashSessionToken(t) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Absolute origin emailed links + OAuth callbacks resolve against. Single
 * source of truth so the production-fallback URL only lives in one place
 * (mirrors emails/brand.ts on the email side). Strips any trailing slash so
 * callers can safely do `${appOrigin()}/path`.
 *
 * Note: `NEXT_PUBLIC_APP_URL` is build-time-inlined by Next.js — see
 * CLAUDE.md "Deployment" — so in non-prod images this must be passed as a
 * Docker build argument, not a runtime env var.
 */
export function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://volunteer.fairfood.org.nz"
  ).replace(/\/$/, "");
}

/**
 * Only allow same-origin relative redirect targets — never an absolute or
 * protocol-relative URL an attacker could smuggle in via `?next=`. Shared by
 * every sign-in entry point (password, Google, passkey) so the rule can't drift.
 *
 * Rejects three smuggling shapes:
 *  - direct protocol-relative: `//host`, `/\host`, `/\/host`
 *  - percent-encoded equivalents that some browsers decode in the Location
 *    header and then normalise ("\"→"/"): `/%2Fhost`, `/%5Chost`
 *  - undecodable input (malformed `%` escapes)
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/me",
) {
  if (!next || !next.startsWith("/")) return fallback;
  if (/^\/[/\\]/.test(next)) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (/^\/[/\\]/.test(decoded)) return fallback;
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
