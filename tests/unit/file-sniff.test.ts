import { describe, expect, it } from "vitest";
import { bufferMatchesMime } from "@/lib/file-sniff";

// Helpers for building tiny byte buffers without juggling Buffer/Uint8Array.
const bytes = (...arr: number[]) => new Uint8Array(arr);
const utf8 = (s: string) => new TextEncoder().encode(s);

describe("bufferMatchesMime", () => {
  it("accepts a PDF signature", () => {
    const buf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37);
    expect(bufferMatchesMime(buf, "application/pdf")).toBe(true);
  });

  it("rejects HTML masquerading as image/png", () => {
    const buf = utf8("<!DOCTYPE html><script>1</script>");
    expect(bufferMatchesMime(buf, "image/png")).toBe(false);
  });

  it("rejects SVG masquerading as image/jpeg", () => {
    const buf = utf8('<?xml version="1.0"?><svg xmlns="…">');
    expect(bufferMatchesMime(buf, "image/jpeg")).toBe(false);
  });

  it("accepts a PNG signature", () => {
    const buf = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect(bufferMatchesMime(buf, "image/png")).toBe(true);
  });

  it("accepts a JPEG signature", () => {
    const buf = bytes(0xff, 0xd8, 0xff, 0xe0);
    expect(bufferMatchesMime(buf, "image/jpeg")).toBe(true);
  });

  it("requires the WEBP secondary anchor, not just RIFF", () => {
    const fakeRiff = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45);
    expect(bufferMatchesMime(fakeRiff, "image/webp")).toBe(false);
    const webp = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);
    expect(bufferMatchesMime(webp, "image/webp")).toBe(true);
  });

  it("accepts both GIF87a and GIF89a", () => {
    expect(
      bufferMatchesMime(utf8("GIF87a……"), "image/gif"),
    ).toBe(true);
    expect(
      bufferMatchesMime(utf8("GIF89a……"), "image/gif"),
    ).toBe(true);
    expect(
      bufferMatchesMime(utf8("notagif!"), "image/gif"),
    ).toBe(false);
  });

  it("accepts DOCX/XLSX (ZIP) signatures", () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0);
    expect(
      bufferMatchesMime(
        zip,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe(true);
    expect(
      bufferMatchesMime(
        zip,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ),
    ).toBe(true);
  });

  it("accepts legacy DOC/XLS (CFB) signatures", () => {
    const cfb = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    expect(bufferMatchesMime(cfb, "application/msword")).toBe(true);
    expect(bufferMatchesMime(cfb, "application/vnd.ms-excel")).toBe(true);
  });

  it("plain text passes only when not a known binary container", () => {
    expect(bufferMatchesMime(utf8("hello world"), "text/plain")).toBe(true);
    const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
    expect(bufferMatchesMime(pdf, "text/plain")).toBe(false);
  });

  it("rejects unknown MIME types outright", () => {
    expect(bufferMatchesMime(utf8("anything"), "application/x-evil")).toBe(false);
  });
});
