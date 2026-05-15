// Liveness probe for the container orchestrator (Coolify reads the Docker
// HEALTHCHECK status). Intentionally does NOT touch the database or S3 — it
// only confirms the Next.js server is up and serving requests, so a transient
// Postgres/Garage blip won't make Coolify kill or fail-deploy a healthy app.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
