import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatShiftRange } from "@/lib/programs";
import { sumBlocks } from "@/lib/shifts";
import { BookingStatus, Prisma } from "@/generated/prisma";
import {
  ShiftBulkTable,
  type ShiftRow,
} from "@/components/admin/shift-bulk-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { countOf } from "@/lib/format";
import { ShiftsToolbar } from "./shifts-toolbar";
import { RANGES, type RangeKey } from "./ranges";

export const metadata = { title: "Manage shifts · Admin" };
export const dynamic = "force-dynamic";

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
  await requireAdmin();
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
      orderBy: [{ visibility: "asc" }, { order: "asc" }],
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
          program: { select: { title: true, visibility: true } },
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
    programmeVisibility: s.program.visibility,
    capacity: s.capacity,
    confirmed: s._count.bookings,
    blockedSlots: sumBlocks(s.blocks),
    cancelled: s.cancelled,
  }));

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
        <AdminPageHeader
          eyebrow="Rosters"
          title="Manage shifts"
          description="Select shifts to cancel, restore or delete them together. Open a roster to mark attendance."
          actions={
            <>
              <Button asChild variant="outline">
                <Link href="/admin/shifts/bulk">Bulk schedule</Link>
              </Button>
              <Button asChild className="bg-leaf-deep hover:bg-leaf-ink">
                <Link href="/admin/shifts/new">+ New shift</Link>
              </Button>
            </>
          }
        />

        <section aria-label="Shifts">
          <ShiftsToolbar
            programmes={programmes}
            range={range}
            programmeId={programmeId}
            from={fromIso}
            to={toIso}
          />

          <div className="mt-5 mb-3 flex items-center justify-between gap-3 text-sm text-foreground/70">
            <p role="status" aria-live="polite">
              {total === 0
                ? "No shifts match this view."
                : total <= PAGE_SIZE
                  ? countOf(total, "shift")
                  : `Showing ${start}–${end} of ${total}`}
            </p>
            {pageCount > 1 && (
              <p className="tabular-nums">
                Page {page} of {pageCount}
              </p>
            )}
          </div>

          {/* Padding so the floating action bar never hides the last row. */}
          <div className="pb-44 sm:pb-24">
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
                <p className="text-sm tabular-nums text-foreground/70">
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
    "inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-semibold transition-colors";
  if (!href) {
    return (
      <span
        aria-disabled
        className={`${className} cursor-not-allowed text-foreground/65`}
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
