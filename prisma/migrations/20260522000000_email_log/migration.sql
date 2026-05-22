-- Audit trail for every transactional email rendered by src/lib/email.tsx.
-- Admins can see what we sent to a volunteer (subject + rendered HTML/text)
-- from the volunteer detail page. We log every attempt — including dev-only
-- console.log fallbacks and Resend failures — so "I never got the email" is
-- answerable from admin without diving into Resend's dashboard.

CREATE TYPE "EmailTemplate" AS ENUM (
  'VERIFY_EMAIL',
  'WELCOME',
  'PASSWORD_RESET',
  'BOOKING_CONFIRMATION',
  'BOOKING_CANCELLED',
  'VOLUNTEER_INVITE'
);

CREATE TYPE "EmailLogStatus" AS ENUM ('SENT', 'DEV_LOGGED', 'FAILED');

CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    -- Nullable + SetNull so deleting a volunteer doesn't nuke the audit trail,
    -- and so emails to addresses without a matching User row still get logged.
    "userId" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" "EmailTemplate" NOT NULL,
    "status" "EmailLogStatus" NOT NULL,
    -- Resend message id when status=SENT — useful for matching to Resend's
    -- dashboard delivery info.
    "providerId" TEXT,
    "error" TEXT,
    -- Both HTML and plain-text bodies are stored so the admin preview can
    -- render faithfully without re-running the template (the original input
    -- data isn't reconstructable from a log row).
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLog_userId_createdAt_idx" ON "EmailLog"("userId", "createdAt");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
