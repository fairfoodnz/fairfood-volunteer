import "server-only";
import sharp from "sharp";

/**
 * Cap the total pixel area of any uploaded image. A small file (2 KB PNG) can
 * decode to e.g. 30 000×30 000 px ≈ 3.6 GB RGBA — a textbook decompression
 * bomb. Garage stores the bytes fine; the moment a thumbnailer, Next/Image
 * optimizer, or admin preview decodes them, the server OOMs. 4096×4096
 * (≈16.8 MP) is comfortably above the largest legitimate hero/cover image and
 * far below memory-exhaustion territory for any plausible single decode.
 */
export const MAX_IMAGE_PIXELS = 4096 * 4096;

export type ProbeResult =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "unreadable" | "no_dimensions" | "too_large" };

/**
 * Probe image dimensions without decoding the pixel data. `sharp.metadata()`
 * reads container headers only — a decompression bomb is safe to inspect this
 * way because we never ask libvips to expand the pixels into memory.
 *
 * `limitInputPixels: false` here only disables sharp's own cap during the
 * metadata read; we apply our own MAX_IMAGE_PIXELS check immediately after.
 * (Leaving the default would already reject most bombs, but the failure mode
 * is a thrown error mid-decode; doing our own check lets us return a clean
 * "too_large" result the caller can shape into a friendly message.)
 */
export async function probeImage(buffer: Buffer): Promise<ProbeResult> {
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: false }).metadata();
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const { width, height } = meta;
  if (typeof width !== "number" || typeof height !== "number") {
    return { ok: false, reason: "no_dimensions" };
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    return { ok: false, reason: "too_large" };
  }
  return { ok: true, width, height };
}
