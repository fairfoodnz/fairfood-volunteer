import "server-only";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getObject } from "@/lib/s3";
import { safeServeMime } from "@/lib/documents";
import { contentDispositionHeader } from "@/lib/content-disposition";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const doc = await db.document.findFirst({
    where: { id, deletedAt: null },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  // Per-document ACL. PUBLIC is open; VOLUNTEER needs any signed-in user;
  // ADMIN needs the admin role. We 404 rather than 403 for ADMIN so we don't
  // confirm to a logged-in volunteer that a specific admin document exists.
  if (doc.visibility !== "PUBLIC") {
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    if (doc.visibility === "ADMIN" && user.role !== "ADMIN") {
      return new Response("Not found", { status: 404 });
    }
  }

  let object;
  try {
    object = await getObject(doc.objectKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers: Record<string, string> = {
    // Allowlist-only. doc.mimeType is constrained at upload, but locking it
    // here means any future drift can't turn into "render as HTML on origin".
    "Content-Type": safeServeMime(doc.mimeType),
    // Defense in depth: even if Content-Type were ever wrong, the browser
    // won't sniff bytes and reinterpret the response.
    "X-Content-Type-Options": "nosniff",
    // RFC 6266 + RFC 5987: sanitised ASCII filename + UTF-8 percent-encoded.
    // Strips CR/LF/quote/backslash from doc.title — closes the
    // header-injection vector through admin-supplied titles.
    "Content-Disposition": contentDispositionHeader(doc.title, "attachment"),
  };
  if (object.contentLength != null) {
    headers["Content-Length"] = String(object.contentLength);
  }

  return new Response(object.stream, { headers });
}
