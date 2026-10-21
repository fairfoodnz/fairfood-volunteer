import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { ProgramArt } from "@/components/site/illustrations";
import {
  formatShiftRange,
  INCLUSIVE_SLUG,
  INCLUSIVE_MAILTO,
  isLinkVisible,
  isListedPublicly,
  NOINDEX,
} from "@/lib/programs";
import {
  sumBlocks,
  shiftAvailability,
  summarizeBlocks,
  blockKindLabel,
} from "@/lib/shifts";
import { appOrigin, currentUser } from "@/lib/auth";
import { absoluteUrl, jsonLdScript, ORG_ID, ORG_SITE_URL } from "@/lib/seo";
import { buildBookingCalendarEvent, calendarLinks } from "@/lib/calendar";
import { AddToCalendar } from "@/components/site/add-to-calendar";
import { firstTimePrompt } from "@/lib/first-time";
import { Button } from "@/components/ui/button";
import { countOf } from "@/lib/format";
import { BookForm } from "./book-form";
import { CancelBookingDialog } from "./cancel-booking";
import { MobileBookBar } from "./mobile-book-bar";
import { BookingStatus, Role } from "@/generated/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// Shared, request-deduplicated fetch: generateMetadata and the page component
// both call this, and React.cache() coalesces them into a single DB query.
const getShift = cache((id: string) =>
  db.shift.findUnique({
    where: { id },
    include: {
      program: true,
      bookings: {
        where: { status: BookingStatus.CONFIRMED },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          notes: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      blocks: { select: { slots: true, kind: true } },
    },
  }),
);

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const shift = await getShift(id);
  // A shift on a private/archived programme gives nothing away in the <head>,
  // even to the coordinator previewing it.
  if (!shift || !isLinkVisible(shift.program.visibility)) {
    return { robots: NOINDEX };
  }
  const title = `${shift.program.title} · ${formatShiftRange(shift.startsAt, shift.endsAt)}`;
  const description = `Volunteer with Fair Food: ${shift.program.title} at ${shift.program.location}, ${formatShiftRange(shift.startsAt, shift.endsAt)}. Book your spot.`;
  const canonical = `/shifts/${shift.id}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
    ...(isListedPublicly(shift.program.visibility) ? {} : { robots: NOINDEX }),
  };
}

export default async function ShiftPage({ params }: Props) {
  const { id } = await params;
  const shift = await getShift(id);
  if (!shift) notFound();

  const user = await currentUser();
  const firstTimeLabel = await firstTimePrompt(user);
  const myBooking =
    (user && shift.bookings.find((b) => b.userId === user.id)) || null;

  // A shift on a private or archived programme has no public page. The people
  // who legitimately need it are the coordinators and the volunteers already
  // rostered on it (their /me dashboard, booking email and calendar invite all
  // link here) — everyone else gets a 404.
  const publiclyBookable = isLinkVisible(shift.program.visibility);
  if (!publiclyBookable && !myBooking && user?.role !== Role.ADMIN) notFound();

  const bookedCount = shift.bookings.length;
  const blockedCount = sumBlocks(shift.blocks);
  const { taken, free, isFull } = shiftAvailability(
    shift.capacity,
    bookedCount,
    blockedCount,
  );
  const inPast = shift.startsAt < new Date();
  const isInclusive = shift.program.slug === INCLUSIVE_SLUG;
  const rosterChips = buildRosterChips(shift.bookings, user?.id ?? null);
  const groupBlocks = summarizeBlocks(shift.blocks);
  const whenLabel = formatShiftRange(shift.startsAt, shift.endsAt);
  // Only a PUBLIC programme has a filter chip on /shifts; an unlisted one
  // would silently fall back to "All", so link there by name instead.
  const moreShiftsHref = isListedPublicly(shift.program.visibility)
    ? `/shifts?programme=${shift.program.slug}`
    : "/shifts";
  const moreShiftsLabel = isListedPublicly(shift.program.visibility)
    ? `See other ${shift.program.title} shifts →`
    : "See open shifts →";
  // The booking form is the only state worth a sticky CTA on phones.
  const showBookForm =
    !isInclusive && !inPast && !myBooking && publiclyBookable && !isFull;

  // schema.org Event — volunteer shifts are real events with a time and place,
  // so this makes them eligible for richer search results. Past/cancelled
  // states are reflected in eventStatus.
  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${shift.program.title} volunteer shift`,
    description: shift.program.description,
    startDate: shift.startsAt.toISOString(),
    endDate: shift.endsAt.toISOString(),
    eventStatus: shift.cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    isAccessibleForFree: true,
    url: absoluteUrl(`/shifts/${shift.id}`),
    location: {
      "@type": "Place",
      // program.location is a free-form address string, so it carries the full
      // location signal on its own — no hardcoded locality to drift out of sync.
      name: shift.program.location,
    },
    organizer: {
      "@type": "NGO",
      // Reference the canonical Organization node emitted by siteJsonLd() and
      // point at the main org site, so both resolve to the same entity.
      "@id": ORG_ID,
      name: "Fair Food",
      url: ORG_SITE_URL,
    },
  };

  return (
    <>
      {/* Structured data is a discovery surface — public programmes only. */}
      {isListedPublicly(shift.program.visibility) && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(eventLd) }}
        />
      )}
      <SiteNav />
      <main id="main" className="flex-1 py-12 md:py-16">
        <div className="container-x">
          <Link
            href="/shifts"
            className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-foreground/70 hover:text-foreground"
          >
            ← All shifts
          </Link>

          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
            <article className="space-y-8">
              <header className="space-y-3">
                <p className="eyebrow text-leaf-deep">{shift.program.tagline}</p>
                <h1 className="display text-balance text-4xl font-bold leading-tight md:text-5xl">
                  {shift.program.title}
                </h1>
                <p className="text-lg text-foreground/85">{whenLabel}</p>
              </header>

              <div className="overflow-hidden rounded-md border border-border bg-cream-deep">
                <div className="grid sm:grid-cols-[1fr_14rem]">
                  <div className="relative h-44 w-full sm:order-2 sm:h-auto">
                    <ProgramArt program={shift.program} />
                  </div>
                  <p className="px-7 py-8 text-foreground/85 sm:order-1 sm:max-w-xl">
                    {shift.program.description}
                  </p>
                </div>
              </div>

              <section aria-labelledby="roster-heading" className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2
                    id="roster-heading"
                    className="font-mono text-xs uppercase tracking-widest text-foreground/70"
                  >
                    Who&rsquo;s going
                  </h2>
                  {/* The one capacity statement on the page. `taken` counts
                      pre-arranged group holds as well as bookings. */}
                  <p
                    className={
                      isFull || free <= 2
                        ? "text-sm font-semibold text-tomato-deep"
                        : "text-sm font-semibold text-foreground/85"
                    }
                  >
                    {isFull
                      ? `Full — all ${shift.capacity} spots taken`
                      : `${countOf(free, "spot")} left of ${shift.capacity}`}
                    <span className="sr-only"> ({taken} taken)</span>
                  </p>
                </div>
                {rosterChips.length === 0 && groupBlocks.length === 0 ? (
                  <p className="text-sm text-foreground/65">
                    Be the first to put your name down.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {rosterChips.map((c) => (
                      <li key={c.key}>
                        <span
                          className={
                            c.isYou
                              ? "inline-flex rounded-full bg-leaf-deep px-3 py-1 text-sm font-semibold text-cream"
                              : "inline-flex rounded-full bg-leaf/15 px-3 py-1 text-sm font-medium text-leaf-deep"
                          }
                        >
                          {c.label}
                        </span>
                      </li>
                    ))}
                    {groupBlocks.map((b) => (
                      <li key={b.kind}>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-clay/30 bg-clay/10 px-3 py-1 text-sm font-semibold text-clay">
                          + {blockKindLabel(b.kind).toLowerCase()} of {b.slots}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {groupBlocks.length > 0 && (
                  <p className="text-xs text-foreground/65">
                    A pre-arranged group is joining this shift alongside the
                    volunteers above.
                  </p>
                )}
              </section>

              <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                <Detail label="Location" value={shift.program.location} />
                <Detail
                  label="Bring"
                  value="Closed-toe shoes and hair tied back. Hi-vis, aprons, gloves and a cuppa on us."
                />
                <Detail
                  label="Not sure?"
                  value={
                    <>
                      Email{" "}
                      <a
                        className="font-semibold text-leaf-deep underline underline-offset-4"
                        href="mailto:volunteering@fairfood.org.nz"
                      >
                        volunteering@fairfood.org.nz
                      </a>
                    </>
                  }
                />
              </dl>

              {shift.notes && (
                <div className="rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-4 text-sm">
                  <p className="font-mono text-xs uppercase tracking-widest text-foreground/70">
                    Note from the team
                  </p>
                  <p className="mt-1 text-foreground/85">{shift.notes}</p>
                </div>
              )}
            </article>

            <aside
              id="book"
              className="scroll-mt-24 lg:sticky lg:top-[calc(6rem+var(--impersonation-offset,0px))] lg:self-start"
            >
              <div className="rounded-md border border-border bg-card p-6 shadow-sm md:p-8">
                {isInclusive ? (
                  <div className="space-y-4">
                    <p className="eyebrow text-leaf-deep">By arrangement</p>
                    <h2 className="display text-xl font-semibold leading-snug">
                      Inclusive volunteering is set up with our team.
                    </h2>
                    <p className="text-sm text-foreground/75">
                      We run this with pre-registered groups so we can tailor
                      the mahi, support and pace. Tell us about your group and
                      we&rsquo;ll find a time that works.
                    </p>
                    <Link
                      href={INCLUSIVE_MAILTO}
                      className="inline-flex min-h-11 items-center rounded bg-leaf-deep px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-leaf-ink"
                    >
                      Email volunteering@fairfood.org.nz →
                    </Link>
                  </div>
                ) : inPast ? (
                  <Note title="That shift has passed">
                    Want to come along to the next one?
                    {/* The listing only carries public programmes, so an
                        admin-run one points at the full roster instead. */}
                    <Link
                      href={moreShiftsHref}
                      className="mt-1 flex min-h-11 items-center font-semibold text-leaf-deep underline-offset-4 hover:underline"
                    >
                      {moreShiftsLabel}
                    </Link>
                  </Note>
                ) : myBooking ? (
                  <div className="space-y-4">
                    <p className="eyebrow text-leaf-deep">Your shift</p>
                    <h2 className="display text-xl font-semibold leading-snug">
                      You&rsquo;re booked in. See you then.
                    </h2>
                    <p className="font-mono text-xs uppercase tracking-widest text-foreground/70">
                      {whenLabel}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <AddToCalendar
                        bookingId={myBooking.id}
                        links={calendarLinks(
                          buildBookingCalendarEvent({
                            bookingId: myBooking.id,
                            programTitle: shift.program.title,
                            location: shift.program.location,
                            start: shift.startsAt,
                            end: shift.endsAt,
                            appOrigin: appOrigin(),
                            shiftId: shift.id,
                            notes: myBooking.notes,
                          }),
                        )}
                      />
                      <Button asChild variant="ghost">
                        <Link href="/me">All my shifts →</Link>
                      </Button>
                      <CancelBookingDialog bookingId={myBooking.id} />
                    </div>
                  </div>
                ) : !publiclyBookable ? (
                  <Note title="The team books this session">
                    Spots here are arranged directly with our coordinators.
                    Email{" "}
                    <a
                      className="font-semibold text-leaf-deep underline underline-offset-4"
                      href="mailto:volunteering@fairfood.org.nz"
                    >
                      volunteering@fairfood.org.nz
                    </a>{" "}
                    if you think you should be on this roster.
                  </Note>
                ) : isFull ? (
                  <Note title="This shift is full">
                    Every spot on this one is taken — there&rsquo;s usually
                    room on another day.
                    <Link
                      href={moreShiftsHref}
                      className="mt-1 flex min-h-11 items-center font-semibold text-leaf-deep underline-offset-4 hover:underline"
                    >
                      {moreShiftsLabel}
                    </Link>
                  </Note>
                ) : (
                  <BookForm
                    shiftId={shift.id}
                    firstTimePrompt={firstTimeLabel}
                    user={
                      user
                        ? {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                          }
                        : null
                    }
                  />
                )}
              </div>
            </aside>
          </div>
        </div>
        {showBookForm && (
          <MobileBookBar
            title={shift.program.title}
            summary={`${whenLabel} · ${countOf(free, "spot")} left`}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-widest text-foreground/70">
        {label}
      </dt>
      <dd className="mt-1 text-foreground/85">{value}</dd>
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="display text-xl font-semibold">{title}</h2>
      <div className="text-sm text-foreground/85">{children}</div>
    </div>
  );
}

type RosterChip = { key: string; label: string; isYou: boolean };

function buildRosterChips(
  bookings: {
    id: string;
    userId: string;
    user: { firstName: string; lastName: string | null };
  }[],
  currentUserId: string | null,
): RosterChip[] {
  // First names only, disambiguate duplicates with a last initial.
  const firsts = bookings.map((b) => {
    const first = b.user.firstName;
    const lastInitial = b.user.lastName
      ? b.user.lastName.charAt(0).toUpperCase()
      : "";
    return { ...b, first, lastInitial };
  });
  const firstCounts = new Map<string, number>();
  for (const b of firsts) {
    firstCounts.set(b.first, (firstCounts.get(b.first) ?? 0) + 1);
  }

  const chips: RosterChip[] = firsts.map((b) => {
    const isYou = currentUserId !== null && b.userId === currentUserId;
    const needsInitial = (firstCounts.get(b.first) ?? 0) > 1 && b.lastInitial;
    const display = needsInitial ? `${b.first} ${b.lastInitial}.` : b.first;
    return { key: b.id, label: isYou ? "You" : display, isYou };
  });

  // Move the current user's chip to the front for visibility.
  chips.sort((a, b) => (a.isYou === b.isYou ? 0 : a.isYou ? -1 : 1));
  return chips;
}
