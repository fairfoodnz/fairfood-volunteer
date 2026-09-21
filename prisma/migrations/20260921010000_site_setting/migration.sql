-- Coordinator-editable copy overrides. Rows are optional: every key has a
-- code-side fallback, so an empty table renders the shipped wording.
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SiteSetting_updatedById_idx" ON "SiteSetting"("updatedById");

ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
