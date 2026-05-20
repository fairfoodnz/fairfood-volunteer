import Link from "next/link";
import { db } from "@/lib/db";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { formatShiftRange, INCLUSIVE_SLUG } from "@/lib/programs";
import { sumBlocks, shiftAvailability } from "@/lib/shifts";
import { currentUser } from "@/lib/auth";
import { BookingStatus } from "@/generated/prisma";
import { ShiftsList, type ShiftCard, type ShiftDay } from "./shifts-list";

export const metadata = { title: "Open shifts · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ programme?: string; selected?: string }>;
};

export default async function ShiftsPage({ searchParams }: Props) {
  const sp = await searchParams;

  // Inclusive volunteering is enquiry-only (arranged with pre-registered
  // groups), so it never appears as a filter chip or in the bookable roster.
  const programmes = await db.program.findMany({
    where: { active: true, slug: { not: INCLUSIVE_SLUG } },
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

  const shifts = await db.shift.findMany({
    where: {
      cancelled: false,
      startsAt: { gte: new Date() },
      program:
        filter !== "ALL"
          ? { slug: filter }
          : { slug: { not: INCLUSIVE_SLUG } },
    },
    orderBy: { startsAt: "asc" },
    include: {
      program: true,
      _count: {
        select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
      },
      blocks: { select: { slots: true } },
    },
    take: 60,
  });

  // Fetch the viewer's confirmed bookings so the listing can mark them as
  // "Going" rather than offering a redundant tick. We only need IDs.
  const user = await currentUser();
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

  const initialSelection = (sp.selected ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const grouped = groupByDay(shifts);
  const groupedForClient: ShiftDay[] = grouped.map(({ day, shifts }) => ({
    day,
    shifts: shifts.map<ShiftCard>((s) => {
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
        capacity: s.capacity,
        free,
        isFull,
        isAlmostFull: !isFull && free <= 2,
        notes: s.notes,
        bookable,
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
        },
      };
    }),
  }));

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-cream-deep">
          <div className="container-x py-12 md:py-16">
            <p className="eyebrow">Roster</p>
            <h1 className="display mt-3 text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Open shifts in Avondale.
            </h1>
            <p className="mt-3 max-w-2xl text-foreground/75">
              Pick a shift that fits the day you&rsquo;ve got. Most run for 3
              hours and finish with a cuppa together.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {filters.map((f) => {
                const active = filter === f.slug;
                const href = f.slug === "ALL" ? "/shifts" : `/shifts?programme=${f.slug}`;
                return (
                  <Link
                    key={f.slug}
                    href={href}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border-leaf bg-leaf text-cream"
                        : "border-foreground/15 bg-background text-foreground/75 hover:border-foreground/35"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container-x py-12 md:py-16">
          <ShiftsList
            groupedShifts={groupedForClient}
            initialSelection={initialSelection}
            authed={!!user}
            isEmpty={groupedForClient.length === 0}
          />
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
  blocks: { slots: number }[];
  program: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string | null;
    imageKey: string | null;
  };
};

function groupByDay(shifts: ShiftWithCount[]) {
  const map = new Map<string, ShiftWithCount[]>();
  const fmt = new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Pacific/Auckland",
  });
  for (const s of shifts) {
    const k = fmt.format(s.startsAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  return Array.from(map, ([day, shifts]) => ({ day, shifts }));
}

