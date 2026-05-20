import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MAX_IMAGE_PIXELS, probeImage } from "@/lib/image-dimensions";

// We generate fixtures on the fly via sharp so the test stays small and the
// image bytes match the sharp version we actually use in production. Sharp
// only decodes pixel data on demand — metadata() (what probeImage uses)
// reads the container header, so a "huge dimensions" check needs a real
// generated image with those dimensions.

async function makePng(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe("probeImage", () => {
  it("returns dimensions for a normal image", async () => {
    const buffer = await makePng(640, 480);
    const result = await probeImage(buffer);
    expect(result).toEqual({ ok: true, width: 640, height: 480 });
  });

  it("rejects pixel area above MAX_IMAGE_PIXELS", async () => {
    // 5000 * 4096 = 20.48 MP > 4096*4096 = 16.78 MP.
    const buffer = await makePng(5000, 4096);
    const result = await probeImage(buffer);
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("accepts an image right at the cap", async () => {
    const side = Math.floor(Math.sqrt(MAX_IMAGE_PIXELS));
    const buffer = await makePng(side, side);
    const result = await probeImage(buffer);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.width * result.height).toBeLessThanOrEqual(MAX_IMAGE_PIXELS);
    }
  });

  it("returns unreadable for non-image input", async () => {
    const result = await probeImage(Buffer.from("not actually an image"));
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });
});
