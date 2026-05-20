-- Split the single `User.name` column into `firstName` + nullable `lastName`.
-- Destructive: existing `name` values are NOT backfilled (prod DB is being
-- reset alongside this change). `firstName` is NOT NULL with no default, so
-- this must run against an empty `User` table.

ALTER TABLE "User" DROP COLUMN "name";
ALTER TABLE "User" ADD COLUMN "firstName" TEXT NOT NULL;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
