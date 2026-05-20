-- Adds the FK that the previous migration's `invitedById` column should have
-- had from the start. SetNull preserves the audit trail when an admin user
-- is deleted (the invite row stays, the column nulls) rather than cascading
-- and erasing the record.

CREATE INDEX "VolunteerInvite_invitedById_idx" ON "VolunteerInvite"("invitedById");

ALTER TABLE "VolunteerInvite" ADD CONSTRAINT "VolunteerInvite_invitedById_fkey"
    FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
