import { describe, expect, it } from "vitest";
import type { CaptureResult } from "posthog-js";

import { filterThirdPartyExceptions } from "@/lib/posthog-exception-filter";

function exceptionEvent(props: Record<string, unknown>): CaptureResult {
  return {
    uuid: "00000000-0000-0000-0000-000000000000",
    event: "$exception",
    properties: props,
  } as CaptureResult;
}

describe("filterThirdPartyExceptions", () => {
  it("drops the 'Object Not Found Matching Id' browser-extension noise", () => {
    // The exact signature from #123, as posthog-js wraps a rejected non-Error.
    const event = exceptionEvent({
      $exception_message:
        "Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4",
    });
    expect(filterThirdPartyExceptions(event)).toBeNull();
  });

  it("matches the signature inside $exception_list values too", () => {
    const event = exceptionEvent({
      $exception_list: [
        { type: "UnhandledRejection", value: "Object Not Found Matching Id:1" },
      ],
    });
    expect(filterThirdPartyExceptions(event)).toBeNull();
  });

  it("is case-insensitive", () => {
    const event = exceptionEvent({
      $exception_message: "OBJECT NOT FOUND MATCHING ID:3",
    });
    expect(filterThirdPartyExceptions(event)).toBeNull();
  });

  it("keeps genuine application exceptions", () => {
    const event = exceptionEvent({
      $exception_message: "TypeError: Cannot read properties of undefined",
      $exception_list: [
        { type: "TypeError", value: "Cannot read properties of undefined" },
      ],
    });
    expect(filterThirdPartyExceptions(event)).toBe(event);
  });

  it("never touches non-exception events", () => {
    const pageview = {
      uuid: "00000000-0000-0000-0000-000000000001",
      event: "$pageview",
      properties: { $current_url: "https://volunteer.fairfood.org.nz/shifts" },
    } as CaptureResult;
    expect(filterThirdPartyExceptions(pageview)).toBe(pageview);
  });

  it("passes a null event through unchanged", () => {
    expect(filterThirdPartyExceptions(null)).toBeNull();
  });
});
