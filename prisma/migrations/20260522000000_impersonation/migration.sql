-- Mark sessions minted by admin impersonation so currentUser() can skip its
-- sliding-expiry renewal — impersonation must stay short-lived (1h), not
-- inherit the volunteer's 30-day fuse.
ALTER TABLE "Session" ADD COLUMN "isImpersonation" BOOLEAN NOT NULL DEFAULT false;

-- Audit trail: one row per "start impersonating" click; endedAt is filled on
-- stop (or stays null if the impersonation session expired without an
-- explicit stop).
CREATE TABLE "ImpersonationLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ImpersonationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImpersonationLog_adminId_startedAt_idx" ON "ImpersonationLog"("adminId", "startedAt");
CREATE INDEX "ImpersonationLog_targetUserId_idx" ON "ImpersonationLog"("targetUserId");

ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImpersonationLog" ADD CONSTRAINT "ImpersonationLog_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
