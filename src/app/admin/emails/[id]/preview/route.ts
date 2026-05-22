import "server-only";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Serves an EmailLog's stored bodyHtml so the admin email detail page can
 * iframe it for a faithful preview. Admin-only — we 404 (not 401/403) for
 * everyone else to match the rest of /admin (don't advertise the surface to
 * volunteers).
 *
 * The HTML is rendered exactly as it was sent (react-email already stripped
 * scripts), but the response carries a strict CSP and `sandbox` directive
 * so a future template bug — or a stale row from a more permissive renderer
 * — can't run JS, navigate the top frame, or post a form. The iframe on the
 * page additionally uses the `sandbox` attribute as belt-and-braces.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Not found", { status: 404 });
  }

  const { id } = await params;
  const row = await db.emailLog.findUnique({ where: { id } });
  if (!row) return new Response("Not found", { status: 404 });

  return new Response(row.bodyHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      // Block scripts, forms, frame navigation, and outbound network — the
      // iframe is purely for visual preview. `img-src *` keeps inline brand
      // images and any CID-style externals visible.
      "Content-Security-Policy":
        "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; font-src data:; sandbox",
      // Audit content — never let an intermediary cache it across admins.
      "Cache-Control": "private, no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
