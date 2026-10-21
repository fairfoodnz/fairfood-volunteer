import Link from "next/link";
import { MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { appOrigin, requireUser } from "@/lib/auth";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { ProgramArt } from "@/components/site/illustrations";
import { VerifyEmailBanner } from "@/components/site/verify-email-banner";
import { AddToCalendar } from "@/components/site/add-to-calendar";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusPill, type PillTone } from "@/components/patterns/status-pill";
import { formatShiftRange } from "@/lib/programs";
import { buildBookingCalendarEvent, calendarLinks } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CancelBookingDialog } from "../shifts/[id]/cancel-booking";
import { BookingStatus, type Prisma } from "@/generated/prisma";

export const metadata = { title: "My shifts · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

/**
 * Where nearly every shift happens (the Program.location default). Rows only
 * repeat an address when it differs from this, so the one that matters stands
 * out instead of being lost in a column of identical lines.
 */
const HUB_LOCATION = "624 Rosebank Road, Avondale, Tāmaki Makaurau";
const PAST_LIMIT = 12;

type BookingWithShift = Prisma.BookingGetPayload<{
  include: { shift: { include: { program: true } } };
}>;

type Props = { searchParams: Promise<{ booked?: string }> };

export default async function MePage({ searchParams }: Props) {
  const user = await requireUser();
  const { booked } = await searchParams;

  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    orderBy: { shift: { startsAt: "asc" } },
    include: { shift: { include: { program: true } } },
  });

  const now = new Date();
  const isUpcoming = (b: BookingWithShift) =>
    b.status === BookingStatus.CONFIRMED &&
    !b.shift.cancelled &&
    b.shift.startsAt >= now;
  // Soonest first.
  const upcoming = bookings.filter(isUpcoming);
  // Most recent first, so the cap drops the oldest history, not the newest.
  const past = bookings.filter((b) => !isUpcoming(b)).reverse();
  const [next, ...later] = upcoming;

  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1 py-12 md:py-16">
        <div className="container-x">
          {!user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}
          {booked && (
            <div className="mb-8 rounded-md border border-leaf/30 bg-leaf/10 px-5 py-4">
              <p className="font-semibold text-leaf-deep">Ka pai — you&rsquo;re booked.</p>
              <p className="text-sm text-foreground/75">
                We&rsquo;ll email you a reminder the day before. See you then.
              </p>
            </div>
          )}

          <PageHeader
            eyebrow={`Kia ora, ${user.firstName}`}
            title="Your shifts at the kai table."
            actions={
              // Primary full width on phones with the two account links
              // sharing a row beneath; one row from sm up.
              <div className="grid w-full grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap">
                <Button asChild className="min-[420px]:col-span-2">
                  <Link href="/shifts">Book another shift</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/me/profile">Edit profile</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/me/security">Sign-in &amp; security</Link>
                </Button>
              </div>
            }
          />

          <section aria-labelledby="coming-up" className="space-y-4">
            <h2 id="coming-up" className="display text-2xl font-semibold">
              Coming up
            </h2>
            {!next ? (
              <EmptyState action={{ href: "/shifts", label: "Browse open shifts →" }}>
                Nothing booked yet.
              </EmptyState>
            ) : (
              <>
                <NextUpCard booking={next} />
                {later.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-base font-semibold">Later</h3>
                      <p className="text-sm text-foreground/70">
                        At {HUB_LOCATION} unless noted
                      </p>
                    </div>
                    <ul className="space-y-3">
                      {later.map((b) => (
                        <li
                          key={b.id}
                          className="grid gap-4 rounded-md border border-border bg-card p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
                        >
                          <div className="flex items-center gap-4 md:contents">
                            <Thumb program={b.shift.program} className="size-14" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf-deep">
                                {b.shift.program.title}
                              </p>
                              <p className="mt-1 text-base font-medium">
                                {formatShiftRange(b.shift.startsAt, b.shift.endsAt)}
                              </p>
                              {!isHub(b.shift.program.location) && (
                                <Location>{b.shift.program.location}</Location>
                              )}
                            </div>
                          </div>
                          <BookingActions booking={b} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>

          {past.length > 0 && (
            <section aria-labelledby="past" className="mt-12 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="past" className="display text-2xl font-semibold">
                  Past &amp; cancelled
                </h2>
                {past.length > PAST_LIMIT && (
                  <p className="text-sm text-foreground/70">
                    Your {PAST_LIMIT} most recent
                  </p>
                )}
              </div>
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {past.slice(0, PAST_LIMIT).map((b) => {
                  const pill = pastStatus(b, now);
                  return (
                    <li
                      key={b.id}
                      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold">{b.shift.program.title}</p>
                        <p className="text-sm text-foreground/70">
                          {formatShiftRange(b.shift.startsAt, b.shift.endsAt)}
                        </p>
                      </div>
                      <StatusPill tone={pill.tone} className="self-start sm:self-auto">
                        {pill.label}
                      </StatusPill>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function NextUpCard({ booking: b }: { booking: BookingWithShift }) {
  return (
    <article
      aria-labelledby={`next-${b.id}`}
      className="rounded-md border border-border bg-card p-5 shadow-sm md:p-6"
    >
      <p className="eyebrow text-leaf-deep">Next up</p>
      <div className="mt-4 flex items-start gap-4 md:gap-6">
        <Thumb program={b.shift.program} className="size-16 md:size-24" />
        <div className="min-w-0">
          <h3
            id={`next-${b.id}`}
            className="display text-balance text-xl font-bold leading-tight md:text-2xl"
          >
            {b.shift.program.title}
          </h3>
          <p className="mt-1.5 text-base font-medium">
            {formatShiftRange(b.shift.startsAt, b.shift.endsAt)}
          </p>
          <Location>{b.shift.program.location}</Location>
        </div>
      </div>
      <BookingActions booking={b} className="mt-5 md:justify-start" />
    </article>
  );
}

function Thumb({
  program,
  className,
}: {
  program: BookingWithShift["shift"]["program"];
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded", className)}>
      <ProgramArt program={program} />
    </div>
  );
}

function Location({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-sm text-foreground/70">
      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/**
 * Add to calendar / Details / Cancel. All ≥44px: on a phone they sit two up,
 * calendar spanning the row; from sm they line up on one row.
 */
function BookingActions({
  booking: b,
  className,
}: {
  booking: BookingWithShift;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center md:justify-end",
        className,
      )}
    >
      <div className="col-span-2 grid sm:block">
        <AddToCalendar
          bookingId={b.id}
          size="default"
          links={calendarLinks(
            buildBookingCalendarEvent({
              bookingId: b.id,
              programTitle: b.shift.program.title,
              location: b.shift.program.location,
              start: b.shift.startsAt,
              end: b.shift.endsAt,
              appOrigin: appOrigin(),
              shiftId: b.shiftId,
              notes: b.notes,
            }),
          )}
        />
      </div>
      <Button asChild variant="outline">
        <Link href={`/shifts/${b.shiftId}`}>
          Details
          <span className="sr-only">
            {" "}
            for {b.shift.program.title},{" "}
            {formatShiftRange(b.shift.startsAt, b.shift.endsAt)}
          </span>
        </Link>
      </Button>
      <CancelBookingDialog bookingId={b.id} triggerLabel="Cancel" />
    </div>
  );
}

function isHub(location: string) {
  return location.trim() === HUB_LOCATION;
}

/** Past rows: a confirmed booking whose shift has gone by isn't "Confirmed". */
function pastStatus(
  b: BookingWithShift,
  now: Date,
): { label: string; tone: PillTone } {
  switch (b.status) {
    case BookingStatus.ATTENDED:
      return { label: "Attended", tone: "positive" };
    case BookingStatus.NO_SHOW:
      return { label: "No-show", tone: "warning" };
    case BookingStatus.CANCELLED:
      return { label: "Cancelled", tone: "neutral" };
    case BookingStatus.CONFIRMED:
      if (b.shift.cancelled) return { label: "Shift cancelled", tone: "neutral" };
      return b.shift.startsAt < now
        ? { label: "Not marked yet", tone: "neutral" }
        : { label: "Confirmed", tone: "positive" };
  }
}
