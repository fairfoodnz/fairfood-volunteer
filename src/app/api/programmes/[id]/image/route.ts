import "server-only";
import { db } from "@/lib/db";
import { getObject } from "@/lib/s3";

// Public — programme images appear on the unauthenticated marketing site, so
// (unlike /api/documents/[id]) there is no requireUser() gate here.
export const dynamic = "force-dynamic";

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

  const headers: Record<string, string> = {
    "Content-Type": object.contentType ?? "application/octet-stream",
    // Object key changes on every upload (uuid), so it's safe to cache hard.
    "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
  };
  if (object.contentLength != null) {
    headers["Content-Length"] = String(object.contentLength);
  }

  return new Response(object.stream, { headers });
}
