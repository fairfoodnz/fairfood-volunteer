import { describe, expect, it } from "vitest";
import type { CaptureResult } from "posthog-js";

import { redactAuthTokens } from "@/lib/redact-tokens";
import { scrubAuthTokens } from "@/lib/posthog-url-scrub";

const RAW = "a".repeat(64);

describe("redactAuthTokens", () => {
  it("redacts the reset and verify ?token= links", () => {
    expect(
      redactAuthTokens(
        `https://volunteer.fairfood.org.nz/auth/reset-password?token=${RAW}`,
      ),
    ).toBe("https://volunteer.fairfood.org.nz/auth/reset-password?token=redacted");
    expect(redactAuthTokens(`/auth/verify-email?token=${RAW}#top`)).toBe(
      "/auth/verify-email?token=redacted#top",
    );
  });

  it("redacts the invite path token", () => {
    expect(redactAuthTokens(`https://x.test/auth/invite/${RAW}?utm=1`)).toBe(
      "https://x.test/auth/invite/redacted?utm=1",
    );
  });

  it("redacts inside HTML attributes and later &amp; params", () => {
    const html = `<a href="https://x.test/auth/reset-password?a=1&amp;token=${RAW}">Reset</a>`;
    expect(redactAuthTokens(html)).toBe(
      `<a href="https://x.test/auth/reset-password?a=1&amp;token=redacted">Reset</a>`,
    );
  });

  it("redacts every occurrence in a plain-text body", () => {
    const text = `Reset: /auth/reset-password?token=${RAW}\nOr paste /auth/reset-password?token=${RAW}`;
    expect(redactAuthTokens(text)).not.toContain(RAW);
  });

  it("leaves unrelated params and URLs alone", () => {
    const s = "/shifts?selected=a,b&mytoken=keep /auth/sign-in?next=/me";
    expect(redactAuthTokens(s)).toBe(s);
  });
});

describe("scrubAuthTokens", () => {
  it("redacts URL properties, person properties and nested values", () => {
    const event = {
      uuid: "00000000-0000-0000-0000-000000000000",
      event: "$pageview",
      properties: {
        $current_url: `https://x.test/auth/invite/${RAW}`,
        $pathname: `/auth/invite/${RAW}`,
        $referrer: `https://x.test/auth/reset-password?token=${RAW}`,
        nested: { list: [`/auth/verify-email?token=${RAW}`] },
        count: 3,
      },
      $set_once: { $initial_current_url: `https://x.test/auth/invite/${RAW}` },
    } as CaptureResult;

    const out = scrubAuthTokens(event);
    expect(JSON.stringify(out)).not.toContain(RAW);
    expect(out?.properties.$pathname).toBe("/auth/invite/redacted");
    expect(out?.properties.count).toBe(3);
  });

  it("passes a dropped event through as null", () => {
    expect(scrubAuthTokens(null)).toBeNull();
  });
});
