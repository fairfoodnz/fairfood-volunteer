-- Custom programmes: drop the ProgramSlug enum so coordinators can add their
-- own programmes, and add the new editable fields. The slug column is converted
-- in place (enum -> text) and existing values are normalised to URL slugs
-- (KAI_BOX -> kai-box) so existing /programs/<slug> links keep working.

-- 1. New programme fields.
ALTER TABLE "Program" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "gettingHere" TEXT,
ADD COLUMN     "imageKey" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'cream';

-- 2. Convert slug from the ProgramSlug enum to free-form text (in place — the
--    Program_slug_key unique index is rebuilt automatically and keeps its name).
ALTER TABLE "Program" ALTER COLUMN "slug" TYPE TEXT USING "slug"::text;

-- 3. Normalise enum-style values to URL slugs (KAI_BOX -> kai-box).
UPDATE "Program" SET "slug" = lower(replace("slug", '_', '-'));

-- 4. Drop the now-unused enum type.
DROP TYPE "ProgramSlug";

-- 5. Re-assert the unique index deterministically (drop + recreate so the
--    migration replays cleanly against the shadow database).
DROP INDEX "Program_slug_key";
CREATE UNIQUE INDEX "Program_slug_key" ON "Program"("slug");
