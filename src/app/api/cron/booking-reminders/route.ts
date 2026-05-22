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
      reminderSentAt: true,
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
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { bookingId: string; reason: string }[] = [];

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
    window: { start: start.toISOString(), end: end.toISOString() },
    ...(failures.length ? { failures } : {}),
  });
}
