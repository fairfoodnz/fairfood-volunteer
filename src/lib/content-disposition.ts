// Safe Content-Disposition filename helpers. RFC 6266 + RFC 5987.
//
// A malicious filename can inject response headers if it contains CR/LF, or
// break out of the quoted form if it contains `"` / `\`. We strip every byte
// that has no business in a filename (controls, separators, quote, backslash)
// before interpolating into the legacy `filename="…"` parameter, and *also*
// emit `filename*=UTF-8''…` for modern clients so non-ASCII titles render
// correctly there.

/** Strip CR/LF, double-quote, backslash, and ASCII control characters. */
export function sanitiseAsciiFilename(name: string): string {
  // Drop everything below 0x20 (controls), 0x22 ("), 0x5C (\), and 0x7F.
  // Also collapse non-ASCII to "_": the *=UTF-8'' parameter carries the
  // pretty form; this is only the legacy fallback.
  const cleaned = name.replace(/[\x00-\x1F\x7F"\\]/g, "").replace(/[^\x20-\x7E]/g, "_");
  // Avoid an empty filename — clients dislike `filename=""`.
  return cleaned.trim() || "download";
}

/** Percent-encode a UTF-8 filename for the `filename*=` parameter. */
export function encodeRFC5987(name: string): string {
  // encodeURIComponent leaves "!*'()" alone — RFC 5987 reserves "*'", so
  // re-encode them. Drop CR/LF too as a belt-and-braces measure (they'd
  // already have been encoded, but stripping the raw input keeps the value
  // tight regardless of what the encoder does in future runtimes).
  return encodeURIComponent(name.replace(/[\r\n]/g, ""))
    .replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Build a full `Content-Disposition` value with both legacy and RFC 5987
 * filename forms. `disposition` defaults to `attachment` (force-download);
 * `inline` is for image and PDF preview endpoints.
 */
export function contentDispositionHeader(
  name: string,
  disposition: "attachment" | "inline" = "attachment",
): string {
  const ascii = sanitiseAsciiFilename(name);
  const utf8 = encodeRFC5987(name);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
