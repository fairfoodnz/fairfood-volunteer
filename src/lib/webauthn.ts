import "server-only";
import { cookies } from "next/headers";

/**
 * WebAuthn relying-party config, derived from NEXT_PUBLIC_APP_URL so it can't
 * drift from where the app is actually served:
 *
 *  - `rpID`   = the bare host ("volunteer.fairfood.org.nz", "localhost") — the
 *               scope a passkey is bound to. It must NOT include scheme or port.
 *  - `origin` = the full origin the ceremony must have happened on, including
 *               port (localhost:3000 in dev). Passed as `expectedOrigin`.
 *
 * localhost is a WebAuthn-secure context, so passkeys work in `pnpm dev`
 * with no extra setup.
 */
function appUrl() {
  return new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://volunteer.fairfood.org.nz",
  );
}

export const RP_NAME = "Fair Food Volunteer";

export function rpID() {
  return appUrl().hostname;
}

export function rpOrigin() {
  // URL#origin already excludes a trailing slash and includes a non-default
  // port — exactly the `expectedOrigin` shape SimpleWebAuthn wants.
  return appUrl().origin;
}

// Single-use challenge cookies. The challenge the server generated must be
// echoed back by the authenticator; we stash it httpOnly (never readable by
// JS) and consume it once. Registration and authentication use separate names
// so an in-flight ceremony of one kind can't be answered with the other.
const REG_CHALLENGE_COOKIE = "ff_pk_reg_chal";
const AUTH_CHALLENGE_COOKIE = "ff_pk_auth_chal";
const CHALLENGE_TTL_SECONDS = 60 * 5;

export type ChallengeKind = "registration" | "authentication";

function cookieName(kind: ChallengeKind) {
  return kind === "registration"
    ? REG_CHALLENGE_COOKIE
    : AUTH_CHALLENGE_COOKIE;
}

export async function storeChallenge(kind: ChallengeKind, challenge: string) {
  const jar = await cookies();
  jar.set(cookieName(kind), challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

/** Read and immediately invalidate the challenge — single use, win or lose. */
export async function takeChallenge(
  kind: ChallengeKind,
): Promise<string | null> {
  const jar = await cookies();
  const name = cookieName(kind);
  const value = jar.get(name)?.value ?? null;
  if (value) jar.delete(name);
  return value;
}

/** "internal,hybrid" ⇄ ["internal","hybrid"] for the Passkey.transports column. */
export function encodeTransports(transports?: string[]): string | null {
  return transports && transports.length ? transports.join(",") : null;
}

export function decodeTransports(
  transports: string | null,
): string[] | undefined {
  if (!transports) return undefined;
  const list = transports.split(",").filter(Boolean);
  return list.length ? list : undefined;
}
