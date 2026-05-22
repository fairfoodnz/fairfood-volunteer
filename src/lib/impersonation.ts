import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import { SESSION_COOKIE, hashSessionToken } from "./auth";
import { Role } from "@/generated/prisma";

/**
 * Admin impersonation. Lets an admin act as a volunteer to reproduce a bug or
 * see exactly what they see. Implemented by swapping cookies: the admin's raw
 * session token is stashed in a separate httpOnly cookie, and a fresh,
 * short-lived (1h) Session row is minted for the target user and installed in
 * the usual `ff_session` cookie. `currentUser()` reads that as the target;
 * `impersonationContext()` reads the stashed cookie to identify the admin and
 * drive the sticky "stop impersonating" banner.
 *
 * Threat model:
 *  - DB rows are still hashed at rest (Session.tokenHash) — same as a real
 *    sign-in. A leaked DB row doesn't give you a cookie either side.
 *  - The "stop" path validates the stashed admin token against the DB; a
 *    spoofed IMPERSONATOR_COOKIE alone gets you nothing.
 *  - Admins can't impersonate other admins (privilege escalation guard).
 *  - Impersonation sessions skip `currentUser()`'s sliding-expiry renewal —
 *    the 1h fuse is the whole point.
 */

export const IMPERSONATOR_COOKIE = "ff_impersonator";

/** Impersonation Session row TTL. Long enough to debug; short enough to bound. */
const IMPERSONATION_TTL_MS = 60 * 60_000;

/**
 * Stash cookie TTL. Outlives the impersonation session itself so that even if
 * the 1h impersonation runs out (admin walked away mid-debug), clicking "stop"
 * still restores the admin session for a few more hours without forcing a
 * fresh sign-in.
 */
const IMPERSONATOR_COOKIE_TTL_MS = 8 * 60 * 60_000;

function cookieBase(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  };
}

export type ImpersonationStartResult =
  | { ok: true }
  | { ok: false; error: string };

export async function startImpersonation(
  adminId: string,
  targetUserId: string,
): Promise<ImpersonationStartResult> {
  if (adminId === targetUserId) {
    return { ok: false, error: "You can't impersonate yourself." };
  }

  const cookieStore = await cookies();
  const adminToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!adminToken) {
    return { ok: false, error: "Your admin session is gone — sign in again." };
  }

  const adminSession = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(adminToken) },
    select: {
      userId: true,
      expiresAt: true,
      isImpersonation: true,
      user: { select: { role: true } },
    },
  });
  if (
    !adminSession ||
    adminSession.expiresAt < new Date() ||
    adminSession.userId !== adminId ||
    adminSession.user.role !== Role.ADMIN
  ) {
    return { ok: false, error: "Your admin session is gone — sign in again." };
  }
  if (adminSession.isImpersonation) {
    return {
      ok: false,
      error: "Already impersonating someone — stop that session first.",
    };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });
  if (!target) {
    return { ok: false, error: "That volunteer no longer exists." };
  }
  if (target.role === Role.ADMIN) {
    return { ok: false, error: "Admins can't impersonate other admins." };
  }

  const newToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS);
  await db.$transaction([
    db.session.create({
      data: {
        id: randomUUID(),
        tokenHash: hashSessionToken(newToken),
        userId: target.id,
        expiresAt,
        isImpersonation: true,
      },
    }),
    db.impersonationLog.create({
      data: { adminId, targetUserId: target.id },
    }),
  ]);

  cookieStore.set(
    IMPERSONATOR_COOKIE,
    adminToken,
    cookieBase(new Date(Date.now() + IMPERSONATOR_COOKIE_TTL_MS)),
  );
  cookieStore.set(SESSION_COOKIE, newToken, cookieBase(expiresAt));

  return { ok: true };
}

/**
 * Restore the admin's original session and close out any open audit rows.
 * Idempotent — calling without an active impersonation is a no-op (lets the
 * banner's "stop" button stay simple). Returns true when something was
 * actually stopped so callers can pick an appropriate redirect.
 */
export async function stopImpersonation(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(IMPERSONATOR_COOKIE)?.value;
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!adminToken) return false;

  const adminSession = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(adminToken) },
    select: { userId: true, expiresAt: true },
  });

  // Burn the impersonation Session row. Filtered on isImpersonation so even
  // a spoofed cookie pointing at a real volunteer session can't be used to
  // delete that volunteer's actual session.
  if (currentToken) {
    await db.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(currentToken),
        isImpersonation: true,
      },
    });
  }

  if (adminSession?.userId) {
    await db.impersonationLog.updateMany({
      where: { adminId: adminSession.userId, endedAt: null },
      data: { endedAt: new Date() },
    });
  }

  cookieStore.delete(IMPERSONATOR_COOKIE);
  if (adminSession && adminSession.expiresAt > new Date()) {
    cookieStore.set(SESSION_COOKIE, adminToken, cookieBase(adminSession.expiresAt));
  } else {
    // Admin session also expired — drop the cookie and let them sign back in.
    cookieStore.delete(SESSION_COOKIE);
  }
  return true;
}

/**
 * If the current request is happening inside an impersonation, returns the
 * admin doing the impersonating. Otherwise null. Used by the global banner so
 * the impersonated person's view carries a visible "you're not really them"
 * hint and a one-click way back.
 */
export async function impersonationContext(): Promise<
  | { admin: { id: string; firstName: string; lastName: string | null; email: string } }
  | null
> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(IMPERSONATOR_COOKIE)?.value;
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!adminToken || !currentToken) return null;

  // Both cookies must point at live sessions, AND the current one must
  // actually be marked as an impersonation. Without the isImpersonation
  // check, a stale ff_impersonator left behind after "Sign out" (instead of
  // "Stop impersonating") would resurrect the banner the next time the same
  // admin signed in, because their original 30-day session is still live.
  const [currentSession, adminSession] = await Promise.all([
    db.session.findUnique({
      where: { tokenHash: hashSessionToken(currentToken) },
      select: { isImpersonation: true },
    }),
    db.session.findUnique({
      where: { tokenHash: hashSessionToken(adminToken) },
      select: {
        expiresAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);
  if (!currentSession?.isImpersonation) return null;
  if (
    !adminSession ||
    adminSession.expiresAt < new Date() ||
    adminSession.user.role !== Role.ADMIN
  ) {
    return null;
  }
  return { admin: adminSession.user };
}
