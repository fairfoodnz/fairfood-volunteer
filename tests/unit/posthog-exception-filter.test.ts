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

  it("matches the signature carried only in $exception_type", () => {
    const event = exceptionEvent({
      $exception_type: "Object Not Found Matching Id:5",
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

  describe("Google iOS injected-script stack overflow", () => {
    const CHROME_IOS =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/153.0.7980.45 Mobile/15E148 Safari/604.1";
    const GOOGLE_APP =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/435.4.965413651 Mobile/15E148 Safari/604.1";
    const SAFARI =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6 Mobile/15E148 Safari/604.1";

    function frame(filename: string, fn: string) {
      return {
        platform: "web:javascript",
        filename,
        function: fn,
        lineno: 226,
        colno: 63,
        in_app: true,
      };
    }

    // The shape captured in production: recursing `Nk`/`Pk` frames that point
    // at the page URL, called from frames attributed to the current route.
    const injectedFrames = [
      frame("https://volunteer.fairfood.org.nz/shifts", "?"),
      frame("https://volunteer.fairfood.org.nz/", "Pk"),
      frame("https://volunteer.fairfood.org.nz/", "Nk"),
    ];

    function stackOverflow(userAgent: string, frames: unknown[]) {
      return exceptionEvent({
        $raw_user_agent: userAgent,
        $exception_list: [
          {
            type: "RangeError",
            value: "Maximum call stack size exceeded.",
            stacktrace: { type: "raw", frames },
          },
        ],
      });
    }

    it("drops it on Chrome for iOS when every frame is the page URL", () => {
      expect(filterThirdPartyExceptions(stackOverflow(CHROME_IOS, injectedFrames))).toBeNull();
    });

    it("drops it on the Google app", () => {
      expect(filterThirdPartyExceptions(stackOverflow(GOOGLE_APP, injectedFrames))).toBeNull();
    });

    it("drops the frameless variant", () => {
      expect(filterThirdPartyExceptions(stackOverflow(CHROME_IOS, []))).toBeNull();
    });

    it("keeps a stack overflow with a frame from our bundles", () => {
      const event = stackOverflow(CHROME_IOS, [
        frame("https://volunteer.fairfood.org.nz/_next/static/chunks/0f3a9c.js", "render"),
        ...injectedFrames,
      ]);
      expect(filterThirdPartyExceptions(event)).toBe(event);
    });

    it("tolerates malformed frames without throwing", () => {
      const event = stackOverflow(CHROME_IOS, [null, 42, ...injectedFrames]);
      expect(filterThirdPartyExceptions(event)).toBeNull();
    });

    it("keeps a stack overflow from any other browser", () => {
      const event = stackOverflow(SAFARI, injectedFrames);
      expect(filterThirdPartyExceptions(event)).toBe(event);
    });

    it("keeps other exceptions on Google iOS apps", () => {
      const event = exceptionEvent({
        $raw_user_agent: CHROME_IOS,
        $exception_list: [
          {
            type: "TypeError",
            value: "Cannot read properties of undefined",
            stacktrace: { type: "raw", frames: injectedFrames },
          },
        ],
      });
      expect(filterThirdPartyExceptions(event)).toBe(event);
    });
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
