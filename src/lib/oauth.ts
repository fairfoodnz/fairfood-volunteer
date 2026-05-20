import "server-only";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  Google,
  generateCodeVerifier,
  generateState,
} from "arctic";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth";

// Transient cookies that carry the OAuth round-trip state. All httpOnly and
// short-lived — they only need to survive the hop out to Google and back.
const STATE_COOKIE = "ff_oauth_state";
const VERIFIER_COOKIE = "ff_oauth_verifier";
const NEXT_COOKIE = "ff_oauth_next";
const ROUND_TRIP_SECONDS = 60 * 10; // 10 min to sign in at Google and return.

export const GOOGLE_PROVIDER = "google";

/** Absolute origin the app is served from (mirrors auth/email helpers). */
function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://volunteer.fairfood.org.nz"
  ).replace(/\/$/, "");
}

/** Fixed redirect URI — must be whitelisted in the Google OAuth client. */
export function googleRedirectUri() {
  return `${appOrigin()}/auth/google/callback`;
}

/**
 * Google is optional in dev: without credentials the "Continue with Google"
 * affordance is hidden and the route returns a friendly error rather than
 * throwing (mirrors how email degrades when RESEND_API_KEY is unset).
 */
export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

function googleClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
    );
  }
  return new Google(id, secret, googleRedirectUri());
}

/** Thrown for any recoverable callback failure; carries a stable reason code. */
export class OAuthError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = "OAuthError";
  }
}

/**
 * Constant-time equality on two strings. `timingSafeEqual` requires equal-
 * length buffers; we short-circuit on length mismatch (the length itself isn't
 * a secret) and otherwise let the runtime do a byte-by-byte XOR.
 */
function constantTimeStringEq(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Begin the authorization-code+PKCE flow. Persists state, the PKCE verifier and
 * the post-login `next` in short-lived httpOnly cookies, then returns the
 * Google URL to redirect the browser to.
 */
export async function startGoogleAuthorization(
  next: string | null | undefined,
) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  // Validate `next` here, not just on the way back out: storing arbitrary
  // attacker-supplied state in a victim's cookie jar (via a pre-warm link to
  // `/auth/google?next=…`) is a CSRF-cookie-poisoning surface we shouldn't
  // carry, even if `safeNextPath` would later reject it. `safeNextPath` returns
  // its fallback for anything dangerous — only persist when the input survives.
  const safeNext = next ? safeNextPath(next, "") : "";

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ROUND_TRIP_SECONDS,
  };
  jar.set(STATE_COOKIE, state, opts);
  jar.set(VERIFIER_COOKIE, codeVerifier, opts);
  if (safeNext) jar.set(NEXT_COOKIE, safeNext, opts);
  else jar.delete(NEXT_COOKIE);

  return url;
}

const ClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  // Google omits this for some Workspace edge cases; treat missing as false.
  email_verified: z.boolean().optional().default(false),
  // Standard OIDC name claims. `given_name`/`family_name` are preferred; the
  // full `name` is only a fallback to split when they're absent.
  name: z.string().trim().min(1).optional(),
  given_name: z.string().trim().min(1).optional(),
  family_name: z.string().trim().min(1).optional(),
});

/**
 * Google's published JWKS (RFC 7517). `jose.createRemoteJWKSet` caches keys
 * across calls and refreshes on `kid` miss — a single module-level instance
 * keeps signature verification effectively free after warm-up. Key URL per
 * Google's OpenID discovery document.
 */
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_ISSUERS = new Set([
  "https://accounts.google.com",
  "accounts.google.com",
]);

/**
 * Verify the ID token against Google's JWKS as defence in depth. The token
 * arrived from Google's `/token` endpoint over TLS via arctic — the OIDC spec
 * permits trusting it without signature verification on the code flow — but a
 * compromised arctic upgrade, a misconfigured corporate proxy, or any future
 * transport change would silently let an unsigned `sub`/`email` through. The
 * cost (one cached JWKS fetch on first hit) is far less than the
 * account-takeover blast radius if that assumption ever bent.
 */
async function verifyGoogleIdToken(idToken: string): Promise<unknown> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // googleClient() would have already thrown on the token exchange call —
    // this branch is here for type narrowing.
    throw new OAuthError("invalid_request");
  }
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    audience: clientId,
    // `iss` may be either form per Google's docs; pass both candidates.
    issuer: [...GOOGLE_ISSUERS],
  });
  return payload;
}

export type GoogleIdentity = {
  /** Stable Google subject id — the join key for OAuthAccount. */
  sub: string;
  email: string;
  emailVerified: boolean;
  /** Given name, falling back to the first token of `name` if Google omits it. */
  firstName?: string;
  /** Family name, falling back to the remainder of `name`. May be absent. */
  lastName?: string;
};

/**
 * Validate the callback and exchange the code. Verifies `state` against the
 * cookie (CSRF), runs the PKCE exchange, then decodes the id-token claims —
 * trusted because they came straight from Google's token endpoint over TLS.
 * The transient cookies are always cleared (single use, win or lose).
 */
export async function completeGoogleAuthorization(
  search: URLSearchParams,
): Promise<{ identity: GoogleIdentity; next: string | null }> {
  const jar = await cookies();
  const storedState = jar.get(STATE_COOKIE)?.value;
  const codeVerifier = jar.get(VERIFIER_COOKIE)?.value;
  const next = jar.get(NEXT_COOKIE)?.value ?? null;
  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);
  jar.delete(NEXT_COOKIE);

  if (search.get("error")) throw new OAuthError("access_denied");
  const code = search.get("code");
  const state = search.get("state");
  if (!code || !state || !storedState || !codeVerifier) {
    throw new OAuthError("invalid_request");
  }
  // Constant-time state compare. The values are per-user, single-use, 256-bit,
  // so the difference vs `!==` isn't practically exploitable today — but the
  // brief calls for constant-time on all secret comparisons (matches the
  // PasswordResetToken / Session.tokenHash convention).
  if (!constantTimeStringEq(state, storedState)) {
    throw new OAuthError("state_mismatch");
  }

  let claims: unknown;
  try {
    const tokens = await googleClient().validateAuthorizationCode(
      code,
      codeVerifier,
    );
    // Defence in depth: verify the ID token's signature against Google's JWKS
    // and assert iss/aud rather than trusting the token-endpoint TLS hop alone.
    claims = await verifyGoogleIdToken(tokens.idToken());
  } catch (err) {
    if (err instanceof OAuthError) throw err;
    throw new OAuthError("exchange_failed");
  }

  const parsed = ClaimsSchema.safeParse(claims);
  if (!parsed.success) throw new OAuthError("invalid_claims");

  // Prefer the discrete OIDC claims; only split the combined `name` if Google
  // didn't send `given_name`. A single-token `name` yields no last name.
  const nameParts = parsed.data.name?.split(/\s+/) ?? [];
  const firstName =
    parsed.data.given_name ?? (nameParts.length > 0 ? nameParts[0] : undefined);
  const lastName =
    parsed.data.family_name ??
    (nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined);

  return {
    identity: {
      sub: parsed.data.sub,
      email: parsed.data.email.trim().toLowerCase(),
      emailVerified: parsed.data.email_verified,
      firstName,
      lastName,
    },
    next,
  };
}
