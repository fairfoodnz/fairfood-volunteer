import { describe, expect, it } from "vitest";
import {
  contentDispositionHeader,
  encodeRFC5987,
  sanitiseAsciiFilename,
} from "@/lib/content-disposition";

describe("sanitiseAsciiFilename", () => {
  it("strips CR/LF, double-quote, backslash, and ASCII controls", () => {
    expect(sanitiseAsciiFilename('a"b\\c\r\nd\t')).toBe("abcd");
    expect(sanitiseAsciiFilename("policy\x00.pdf")).toBe("policy.pdf");
  });

  it("collapses non-ASCII to underscores in the legacy form", () => {
    expect(sanitiseAsciiFilename("kōrero.pdf")).toBe("k_rero.pdf");
  });

  it("falls back to 'download' when nothing remains", () => {
    expect(sanitiseAsciiFilename('""\\\\')).toBe("download");
    expect(sanitiseAsciiFilename("\r\n\t")).toBe("download");
  });
});

describe("encodeRFC5987", () => {
  it("percent-encodes non-ASCII bytes", () => {
    expect(encodeRFC5987("kōrero.pdf")).toBe("k%C5%8Drero.pdf");
  });

  it("re-encodes RFC 5987 reserved punctuation that encodeURIComponent leaves alone", () => {
    expect(encodeRFC5987("a'b(c)*d")).toBe("a%27b%28c%29%2Ad");
  });

  it("strips raw CR/LF", () => {
    expect(encodeRFC5987("a\r\nb")).toBe("ab");
  });
});

describe("contentDispositionHeader", () => {
  it("emits both legacy and RFC 5987 filenames", () => {
    expect(contentDispositionHeader("policy.pdf")).toBe(
      "attachment; filename=\"policy.pdf\"; filename*=UTF-8''policy.pdf",
    );
  });

  it("neutralises a CRLF header-injection attempt", () => {
    const header = contentDispositionHeader(
      'evil"\r\nSet-Cookie: x=y',
      "attachment",
    );
    expect(header).not.toContain("\r");
    expect(header).not.toContain("\n");
    expect(header).not.toContain('"\\');
    expect(header.startsWith("attachment; filename=\"")).toBe(true);
  });

  it("supports inline disposition for previewable assets", () => {
    expect(contentDispositionHeader("hero.png", "inline")).toBe(
      "inline; filename=\"hero.png\"; filename*=UTF-8''hero.png",
    );
  });
});
