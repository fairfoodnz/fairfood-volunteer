import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatShiftRange, formatShiftTimes } from "@/lib/programs";
import { sumBlocks, shiftAvailability } from "@/lib/shifts";
import { nzTomorrowUtcRange, nzWallTimeToUtc } from "@/lib/schedule";
import { countOf } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";
import { BookingStatus, Prisma } from "@/generated/prisma";

export const metadata = { title: "Dashboard · Admin" };
export const dynamic = "force-dynamic";

// Spots actually held — the same rule as Manage shifts and the roster.
const HOLDING = [BookingStatus.CONFIRMED, BookingStatus.ATTENDED];

const shiftInclude = {
  program: { select: { title: true } },
  _count: {
    select: { bookings: { where: { status: { in: HOLDING } } } },
  },
  blocks: { select: { slots: true } },
} satisfies Prisma.ShiftInclude;

export default async function AdminPage() {
  await requireAdmin();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Today's NZ calendar day, so shifts that already started this morning stay
  // on the dashboard until midnight — that's when attendance gets marked.
  const todayISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const startOfToday = nzWallTimeToUtc(todayISO, "00:00");
  const { start: startOfTomorrow } = nzTomorrowUtcRange(now);

  const [today, upcoming, totalVolunteers, weekBookings] = await Promise.all([
    db.shift.findMany({
      where: {
        startsAt: { gte: startOfToday, lt: startOfTomorrow },
        cancelled: false,
      },
      orderBy: { startsAt: "asc" },
      include: shiftInclude,
    }),
    db.shift.findMany({
      where: { startsAt: { gte: startOfTomorrow }, cancelled: false },
      orderBy: { startsAt: "asc" },
      take: 30,
      include: shiftInclude,
    }),
    db.user.count({ where: { role: "VOLUNTEER" } }),
    db.booking.count({
      where: {
        status: { in: HOLDING },
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  const all = [...today, ...upcoming];
  const totalCapacity = all.reduce((s, x) => s + x.capacity, 0);
  // Include off-platform group holds so a group-only shift doesn't read as 0 booked.
  const totalFilled = all.reduce(
    (s, x) => s + x._count.bookings + sumBlocks(x.blocks),
    0,
  );

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          eyebrow="Dashboard"
          title="Today’s rosters & coming weeks"
          actions={
            <Button asChild className="bg-leaf-deep hover:bg-leaf-ink">
              <Link href="/admin/shifts/new">+ New shift</Link>
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <StatTile label="Volunteers" value={totalVolunteers} />
          <StatTile
            label="New bookings"
            value={weekBookings}
            hint="In the last 7 days"
          />
          <StatTile
            label="Spots filled"
            value={`${totalFilled} / ${totalCapacity}`}
            hint={`Booked or held, across the next ${countOf(all.length, "shift")}`}
          />
          <StatTile
            label="Fill rate"
            value={
              totalCapacity > 0
                ? `${Math.round((totalFilled / totalCapacity) * 100)}%`
                : "—"
            }
            hint="Of capacity on those shifts"
          />
        </div>

        <section className="mt-10" aria-labelledby="today-heading">
          <h2 id="today-heading" className="display mb-4 text-2xl font-semibold">
            Today
          </h2>
          {today.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-card px-5 py-4 text-sm text-foreground/70">
              No shifts today.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {today.map((s) => {
                const blocked = sumBlocks(s.blocks);
                const { taken, free } = shiftAvailability(
                  s.capacity,
                  s._count.bookings,
                  blocked,
                );
                return (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 rounded-md border border-l-4 border-border border-l-leaf bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {formatShiftTimes(s.startsAt, s.endsAt)}
                      </p>
                      <p className="text-sm text-foreground/85">
                        {s.program.title}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-y-1 text-sm tabular-nums text-foreground/70">
                        {taken} / {s.capacity} booked
                        <FillPills blocked={blocked} free={free} />
                      </p>
                    </div>
                    <Button asChild variant="outline" className="shrink-0">
                      <Link href={`/admin/shifts/${s.id}`}>Open roster</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-10" aria-labelledby="upcoming-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2
              id="upcoming-heading"
              className="display text-2xl font-semibold"
            >
              Coming up
            </h2>
            <Link
              href="/admin/shifts"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-leaf-deep hover:underline"
            >
              Manage shifts →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState
              action={{ href: "/admin/shifts/new", label: "Create a shift →" }}
            >
              No upcoming shifts.
            </EmptyState>
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[36rem] text-sm">
                  <caption className="sr-only">
                    The next {countOf(upcoming.length, "shift")} after today,
                    with spots booked out of capacity.
                  </caption>
                  <thead className="bg-cream-deep text-left text-foreground/70">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest"
                      >
                        When
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest"
                      >
                        Programme
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest"
                      >
                        Booked
                      </th>
                      <th scope="col" className="px-4 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((s) => {
                      const blocked = sumBlocks(s.blocks);
                      const { taken, free } = shiftAvailability(
                        s.capacity,
                        s._count.bookings,
                        blocked,
                      );
                      const when = formatShiftRange(s.startsAt, s.endsAt);
                      return (
                        <tr key={s.id} className="border-t border-border">
                          <td className="whitespace-nowrap px-4 py-3 font-medium">
                            {when}
                          </td>
                          <td className="px-4 py-3 text-foreground/85">
                            {s.program.title}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                            <span className="font-semibold">{taken}</span>
                            <span className="text-foreground/70">
                              {" "}
                              / {s.capacity}
                            </span>
                            <FillPills blocked={blocked} free={free} />
                          </td>
                          <td className="px-4 py-1 text-right">
                            <Link
                              href={`/admin/shifts/${s.id}`}
                              aria-label={`Roster for ${s.program.title}, ${when}`}
                              className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-leaf-deep hover:underline"
                            >
                              Roster →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FillPills({ blocked, free }: { blocked: number; free: number }) {
  return (
    <>
      {blocked > 0 && (
        <StatusPill tone="neutral" className="ml-2">
          incl. {blocked} held
        </StatusPill>
      )}
      {free <= 2 && free > 0 && (
        <StatusPill tone="warning" className="ml-2">
          Almost full
        </StatusPill>
      )}
      {free === 0 && (
        <StatusPill tone="neutral" className="ml-2">
          Full
        </StatusPill>
      )}
    </>
  );
}
