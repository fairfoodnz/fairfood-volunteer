import "server-only";

// Magic-byte signatures for the file types we accept on upload. The serving
// routes lock Content-Type to a fixed per-mime allowlist regardless of what's
// stored, but rejecting a mismatch *on upload* prevents HTML/SVG masquerading
// as image/png from ever landing in object storage in the first place —
// defense in depth on top of the response-side allowlist + nosniff header.
type Signature = {
  /** Bytes that must appear at `offset`. */
  bytes: number[];
  offset?: number;
  /** Optional secondary anchor (e.g. WebP's "WEBP" at offset 8). */
  tail?: { bytes: number[]; offset: number };
};

// Multiple signatures per mime are possible (GIF87a vs GIF89a). The first
// match wins; the array is the entire test set for that mime.
const SIGS: Record<string, Signature[]> = {
  "application/pdf": [{ bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }], // "%PDF-"
  "image/jpeg": [{ bytes: [0xff, 0xd8, 0xff] }],
  "image/png": [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/gif": [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  "image/webp": [
    {
      bytes: [0x52, 0x49, 0x46, 0x46], // "RIFF"
      tail: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // "WEBP"
    },
  ],
  // Compound File Binary (legacy Office DOC/XLS). We can't distinguish DOC
  // vs XLS from magic alone — accept either declared type if the container
  // matches. The serving allowlist still constrains response Content-Type.
  "application/msword": [
    { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  ],
  "application/vnd.ms-excel": [
    { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  ],
  // OOXML containers are plain ZIPs — same caveat as the CFB pair.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] },
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    { bytes: [0x50, 0x4b, 0x03, 0x04] },
  ],
};

function matches(buf: Uint8Array, sig: Signature): boolean {
  const off = sig.offset ?? 0;
  if (buf.length < off + sig.bytes.length) return false;
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buf[off + i] !== sig.bytes[i]) return false;
  }
  if (sig.tail) {
    if (buf.length < sig.tail.offset + sig.tail.bytes.length) return false;
    for (let i = 0; i < sig.tail.bytes.length; i++) {
      if (buf[sig.tail.offset + i] !== sig.tail.bytes[i]) return false;
    }
  }
  return true;
}

/**
 * True if `buf`'s first bytes look like the declared mime type. `text/plain`
 * has no magic bytes — accept if it's not obviously a known binary container
 * (this is what blocks the "rename evil.html as document.txt" trick: HTML's
 * `<` would be allowed, but a PDF or PNG signature would not). All other
 * accepted types must match a registered signature.
 */
export function bufferMatchesMime(buf: Uint8Array, mime: string): boolean {
  if (mime === "text/plain") {
    for (const sigs of Object.values(SIGS)) {
      for (const sig of sigs) if (matches(buf, sig)) return false;
    }
    return true;
  }
  const sigs = SIGS[mime];
  if (!sigs) return false;
  return sigs.some((sig) => matches(buf, sig));
}
