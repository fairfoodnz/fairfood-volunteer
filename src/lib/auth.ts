import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { User } from "@/generated/prisma";

export const SESSION_COOKIE = "ff_session";
const SESSION_LENGTH_DAYS = 30;
const SESSION_LENGTH_MS = SESSION_LENGTH_DAYS * 24 * 60 * 60_000;
/**
 * Slide the expiry forward when a session is within this window of expiring.
 * Active users stay signed in indefinitely; a stolen cookie still ages out
 * inside one window of no use. Picked at SESSION_LENGTH_DAYS / 4 ≈ 7 days so a
 * casual once-a-week user never logs out, but a leaked cookie that isn't
 * exercised dies on the original 30-day fuse.
 */
const SESSION_RENEWAL_WINDOW_MS = 7 * 24 * 60 * 60_000;
const BCRYPT_ROUNDS = 10;
/** Bcrypt silently truncates beyond 72 bytes — enforce the limit at the edge. */
export const PASSWORD_MAX = 72;

function sessionToken() {
  return randomBytes(32).toString("hex");
}

/**
 * SHA-256 of the raw session token — only this is ever stored or queried.
 * Exported so callers that already hold the raw cookie value (e.g. the change-
 * password path that revokes other sessions while keeping this one) can match
 * against Session.tokenHash without reimplementing the hash.
 */
export function hashSessionToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = sessionToken();
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_MS);
  await db.session.create({
    data: {
      id: randomUUID(),
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function currentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const t = cookieStore.get(SESSION_COOKIE)?.value;
  if (!t) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(t) },
    include: { user: true },
  });
  // Server-side revocation, browser-side stale: the cookie carries a token the
  // DB no longer recognises (or one we've let expire). Delete it so the browser
  // stops 401'ing every navigation. cookies().delete() is itself only valid in
  // mutable phases (action/route handler/middleware), so swallow the RSC throw.
  if (!session || session.expiresAt < new Date()) {
    try {
      cookieStore.delete(SESSION_COOKIE);
    } catch {
      // RSC render phase — fine, next mutable request will clean up.
    }
    return null;
  }
  // Sliding-expiry: an active user inside the renewal window gets the cookie
  // re-set and the row bumped. Cookie set runs first because it's the part
  // that can fail (RSC render phase) — if it throws, we skip the DB update so
  // the two sides stay in lockstep and we retry on the next mutable request.
  const remaining = session.expiresAt.getTime() - Date.now();
  if (remaining < SESSION_RENEWAL_WINDOW_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_LENGTH_MS);
    try {
      cookieStore.set(SESSION_COOKIE, t, sessionCookieOptions(newExpiresAt));
      await db.session.update({
        where: { id: session.id },
        data: { expiresAt: newExpiresAt },
      });
    } catch {
      // RSC render phase — the user must hit a Server Action (or any mutable
      // request) before the original expiry to actually slide. Falls through
      // to "no renewal" but the existing session is still valid this request.
    }
  }
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
