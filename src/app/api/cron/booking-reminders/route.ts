import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { BookingStatus } from "@/generated/prisma";
import { formatShiftRange } from "@/lib/programs";
import { nzTomorrowUtcRange } from "@/lib/schedule";
import { sendBookingReminderEmail } from "@/lib/email";
import { appUrl } from "../../../../../emails/brand";

/**
 * 24-hour-before booking reminder cron.
 *
 * Scheduling is intentionally external (Coolify Scheduled Tasks, or any cron
 * service): this route just exposes an authenticated trigger. Coolify hits
 *   POST /api/cron/booking-reminders
 *   Authorization: Bearer ${CRON_SECRET}
 * once a day (recommended ~10am NZ — gives every shift the next day a
 * waking-hour reminder).
 *
 * Selection: CONFIRMED bookings whose shift starts on the next NZ calendar
 * day, shift not cancelled, `Booking.reminderSentAt IS NULL`. Tomorrow's
 * UTC window is computed DST-aware in `nzTomorrowUtcRange`.
 *
 * Idempotency: every successful send is stamped onto `Booking.reminderSentAt`
 * inside an `updateMany({ where: { reminderSentAt: null } })` — a double-fire
 * of the schedule, or two cron runs racing on the same booking, can never
 * double-send because the second `updateMany` matches zero rows.
 *
 * The route force-dynamic + GETs unsupported: it must never be statically
 * rendered, and a GET (link prefetcher, mail-scanner, browser preview) must
 * not be enough to trigger sends.
 */
export const dynamic = "force-dynamic";

const FORCE_FLAG = "force"; // ?force=1 — opt-in override, see below
// Upper bound on rows handled per run. A normal day has tens of bookings;
// a holiday surge has hundreds. Capping here keeps memory predictable and
// the loop bounded — if real volume ever exceeds this we'll batch across
// runs with a cursor instead of unbounded findMany().
const BATCH_SIZE = 500;
// Resend's default rate limit is 2 requests per second. A tight loop trips
// `rate_limit_exceeded` after a handful of bookings, and the rollback path
// is no help here — the next cron tick is 24 hours later, by which time
// the shift has already happened. Pace the sends at one per ~600ms to stay
// comfortably under the limit (≈1.67/sec). Lower this if you've upgraded
// the Resend plan.
const MIN_SEND_INTERVAL_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  const provided = header.slice(prefix.length);
  // Constant-time compare on equal-length buffers; an unequal-length compare
  // is short-circuited (no leak — a length mismatch is already unauthorized).
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  // `?force=1` lets an admin re-run for a window that's already been stamped
  // (e.g. recovering from a Resend outage). Without it, stamped rows are
  // skipped — which is the normal idempotent path.
  //
  // Force only re-runs the *current* NZ-tomorrow window. To recover from an
  // outage, fire force=1 while that window is still "tomorrow" — i.e. before
  // NZ midnight on the day of the outage. Once the shift day arrives there
  // is no self-service recovery path via this endpoint.
  const force = url.searchParams.get(FORCE_FLAG) === "1";

  const { start, end } = nzTomorrowUtcRange();

  const bookings = await db.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      ...(force ? {} : { reminderSentAt: null }),
      shift: {
        cancelled: false,
        startsAt: { gte: start, lt: end },
      },
    },
    select: {
      id: true,
      notes: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      },
      shift: {
        select: {
          startsAt: true,
          endsAt: true,
          program: { select: { title: true, location: true } },
        },
      },
    },
    take: BATCH_SIZE,
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { bookingId: string; reason: string }[] = [];
  let lastSendAt = 0;

  for (const b of bookings) {
    // Claim the row first: an updateMany guarded by `reminderSentAt: null`
    // races safely against a parallel cron invocation — only one will flip
    // the row, the loser gets count=0 and skips. Skipped when --force.
    if (!force) {
      const claim = await db.booking.updateMany({
        where: { id: b.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
      });
      if (claim.count === 0) {
        skipped += 1;
        continue;
      }
    }

    const waitMs = lastSendAt + MIN_SEND_INTERVAL_MS - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    lastSendAt = Date.now();

    try {
      await sendBookingReminderEmail({
        to: b.user.email,
        userId: b.user.id,
        userName: b.user.firstName || undefined,
        programTitle: b.shift.program.title,
        whenLabel: formatShiftRange(b.shift.startsAt, b.shift.endsAt),
        location: b.shift.program.location,
        notes: b.notes ?? undefined,
        manageUrl: `${appUrl}/me`,
      });
      sent += 1;
      // In force mode we skipped the claim step, so the row may still be
      // `reminderSentAt: null` (e.g. recovering from a rollback after a
      // Resend outage). Stamp it now so a re-fire of the schedule on the
      // same NZ day doesn't re-send to the same booking. Best-effort —
      // a failed stamp doesn't fail the send.
      if (force) {
        await db.booking
          .update({
            where: { id: b.id },
            data: { reminderSentAt: new Date() },
          })
          .catch((err) =>
            console.error(
              `[cron] reminderSentAt stamp failed for booking ${b.id} (force):`,
              err,
            ),
          );
      }
    } catch (e) {
      failed += 1;
      const reason = e instanceof Error ? e.message : String(e);
      failures.push({ bookingId: b.id, reason });
      // Roll the stamp back so a transient Resend failure doesn't burn the
      // reminder for that booking — the next cron tick will retry. We can't
      // do this when force=true because the stamp wasn't ours to begin with.
      if (!force) {
        await db.booking
          .update({
            where: { id: b.id },
            data: { reminderSentAt: null },
          })
          .catch((err) =>
            // A failed rollback isn't fatal — worst case the volunteer
            // doesn't get a reminder. Log loudly so an operator can spot it.
            console.error(
              `[cron] reminderSentAt rollback failed for booking ${b.id}:`,
              err,
            ),
          );
      }
      console.error(
        `[cron] booking reminder failed for booking ${b.id}:`,
        e,
      );
    }
  }

  console.log(
    `[cron] booking-reminders done — sent=${sent} skipped=${skipped} failed=${failed} window=[${start.toISOString()},${end.toISOString()})`,
  );

  return Response.json({
    sent,
    skipped,
    failed,
    candidates: bookings.length,
    force,
    window: { start: start.toISOString(), end: end.toISOString() },
    ...(failures.length ? { failures } : {}),
  });
}
