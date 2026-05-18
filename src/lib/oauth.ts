import "server-only";
import { cookies } from "next/headers";
import {
  Google,
  generateCodeVerifier,
  generateState,
  decodeIdToken,
} from "arctic";
import { z } from "zod";

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
  if (next) jar.set(NEXT_COOKIE, next, opts);
  else jar.delete(NEXT_COOKIE);

  return url;
}

const ClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  // Google omits this for some Workspace edge cases; treat missing as false.
  email_verified: z.boolean().optional().default(false),
  name: z.string().trim().min(1).optional(),
});

export type GoogleIdentity = {
  /** Stable Google subject id — the join key for OAuthAccount. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
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
  if (state !== storedState) throw new OAuthError("state_mismatch");

  let claims: unknown;
  try {
    const tokens = await googleClient().validateAuthorizationCode(
      code,
      codeVerifier,
    );
    claims = decodeIdToken(tokens.idToken());
  } catch {
    throw new OAuthError("exchange_failed");
  }

  const parsed = ClaimsSchema.safeParse(claims);
  if (!parsed.success) throw new OAuthError("invalid_claims");

  return {
    identity: {
      sub: parsed.data.sub,
      email: parsed.data.email.trim().toLowerCase(),
      emailVerified: parsed.data.email_verified,
      name: parsed.data.name,
    },
    next,
  };
}
