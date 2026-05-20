-- Bulk-import provenance: non-null while an imported volunteer has not yet
-- claimed their account; cleared on first invite redemption.
ALTER TABLE "User" ADD COLUMN "importedAt" TIMESTAMP(3);

-- Single-use invite tokens. Only the SHA-256 hash is stored (mirrors
-- PasswordResetToken / EmailVerificationToken). 7-day TTL is enforced at the
-- application layer via expiresAt.
CREATE TABLE "VolunteerInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerInvite_tokenHash_key" ON "VolunteerInvite"("tokenHash");
CREATE INDEX "VolunteerInvite_userId_idx" ON "VolunteerInvite"("userId");

ALTER TABLE "VolunteerInvite" ADD CONSTRAINT "VolunteerInvite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
