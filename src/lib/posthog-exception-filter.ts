import type { CaptureResult } from "posthog-js";

// Substrings (matched case-insensitively against the exception message/type)
// that identify exceptions thrown by browser extensions or other third-party
// scripts injected into the page — not by our own code. They're unactionable
// noise that drowns out real errors in PostHog's error tracking, so we drop
// them client-side before they're ever sent.
const THIRD_PARTY_NOISE = [
  // Emitted by extensions / embedded webviews that talk to a native host over
  // postMessage; surfaces as e.g. "Object Not Found Matching Id:2,
  // MethodName:update, ParamCount:4" wrapped in a "Non-Error promise rejection
  // captured" UnhandledRejection. Always extension-side, never ours.
  // See fairfoodnz/fairfood-volunteer#123.
  "object not found matching id",
];

/** Collect the human-readable text from a PostHog `$exception` event. */
function exceptionText(event: CaptureResult): string {
  const props = event.properties ?? {};
  const parts: string[] = [];

  if (typeof props.$exception_message === "string") {
    parts.push(props.$exception_message);
  }
  if (typeof props.$exception_type === "string") {
    parts.push(props.$exception_type);
  }

  const list = props.$exception_list;
  if (Array.isArray(list)) {
    for (const item of list) {
      if (item && typeof item.value === "string") parts.push(item.value);
      if (item && typeof item.type === "string") parts.push(item.type);
    }
  }

  return parts.join(" ");
}

/**
 * PostHog `before_send` hook: drop `$exception` events that originate from
 * third-party page-injected scripts (browser extensions). Returns `null` to
 * discard the event, or the event unchanged to keep it. Non-exception events
 * always pass through untouched.
 */
export function filterThirdPartyExceptions(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event || event.event !== "$exception") return event;

  const haystack = exceptionText(event).toLowerCase();
  if (THIRD_PARTY_NOISE.some((needle) => haystack.includes(needle))) {
    return null;
  }

  return event;
}
