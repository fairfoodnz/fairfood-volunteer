-- Auth swap (magic link → password), volunteer onboarding questionnaire,
-- Document storage, and ProgramSlug cleanup (drop WORK_SKILLS + CORPORATE).

-- 1. Delete Program rows that reference enum values being removed.
--    Shifts and Bookings cascade via existing FK ON DELETE CASCADE.
DELETE FROM "Program" WHERE slug IN ('WORK_SKILLS', 'CORPORATE');

-- 2. Drop the LoginToken table — magic-link auth is being replaced.
DROP TABLE IF EXISTS "LoginToken";

-- 3. New enums for questionnaire + documents.
CREATE TYPE "HeardAbout" AS ENUM ('FRIEND', 'SOCIAL', 'SEARCH', 'WORKPLACE', 'EVENT', 'OTHER');
CREATE TYPE "DocumentCategory" AS ENUM ('HANDBOOK', 'HEALTH_SAFETY', 'GETTING_HERE', 'FORMS', 'OTHER');

-- 4. Rebuild ProgramSlug enum without WORK_SKILLS / CORPORATE.
--    Postgres 14+ supports ALTER TYPE ... DROP VALUE, but it's safer to rename + replace.
ALTER TYPE "ProgramSlug" RENAME TO "ProgramSlug_old";
CREATE TYPE "ProgramSlug" AS ENUM ('KAI_BOX', 'CONSCIOUS_KITCHEN', 'INCLUSIVE');
ALTER TABLE "Program" ALTER COLUMN slug TYPE "ProgramSlug" USING slug::text::"ProgramSlug";
DROP TYPE "ProgramSlug_old";

-- 5. Add User questionnaire + auth columns.
--    Existing users (if any) get a sentinel password hash that no bcrypt input can match;
--    they'll need to use the "forgot password" flow once that's wired up, or be reset by admin.
ALTER TABLE "User"
  ADD COLUMN "passwordHash"        TEXT NOT NULL DEFAULT '!',
  ADD COLUMN "birthday"            TIMESTAMP(3),
  ADD COLUMN "heardAbout"          "HeardAbout",
  ADD COLUMN "heardAboutOther"     TEXT,
  ADD COLUMN "whyInterested"       TEXT,
  ADD COLUMN "arrestHistory"       BOOLEAN,
  ADD COLUMN "arrestDetails"       TEXT,
  ADD COLUMN "healthConditions"    BOOLEAN,
  ADD COLUMN "healthDetails"       TEXT,
  ADD COLUMN "profileCompletedAt"  TIMESTAMP(3),
  ADD COLUMN "flagReviewedAt"      TIMESTAMP(3);

-- Drop the default once columns exist; real signups always set this explicitly.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- 6. Document table for volunteer-facing resources stored in Garage / S3.
CREATE TABLE "Document" (
  "id"           TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "description"  TEXT,
  "category"     "DocumentCategory" NOT NULL DEFAULT 'OTHER',
  "objectKey"    TEXT NOT NULL,
  "mimeType"     TEXT NOT NULL,
  "sizeBytes"    INTEGER NOT NULL,
  "uploadedById" TEXT,
  "deletedAt"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Document_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "Document_objectKey_key" UNIQUE   ("objectKey"),
  CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Document_category_deletedAt_idx" ON "Document" ("category", "deletedAt");
