import "server-only";
import { db } from "@/lib/db";
import { getObject } from "@/lib/s3";

// Public — programme images appear on the unauthenticated marketing site, so
// (unlike /api/documents/[id]) there is no requireUser() gate here.
export const dynamic = "force-dynamic";

// Image MIME types this route is willing to *serve*. Uploads are already
// constrained to this set (see admin/programmes/actions.ts); locking the
// response side too means a malformed stored value can't turn into an
// active-content render on the app origin.
const SAFE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const program = await db.program.findUnique({
    where: { id },
    select: { imageKey: true },
  });
  if (!program?.imageKey) {
    return new Response("Not found", { status: 404 });
  }

  let object;
  try {
    object = await getObject(program.imageKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const sniffed = object.contentType ?? "";
  const contentType = SAFE_IMAGE_TYPES.has(sniffed)
    ? sniffed
    : "application/octet-stream";

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    // Without nosniff, a browser could sniff a malformed object (HTML/SVG
    // smuggled in under image/*) and render active content on the app origin.
    "X-Content-Type-Options": "nosniff",
    // <img src=…> ignores Content-Disposition; this only affects direct URL
    // visits, where we want the image to preview in the browser rather than
    // trigger a download. Paired with the Content-Type allowlist + nosniff
    // above, an unexpected payload would be served as application/octet-
    // stream and the browser would download it instead of rendering.
    "Content-Disposition": "inline",
    // Object key changes on every upload (uuid), so it's safe to cache hard.
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
  };
  if (object.contentLength != null) {
    headers["Content-Length"] = String(object.contentLength);
  }

  return new Response(object.stream, { headers });
}
