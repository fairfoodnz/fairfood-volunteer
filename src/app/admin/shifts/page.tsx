import Link from "next/link";
import { db } from "@/lib/db";
import { formatShiftRange } from "@/lib/programs";
import { sumBlocks } from "@/lib/shifts";
import { BookingStatus, Prisma } from "@/generated/prisma";
import {
  ShiftBulkTable,
  type ShiftRow,
} from "@/components/admin/shift-bulk-table";

export const metadata = { title: "Manage shifts · Admin" };
export const dynamic = "force-dynamic";

const RANGES = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

// Bulk ops act on what's on screen, so cap the list and tell the coordinator
// when it's truncated — narrowing the filter is the way to reach the rest.
const CAP = 200;

const ACTIVE = [BookingStatus.CONFIRMED, BookingStatus.ATTENDED] as const;

export default async function ManageShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ programme?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const range: RangeKey =
    (RANGES.find((r) => r.key === sp.range)?.key as RangeKey) ?? "upcoming";
  const programmeId =
    sp.programme && sp.programme !== "all" ? sp.programme : null;

  const now = new Date();
  const where: Prisma.ShiftWhereInput = {};
  if (programmeId) where.programId = programmeId;
  if (range === "upcoming") {
    where.endsAt = { gte: now };
    where.cancelled = false;
  } else if (range === "past") {
    where.endsAt = { lt: now };
    where.cancelled = false;
  } else if (range === "cancelled") {
    where.cancelled = true;
  }
  const orderBy: Prisma.ShiftOrderByWithRelationInput =
    range === "upcoming" ? { startsAt: "asc" } : { startsAt: "desc" };

  const [programmes, shifts] = await Promise.all([
    db.program.findMany({
      orderBy: [{ active: "desc" }, { order: "asc" }],
      select: { id: true, title: true },
    }),
    db.shift.findMany({
      where,
      orderBy,
      take: CAP,
      include: {
        program: { select: { title: true } },
        blocks: { select: { slots: true } },
        _count: {
          select: { bookings: { where: { status: { in: [...ACTIVE] } } } },
        },
      },
    }),
  ]);

  const rows: ShiftRow[] = shifts.map((s) => ({
    id: s.id,
    when: formatShiftRange(s.startsAt, s.endsAt),
    programme: s.program.title,
    capacity: s.capacity,
    confirmed: s._count.bookings,
    blockedSlots: sumBlocks(s.blocks),
    blockCount: s.blocks.length,
    cancelled: s.cancelled,
  }));

  function hrefWith(next: { programme?: string; range?: string }) {
    const q = new URLSearchParams();
    const p =
      "programme" in next ? next.programme : (programmeId ?? undefined);
    const r = next.range ?? range;
    if (p) q.set("programme", p);
    if (r && r !== "upcoming") q.set("range", r);
    const s = q.toString();
    return s ? `/admin/shifts?${s}` : "/admin/shifts";
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Rosters</p>
            <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Manage shifts.
            </h1>
            <p className="mt-1 text-sm text-foreground/65">
              Select shifts to cancel them off the schedule or delete them for
              good.
            </p>
          </div>
          <Link
            href="/admin/shifts/new"
            className="inline-flex h-11 items-center gap-2 rounded bg-leaf px-5 text-sm font-semibold text-cream hover:bg-leaf-deep"
          >
            + New shift
          </Link>
        </header>

        <section>
          <form
            action="/admin/shifts"
            method="get"
            className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            {range !== "upcoming" && (
              <input type="hidden" name="range" value={range} />
            )}
            <div className="flex items-center gap-2">
              <label
                htmlFor="shift-programme"
                className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
              >
                Programme
              </label>
              <select
                id="shift-programme"
                name="programme"
                defaultValue={programmeId ?? "all"}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="all">All programmes</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md bg-foreground/5 px-3 text-sm font-semibold hover:bg-foreground/10"
              >
                Apply
              </button>
              {(programmeId || range !== "upcoming") && (
                <Link
                  href="/admin/shifts"
                  className="text-xs text-foreground/55 hover:text-foreground"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <nav
            aria-label="Filter shifts by date"
            className="mt-4 flex flex-wrap gap-2"
          >
            {RANGES.map((r) => {
              const active = range === r.key;
              return (
                <Link
                  key={r.key}
                  href={hrefWith({ range: r.key })}
                  className={
                    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors " +
                    (active
                      ? "border-leaf bg-leaf text-cream"
                      : "border-border bg-card text-foreground/75 hover:border-leaf/40 hover:text-leaf-deep")
                  }
                >
                  {r.label}
                </Link>
              );
            })}
          </nav>

          <p className="mt-4 mb-3 text-xs text-foreground/55">
            {rows.length >= CAP
              ? `Showing the first ${CAP} — narrow by programme or date to reach the rest.`
              : `${rows.length} ${rows.length === 1 ? "shift" : "shifts"}`}
          </p>

          {/* Padding so the floating action bar never hides the last row. */}
          <div className="pb-24">
            <ShiftBulkTable shifts={rows} />
          </div>
        </section>
      </div>
    </div>
  );
}
