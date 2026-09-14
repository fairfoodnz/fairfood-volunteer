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

/** Collect the individual human-readable strings from a `$exception` event. */
function exceptionStrings(event: CaptureResult): string[] {
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

  return parts;
}

function matchesNoiseSignature(event: CaptureResult): boolean {
  return exceptionStrings(event).some((field) => {
    const haystack = field.toLowerCase();
    return THIRD_PARTY_NOISE.some((needle) => haystack.includes(needle));
  });
}

// Chrome for iOS (`CriOS/`) and the Google app (`GSA/`) inject their own
// Closure-compiled scripts into every page. On our pages one of them recurses
// until the stack blows, surfacing as an uncaught "RangeError: Maximum call
// stack size exceeded" whose frames (e.g. `Nk`/`Pk`, `Ik`) point at the
// page's own URL rather than any script file, or carry no frames at all.
// It has only ever been seen in those two apps and never with a frame from
// our bundles, so there's nothing in our code to fix.
const GOOGLE_IOS_APP = /\b(?:CriOS|GSA)\//;
const STACK_OVERFLOW = "maximum call stack size exceeded";

/** True when a frame was executed from a `.js`/`.mjs` file (our bundles). */
function isScriptFileFrame(frame: { filename?: unknown } | null): boolean {
  if (typeof frame?.filename !== "string") return false;
  try {
    return /\.m?js$/i.test(new URL(frame.filename).pathname);
  } catch {
    return false;
  }
}

/**
 * The stack overflow thrown by Google's iOS injected scripts. Our own code
 * always ships as `.js` files under `/_next/`, so a real recursion bug of ours
 * would carry at least one script-file frame and is kept even on these apps.
 */
function isGoogleIosInjectedStackOverflow(event: CaptureResult): boolean {
  const props = event.properties ?? {};
  const userAgent = props.$raw_user_agent;
  if (typeof userAgent !== "string" || !GOOGLE_IOS_APP.test(userAgent)) {
    return false;
  }

  const list = props.$exception_list;
  if (!Array.isArray(list) || list.length === 0) return false;

  return list.every((item) => {
    if (typeof item?.value !== "string") return false;
    if (!item.value.toLowerCase().includes(STACK_OVERFLOW)) return false;
    const frames = item.stacktrace?.frames;
    return !Array.isArray(frames) || !frames.some(isScriptFileFrame);
  });
}

/**
 * PostHog `before_send` hook: drop `$exception` events that originate from
 * third-party page-injected scripts (browser extensions, in-app browser
 * scripts). Returns `null` to discard the event, or the event unchanged to
 * keep it. Non-exception events always pass through untouched.
 *
 * Each exception field is matched individually (not concatenated) so a needle
 * can never straddle two fields and produce a cross-field false positive.
 */
export function filterThirdPartyExceptions(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event || event.event !== "$exception") return event;

  const isNoise =
    matchesNoiseSignature(event) || isGoogleIosInjectedStackOverflow(event);

  return isNoise ? null : event;
}
