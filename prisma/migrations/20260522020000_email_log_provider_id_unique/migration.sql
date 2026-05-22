-- Backfill safety: a Resend message id must appear at most once in EmailLog
-- so `scripts/backfill-resend-emails.ts` can be re-run without duplicating
-- rows. Postgres treats NULL as distinct, so DEV_LOGGED / FAILED rows
-- (which have no providerId) coexist without collision.

CREATE UNIQUE INDEX "EmailLog_providerId_key" ON "EmailLog"("providerId");
