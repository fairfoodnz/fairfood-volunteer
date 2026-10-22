/**
 * Single-use auth tokens (password reset, email verification, volunteer
 * invite) travel in links as `?token=<raw>` or `/auth/invite/<raw>`. Anything
 * that keeps or forwards those URLs — the EmailLog audit table, PostHog
 * pageviews — must redact them first, or a live credential ends up readable by
 * whoever can read that store (any admin, a DB backup, the analytics project).
 *
 * Deliberately not `server-only`: the PostHog `before_send` hook in
 * instrumentation-client.ts shares it.
 */
export const REDACTED_TOKEN = "redacted";

// `;` covers HTML bodies, where a later query param's `&` is `&amp;`.
const TOKEN_PARAM = /([?&;]token=)[^&"'<>\s#]+/g;
const INVITE_PATH = /(\/auth\/invite\/)[^/?#"'<>\s]+/g;

export function redactAuthTokens(input: string): string {
  return input
    .replace(TOKEN_PARAM, `$1${REDACTED_TOKEN}`)
    .replace(INVITE_PATH, `$1${REDACTED_TOKEN}`);
}
