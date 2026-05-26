import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { formatShiftRange } from "@/lib/programs";
import { sumBlocks } from "@/lib/shifts";
import { BookingStatus, Prisma } from "@/generated/prisma";
import {
  ShiftBulkTable,
  type ShiftRow,
} from "@/components/admin/shift-bulk-table";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const metadata = { title: "Manage shifts · Admin" };
export const dynamic = "force-dynamic";

const RANGES = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const PAGE_SIZE = 50;

const ACTIVE = [BookingStatus.CONFIRMED, BookingStatus.ATTENDED] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Convert a YYYY-MM-DD calendar date in Pacific/Auckland to the matching UTC
 * instant. Without this a "from 22 May" filter excludes shifts that start
 * before noon NZ time, because their UTC startsAt falls on 21 May.
 */
function nzDateToUtc(iso: string, endOfDay: boolean): Date | null {
  if (!ISO_DATE.test(iso)) return null;
  const pretend = new Date(
    `${iso}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  );
  // "sv-SE" formats as "YYYY-MM-DD HH:mm:ss" — easy to re-parse as UTC.
  const nzWall = pretend.toLocaleString("sv-SE", {
    timeZone: "Pacific/Auckland",
    hour12: false,
  });
  const asIfUtc = new Date(nzWall.replace(" ", "T") + "Z").getTime();
  const offsetMs = asIfUtc - pretend.getTime();
  return new Date(pretend.getTime() - offsetMs);
}

export default async function ManageShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{
    programme?: string;
    range?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const range: RangeKey =
    (RANGES.find((r) => r.key === sp.range)?.key as RangeKey) ?? "upcoming";
  const programmeId =
    sp.programme && sp.programme !== "all" ? sp.programme : null;
  const fromIso = sp.from && ISO_DATE.test(sp.from) ? sp.from : null;
  const toIso = sp.to && ISO_DATE.test(sp.to) ? sp.to : null;
  const fromDate = fromIso ? nzDateToUtc(fromIso, false) : null;
  const toDate = toIso ? nzDateToUtc(toIso, true) : null;
  const pageRaw = Number.parseInt(sp.page ?? "1", 10);
  const requestedPage =
    Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

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
  if (fromDate || toDate) {
    where.startsAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {}),
    };
  }

  const orderBy: Prisma.ShiftOrderByWithRelationInput =
    range === "upcoming" ? { startsAt: "asc" } : { startsAt: "desc" };

  const [programmes, total] = await Promise.all([
    db.program.findMany({
      orderBy: [{ active: "desc" }, { order: "asc" }],
      select: { id: true, title: true },
    }),
    db.shift.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const shifts = total
    ? await db.shift.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          program: { select: { title: true } },
          blocks: { select: { slots: true } },
          _count: {
            select: { bookings: { where: { status: { in: [...ACTIVE] } } } },
          },
        },
      })
    : [];

  const rows: ShiftRow[] = shifts.map((s) => ({
    id: s.id,
    when: formatShiftRange(s.startsAt, s.endsAt),
    programme: s.program.title,
    capacity: s.capacity,
    confirmed: s._count.bookings,
    blockedSlots: sumBlocks(s.blocks),
    cancelled: s.cancelled,
  }));

  const filtersActive =
    !!programmeId || range !== "upcoming" || !!fromIso || !!toIso;

  function hrefWith(next: {
    programme?: string | null;
    range?: RangeKey;
    from?: string | null;
    to?: string | null;
    page?: number;
  }) {
    const q = new URLSearchParams();
    const p =
      "programme" in next ? next.programme : (programmeId ?? undefined);
    const r = next.range ?? range;
    const f = "from" in next ? next.from : fromIso;
    const t = "to" in next ? next.to : toIso;
    const pg = next.page ?? 1;
    if (p) q.set("programme", p);
    if (r && r !== "upcoming") q.set("range", r);
    if (f) q.set("from", f);
    if (t) q.set("to", t);
    if (pg > 1) q.set("page", String(pg));
    const s = q.toString();
    return s ? `/admin/shifts?${s}` : "/admin/shifts";
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = (page - 1) * PAGE_SIZE + rows.length;

  // Force the bulk table to remount when filters or page change so selections
  // never carry over to a different visible set.
  const tableKey = JSON.stringify({
    programmeId,
    range,
    fromIso,
    toIso,
    page,
  });

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
            className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4"
          >
            {range !== "upcoming" && (
              <input type="hidden" name="range" value={range} />
            )}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="shift-programme"
                className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
              >
                Programme
              </label>
              <Select
                name="programme"
                defaultValue={programmeId ?? "all"}
                items={{
                  all: "All programmes",
                  ...Object.fromEntries(
                    programmes.map((p) => [p.id, p.title]),
                  ),
                }}
              >
                <SelectTrigger
                  id="shift-programme"
                  className="h-10 md:w-56"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programmes</SelectItem>
                  {programmes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="shift-from"
                className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
              >
                From
              </label>
              <DatePicker
                id="shift-from"
                name="from"
                defaultValue={fromIso ?? ""}
                placeholder="Any date"
                max={toIso ?? undefined}
                className="h-10 md:w-44"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="shift-to"
                className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
              >
                To
              </label>
              <DatePicker
                id="shift-to"
                name="to"
                defaultValue={toIso ?? ""}
                placeholder="Any date"
                min={fromIso ?? undefined}
                className="h-10 md:w-44"
              />
            </div>

            <div className="flex items-center gap-3 md:ml-auto md:pb-0.5">
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md bg-foreground/5 px-4 text-sm font-semibold hover:bg-foreground/10"
              >
                Apply
              </button>
              {filtersActive && (
                <Link
                  href="/admin/shifts"
                  className="text-xs font-medium text-foreground/55 hover:text-foreground"
                >
                  Clear all
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
                  href={hrefWith({ range: r.key, page: 1 })}
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

          <div className="mt-5 mb-3 flex items-center justify-between gap-3 text-xs text-foreground/55">
            <p aria-live="polite">
              {total === 0
                ? "No shifts match this view."
                : total <= PAGE_SIZE
                  ? `${total} ${total === 1 ? "shift" : "shifts"}`
                  : `Showing ${start}–${end} of ${total}`}
            </p>
            {pageCount > 1 && (
              <p className="tabular-nums">
                Page {page} of {pageCount}
              </p>
            )}
          </div>

          {/* Padding so the floating action bar never hides the last row. */}
          <div className="pb-24">
            <ShiftBulkTable key={tableKey} shifts={rows} />

            {pageCount > 1 && (
              <nav
                aria-label="Shift pages"
                className="mt-6 flex items-center justify-between gap-3"
              >
                <PageLink
                  href={page > 1 ? hrefWith({ page: page - 1 }) : null}
                  rel="prev"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </PageLink>
                <p className="text-xs tabular-nums text-foreground/55">
                  Page {page} of {pageCount}
                </p>
                <PageLink
                  href={page < pageCount ? hrefWith({ page: page + 1 }) : null}
                  rel="next"
                >
                  Next
                  <ChevronRight className="size-4" />
                </PageLink>
              </nav>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PageLink({
  href,
  rel,
  children,
}: {
  href: string | null;
  rel: "prev" | "next";
  children: React.ReactNode;
}) {
  const className =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-semibold transition-colors";
  if (!href) {
    return (
      <span
        aria-disabled
        className={`${className} cursor-not-allowed text-foreground/35`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      rel={rel}
      className={`${className} text-foreground/80 hover:border-leaf/40 hover:text-leaf-deep`}
    >
      {children}
    </Link>
  );
}
