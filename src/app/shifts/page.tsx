import Link from "next/link";
import { db } from "@/lib/db";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import {
  formatShiftRange,
  formatShiftTimes,
  INCLUSIVE_SLUG,
  nzDateKey,
  nzWeekBucket,
} from "@/lib/programs";
import {
  sumBlocks,
  shiftAvailability,
  summarizeBlocks,
} from "@/lib/shifts";
import { currentUser } from "@/lib/auth";
import { BookingStatus } from "@/generated/prisma";
import { firstTimePrompt } from "@/lib/first-time";
import { cn } from "@/lib/utils";
import { ShiftsList, type ShiftCard, type ShiftWeek } from "./shifts-list";

const description =
  "Browse open volunteer shifts with Fair Food in Avondale and book one that fits your week. Most run about three hours and finish with a cuppa together.";

export const metadata = {
  title: "Open shifts · Fair Food Volunteer",
  description,
  alternates: { canonical: "/shifts" },
  openGraph: {
    title: "Open shifts · Fair Food Volunteer",
    description,
    url: "/shifts",
  },
};
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ programme?: string; selected?: string }>;
};

export default async function ShiftsPage({ searchParams }: Props) {
  const sp = await searchParams;

  // Inclusive volunteering is enquiry-only (arranged with pre-registered
  // groups), so it never appears as a filter chip or in the bookable roster.
  const programmes = await db.program.findMany({
    where: { visibility: "PUBLIC", slug: { not: INCLUSIVE_SLUG } },
    orderBy: { order: "asc" },
    select: { slug: true, title: true },
  });

  // Only honour ?programme= when it points at a real, active programme.
  const filter =
    sp.programme && programmes.some((p) => p.slug === sp.programme)
      ? sp.programme
      : "ALL";

  const filters: { label: string; slug: string }[] = [
    { label: "All", slug: "ALL" },
    ...programmes.map((p) => ({ label: p.title, slug: p.slug })),
  ];

  // The shifts query and the session lookup are independent — run them in
  // parallel to save a round-trip on slower connections. The per-user
  // booking lookup that follows still depends on both, so it stays
  // sequential.
  const [shifts, user] = await Promise.all([
    db.shift.findMany({
      where: {
        cancelled: false,
        startsAt: { gte: new Date() },
        // Unlisted and private programmes never appear in the roster, only
        // via their own link (unlisted) or an admin-made booking (private).
        // `filter` is already checked against the public list above; the
        // visibility clause repeats it so the query is safe on its own.
        program: {
          visibility: "PUBLIC",
          ...(filter !== "ALL"
            ? { slug: filter }
            : { slug: { not: INCLUSIVE_SLUG } }),
        },
      },
      orderBy: { startsAt: "asc" },
      include: {
        program: true,
        _count: {
          select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
        },
        blocks: { select: { slots: true, kind: true } },
      },
      take: 60,
    }),
    currentUser(),
  ]);

  // Fetch the viewer's confirmed bookings so the listing can mark them as
  // "Going" rather than offering a redundant tick. We only need IDs.
  const myBookedShiftIds = user
    ? new Set(
        (
          await db.booking.findMany({
            where: {
              userId: user.id,
              status: BookingStatus.CONFIRMED,
              shiftId: { in: shifts.map((s) => s.id) },
            },
            select: { shiftId: true },
          })
        ).map((b) => b.shiftId),
      )
    : new Set<string>();

  const firstTimeLabel = await firstTimePrompt(user);

  const initialSelection = (sp.selected ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const toCard = (s: ShiftWithCount): ShiftCard => {
    const { free, isFull } = shiftAvailability(
      s.capacity,
      s._count.bookings,
      sumBlocks(s.blocks),
    );
    const alreadyBooked = myBookedShiftIds.has(s.id);
    const bookable = !isFull && !alreadyBooked;
    return {
      id: s.id,
      whenLabel: formatShiftRange(s.startsAt, s.endsAt),
      timeLabel: formatShiftTimes(s.startsAt, s.endsAt),
      capacity: s.capacity,
      free,
      isFull,
      isAlmostFull: !isFull && free <= 2,
      notes: s.notes,
      bookable,
      groupBlocks: summarizeBlocks(s.blocks),
      unbookableReason: alreadyBooked
        ? "Already booked"
        : isFull
          ? "Full"
          : null,
      program: {
        id: s.program.id,
        title: s.program.title,
        slug: s.program.slug,
        imageUrl: s.program.imageUrl,
        imageKey: s.program.imageKey,
        theme: s.program.theme,
      },
    };
  };
  const weeks = groupByWeek(shifts, toCard);
  const activeTitle = programmes.find((p) => p.slug === filter)?.title;

  return (
    <>
      <SiteNav />
      <main id="main" className="flex-1">
        <PageHeader
          band
          eyebrow="Roster"
          title="Open shifts in Avondale."
          lead={
            <>
              Pick a shift that fits the day you&rsquo;ve got. Most run for 3
              hours and finish with a cuppa together.
            </>
          }
        >
          <nav aria-label="Filter by programme" className="mt-7">
            <ul className="flex flex-wrap gap-2">
              {filters.map((f) => {
                const active = filter === f.slug;
                const href =
                  f.slug === "ALL" ? "/shifts" : `/shifts?programme=${f.slug}`;
                return (
                  <li key={f.slug}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                        active
                          ? "border-leaf-deep bg-leaf-deep text-cream"
                          : "border-foreground/15 bg-background text-foreground/85 hover:border-foreground/35",
                      )}
                    >
                      {f.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </PageHeader>

        <section aria-label="Shifts" className="container-x py-12 md:py-16">
          {weeks.length === 0 ? (
            filter === "ALL" ? (
              <EmptyState action={{ href: "/programs", label: "See all programmes →" }}>
                No open shifts right now — new dates open every week.
              </EmptyState>
            ) : (
              <EmptyState action={{ href: "/shifts", label: "Show every programme →" }}>
                No open {activeTitle} shifts right now — come back soon, or
                try another programme.
              </EmptyState>
            )
          ) : (
            <ShiftsList
              weeks={weeks}
              initialSelection={initialSelection}
              authed={!!user}
              firstTimePrompt={firstTimeLabel}
            />
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

type ShiftWithCount = Awaited<
  ReturnType<typeof db.shift.findMany>
>[number] & {
  _count: { bookings: number };
  blocks: { slots: number; kind: import("@/generated/prisma").SlotBlockKind }[];
  program: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string | null;
    imageKey: string | null;
    theme: string;
  };
};

// Monday-start NZ weeks → NZ days, both in listing (startsAt) order, so the
// jump links above the list can say "This week / Next week / Week of …".
function groupByWeek(
  shifts: ShiftWithCount[],
  toCard: (s: ShiftWithCount) => ShiftCard,
): ShiftWeek[] {
  const dayFmt = new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Pacific/Auckland",
  });
  const todayKey = nzDateKey(new Date());
  const weeks: ShiftWeek[] = [];
  for (const s of shifts) {
    const dayKey = nzDateKey(s.startsAt);
    const bucket = nzWeekBucket(dayKey, todayKey);
    let week = weeks.at(-1);
    if (!week || week.key !== bucket.key) {
      week = { key: bucket.key, label: bucket.label, count: 0, days: [] };
      weeks.push(week);
    }
    let day = week.days.at(-1);
    if (!day || day.key !== dayKey) {
      day = { key: dayKey, day: dayFmt.format(s.startsAt), shifts: [] };
      week.days.push(day);
    }
    day.shifts.push(toCard(s));
    week.count++;
  }
  return weeks;
}
