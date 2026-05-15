import "server-only";
import { db } from "@/lib/db";

// Readiness probe: confirms the app can actually reach Postgres. Unlike the
// liveness check at /api/health, this is deliberately NOT wired into the
// Docker HEALTHCHECK — a DB outage shouldn't trigger container restart loops.
// Use it for post-deploy smoke tests / external monitoring to catch a broken
// DATABASE_URL or an unreachable database.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "ok" });
  } catch {
    return Response.json(
      { status: "error", database: "unreachable" },
      { status: 503 },
    );
  }
}
