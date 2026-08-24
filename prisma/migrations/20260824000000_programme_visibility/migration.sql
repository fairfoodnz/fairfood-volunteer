-- Programme visibility: replaces the `active` boolean with a four-state enum so
-- a coordinator can run a programme that the public never sees while still
-- rostering volunteers for it from /admin.
--
-- Backfill mapping: active = true → PUBLIC (unchanged behaviour),
-- active = false → ARCHIVED (the old "Hidden (draft)" state, which also hid the
-- programme from the admin scheduling pickers).

CREATE TYPE "ProgramVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE', 'ARCHIVED');

ALTER TABLE "Program"
  ADD COLUMN "visibility" "ProgramVisibility" NOT NULL DEFAULT 'PUBLIC';

UPDATE "Program" SET "visibility" = 'ARCHIVED' WHERE "active" = false;

ALTER TABLE "Program" DROP COLUMN "active";
