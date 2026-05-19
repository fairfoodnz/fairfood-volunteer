import Link from "next/link";
import { db } from "@/lib/db";
import { formatShiftRange } from "@/lib/programs";
import { sumBlocks, shiftAvailability } from "@/lib/shifts";
import { BookingStatus } from "@/generated/prisma";

export const metadata = { title: "Admin · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [shifts, totalVolunteers, weekBookings] = await Promise.all([
    db.shift.findMany({
      where: { startsAt: { gte: now }, cancelled: false },
      orderBy: { startsAt: "asc" },
      take: 30,
      include: {
        program: true,
        _count: {
          select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
        },
        blocks: { select: { slots: true } },
      },
    }),
    db.user.count({ where: { role: "VOLUNTEER" } }),
    db.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  const totalCapacity = shifts.reduce((s, x) => s + x.capacity, 0);
  const totalBooked = shifts.reduce((s, x) => s + x._count.bookings, 0);

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
                Today&rsquo;s rosters & coming weeks.
              </h1>
            </div>
            <Link
              href="/admin/shifts/new"
              className="inline-flex h-11 items-center gap-2 rounded bg-leaf px-5 text-sm font-semibold text-cream hover:bg-leaf-deep"
            >
              + New shift
            </Link>
          </header>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Volunteers" value={totalVolunteers} />
            <Stat label="Bookings (7d)" value={weekBookings} />
            <Stat label="Spots booked / open" value={`${totalBooked} / ${totalCapacity}`} />
            <Stat
              label="Fill rate"
              value={
                totalCapacity > 0
                  ? `${Math.round((totalBooked / totalCapacity) * 100)}%`
                  : "—"
              }
            />
          </div>

          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="display text-2xl font-semibold">Upcoming shifts</h2>
              <Link
                href="/admin/shifts"
                className="text-sm font-semibold text-leaf-deep hover:underline"
              >
                Manage shifts →
              </Link>
            </div>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-cream-deep text-left text-foreground/65">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">When</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">Programme</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">Booked</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest"></th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => {
                    const blocked = sumBlocks(s.blocks);
                    const { free } = shiftAvailability(
                      s.capacity,
                      s._count.bookings,
                      blocked,
                    );
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">
                          {formatShiftRange(s.startsAt, s.endsAt)}
                        </td>
                        <td className="px-4 py-3 text-foreground/80">
                          {s.program.title}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">
                            {s._count.bookings}
                          </span>
                          <span className="text-foreground/55">
                            {" "}/ {s.capacity}
                          </span>
                          {blocked > 0 && (
                            <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/65">
                              {blocked} held
                            </span>
                          )}
                          {free <= 2 && free > 0 && (
                            <span className="ml-2 rounded-full bg-tomato/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tomato">
                              Almost full
                            </span>
                          )}
                          {free === 0 && (
                            <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                              Full
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/shifts/${s.id}`}
                            className="font-semibold text-leaf-deep hover:underline"
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
          </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </p>
      <p className="display mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
