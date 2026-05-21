import "server-only";
import { appOrigin, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildBookingCalendarEvent, buildICS } from "@/lib/calendar";
import { contentDispositionHeader } from "@/lib/content-disposition";
import { BookingStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;

  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Scope to the owner — we 404 (not 403) so probing a booking ID can't be
  // used to confirm someone else's booking exists.
  const booking = await db.booking.findFirst({
    where: { id: bookingId, userId: user.id },
    include: {
      shift: {
        include: { program: { select: { title: true, location: true, slug: true } } },
      },
    },
  });
  if (!booking) return new Response("Not found", { status: 404 });
  if (booking.status === BookingStatus.CANCELLED) {
    return new Response("Not found", { status: 404 });
  }

  const event = buildBookingCalendarEvent({
    bookingId: booking.id,
    programTitle: booking.shift.program.title,
    location: booking.shift.program.location,
    start: booking.shift.startsAt,
    end: booking.shift.endsAt,
    appOrigin: appOrigin(),
    shiftId: booking.shiftId,
    notes: booking.notes,
  });

  // YYYY-MM-DD in NZ time so the filename matches the shift's local date even
  // when the UTC instant crosses midnight in the user's timezone.
  const nzDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(booking.shift.startsAt);
  const filename = `fairfood-${booking.shift.program.slug}-${nzDate}.ics`;

  return new Response(buildICS(event), {
    headers: {
      // method=PUBLISH so clients treat it as "add to my calendar", not an
      // RSVP-required meeting invite (mirrors the email attachment).
      "Content-Type": "text/calendar; method=PUBLISH; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": contentDispositionHeader(filename, "attachment"),
      "Cache-Control": "private, no-store",
    },
  });
}
