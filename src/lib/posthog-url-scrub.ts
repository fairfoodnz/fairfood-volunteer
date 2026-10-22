import type { CaptureResult } from "posthog-js";

import { redactAuthTokens } from "@/lib/redact-tokens";

/**
 * posthog-js records the page URL on every event (`$current_url`, `$pathname`,
 * `$referrer`, the `$initial_*` person properties, …). On /auth/reset-password,
 * /auth/verify-email and /auth/invite/<token> that URL carries a live
 * single-use token, which would otherwise sit in the analytics project for
 * anyone with access to lift. Walk every string the event carries rather than
 * naming the URL properties one by one, so a property posthog-js adds later
 * can't slip through.
 */
function scrub(value: unknown): unknown {
  if (typeof value === "string") return redactAuthTokens(value);
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, scrub(v)]),
    );
  }
  return value;
}

export function scrubAuthTokens(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: scrub(event.properties) as CaptureResult["properties"],
    ...(event.$set ? { $set: scrub(event.$set) as CaptureResult["$set"] } : {}),
    ...(event.$set_once
      ? { $set_once: scrub(event.$set_once) as CaptureResult["$set_once"] }
      : {}),
  };
}
