-- Per-document ACL: every existing row is backfilled to VOLUNTEER (the
-- safe default — same exposure as today, since /api/documents/[id]
-- already required a signed-in user). Future uploads explicitly choose
-- PUBLIC / VOLUNTEER / ADMIN; the route gates on this column.
CREATE TYPE "DocumentVisibility" AS ENUM ('PUBLIC', 'VOLUNTEER', 'ADMIN');

ALTER TABLE "Document"
  ADD COLUMN "visibility" "DocumentVisibility" NOT NULL DEFAULT 'VOLUNTEER';

CREATE INDEX "Document_visibility_deletedAt_idx"
  ON "Document"("visibility", "deletedAt");
