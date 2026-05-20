-- Hash session tokens at rest. Pre-migration rows stored the raw token, so
-- they're unsafe under the new scheme — drop them and force a re-sign-in.
-- The cookie still holds the raw token; lookups now hash the cookie value
-- before querying.
DELETE FROM "Session";

ALTER TABLE "Session" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "Session_token_key" RENAME TO "Session_tokenHash_key";

-- The `@unique` on tokenHash already creates a unique B-tree index, so the
-- old Session_token_idx is redundant — drop it. Add a userId index instead
-- (none existed before) so the userId-scoped deleteMany calls in password
-- reset / invite claim / sign-out flows don't sequential-scan. Same shape
-- as PasswordResetToken / EmailVerificationToken / VolunteerInvite.
DROP INDEX "Session_token_idx";
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
