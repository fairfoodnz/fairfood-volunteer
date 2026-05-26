-- Postgres requires `ALTER TYPE ... ADD VALUE` to live in its own transaction:
-- the new value isn't visible until the transaction commits, and Prisma wraps
-- every migration file in a single BEGIN/COMMIT. Splitting this into its own
-- migration is the standard workaround so the follow-up migration can
-- reference BOOKING_REMINDER safely.
ALTER TYPE "EmailTemplate" ADD VALUE 'BOOKING_REMINDER';
