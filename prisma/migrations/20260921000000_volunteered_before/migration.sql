-- Self-declared "have you volunteered with Fair Food before?" answer.
-- Deliberately nullable with no backfill: every existing row genuinely has no
-- answer, and guessing one from booking history would mislabel the volunteers
-- who helped out before this platform existed.
ALTER TABLE "User" ADD COLUMN "volunteeredBefore" BOOLEAN;
