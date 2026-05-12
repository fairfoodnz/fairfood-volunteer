import "server-only";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getObject } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();

  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id, deletedAt: null },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  let object;
  try {
    object = await getObject(doc.objectKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const filename = doc.title.replace(/"/g, "");
  const headers: Record<string, string> = {
    "Content-Type": object.contentType ?? doc.mimeType,
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
  if (object.contentLength != null) {
    headers["Content-Length"] = String(object.contentLength);
  }

  return new Response(object.stream, { headers });
}
