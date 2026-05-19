-- AlterTable
ALTER TABLE "Program" ADD COLUMN "schedule" TEXT;

-- Backfill the editorial day-range on the seeded programmes, and rename the
-- kai-sorting programme. Matched by the stable slug so the public URL
-- (/programs/kai-box) and existing bookings are untouched. Rows are only
-- updated if they exist, so this is a no-op on a fresh database that gets
-- seeded afterwards.
UPDATE "Program" SET "title" = 'Kai Sorting', "schedule" = 'Mon – Fri' WHERE "slug" = 'kai-box';
UPDATE "Program" SET "schedule" = 'Tues – Thurs' WHERE "slug" = 'conscious-kitchen';
