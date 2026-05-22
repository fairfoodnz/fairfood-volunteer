-- 24-hour-before reminder emails. A daily cron picks tomorrow's confirmed
-- bookings, sends a reminder, then stamps Booking.reminderSentAt so the next
-- tick is a no-op for the same row — the idempotency guard lives on the
-- booking itself rather than via EmailLog so the cron's WHERE clause is
-- cheap and exact.

ALTER TABLE "Booking" ADD COLUMN "reminderSentAt" TIMESTAMP(3);

-- Partial index covering the cron's lookup ("confirmed bookings not yet
-- reminded"). Once a row gets stamped it falls out of the index forever, so
-- this stays small no matter how much history accrues — a full index on the
-- same columns would bloat for no read benefit.
CREATE INDEX "Booking_reminderSentAt_pending_idx"
  ON "Booking"("shiftId")
  WHERE "reminderSentAt" IS NULL AND "status" = 'CONFIRMED';
