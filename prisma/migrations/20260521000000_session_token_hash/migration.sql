-- Hash session tokens at rest. Pre-migration rows stored the raw token, so
-- they're unsafe under the new scheme — drop them and force a re-sign-in.
-- The cookie still holds the raw token; lookups now hash the cookie value
-- before querying.
DELETE FROM "Session";

ALTER TABLE "Session" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "Session_token_key" RENAME TO "Session_tokenHash_key";
ALTER INDEX "Session_token_idx" RENAME TO "Session_tokenHash_idx";
