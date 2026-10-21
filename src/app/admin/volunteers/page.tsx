import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { BookingStatus, Role } from "@/generated/prisma";
import { fullName } from "@/lib/users";
import {
  resolveVolunteerQuery,
  audienceFacets,
  type VolunteerQueryParams,
} from "./query";
import { VolunteersFilters } from "./volunteers-filters";
import { VolunteersTable, type VolunteerRow } from "./volunteers-table";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

export const metadata = { title: "Volunteers · Admin" };
export const dynamic = "force-dynamic";

// Same page size as Manage shifts.
const PAGE_SIZE = 50;

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<VolunteerQueryParams & { page?: string }>;
}) {
  const { page: pageParam, ...raw } = await searchParams;
  const resolved = resolveVolunteerQuery(raw);
  const { where, orderBy, programme } = resolved;

  const programmes = await db.program.findMany({
    orderBy: [{ visibility: "asc" }, { title: "asc" }],
    select: { slug: true, title: true },
  });
  const programmeTitle =
    programme === "all"
      ? null
      : (programmes.find((p) => p.slug === programme)?.title ?? programme);

  // Status-facet counts honour the *other* active facets (programme / booking /
  // search) but not the status itself, so each segment shows how many of the
  // current audience fall into it. Reusing resolveVolunteerQuery keeps the
  // count predicates identical to what the table renders.
  const countFor = (filter: string) =>
    db.user.count({ where: resolveVolunteerQuery({ ...raw, filter }).where });

  const total = await db.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRaw = Number.parseInt(pageParam ?? "1", 10);
  const page = Math.min(
    Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    pageCount,
  );

  const [users, countAll, countFlagged, countPending, countAdmins] =
    await Promise.all([
      db.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          _count: {
            select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
          },
          bookings: {
            where: { shift: { cancelled: false } },
            orderBy: { createdAt: "desc" },
            select: {
              createdAt: true,
              shift: {
                select: { program: { select: { slug: true, title: true } } },
              },
            },
          },
        },
      }),
      countFor("all"),
      countFor("flagged"),
      countFor("pending"),
      countFor("admins"),
    ]);

  const rows: VolunteerRow[] = users.map((u) => {
    const programmeMap = new Map<string, { slug: string; title: string }>();
    for (const b of u.bookings) {
      const p = b.shift.program;
      if (!programmeMap.has(p.slug)) programmeMap.set(p.slug, p);
    }
    return {
      id: u.id,
      name: fullName(u),
      email: u.email,
      phone: u.phone,
      isAdmin: u.role === Role.ADMIN,
      profileComplete: u.profileCompletedAt !== null,
      flagged: !!(u.arrestHistory || u.healthConditions),
      confirmedCount: u._count.bookings,
      lastActive: u.bookings[0] ? NZ_DATE.format(u.bookings[0].createdAt) : null,
      joined: NZ_DATE.format(u.createdAt),
      programmes: [...programmeMap.values()],
    };
  });

  const facets = audienceFacets(resolved, programmeTitle);

  // Carry the active audience through to the CSV route verbatim.
  const exportParams = new URLSearchParams();
  if (resolved.search) exportParams.set("q", resolved.search);
  if (resolved.filter !== "all") exportParams.set("filter", resolved.filter);
  if (resolved.sort !== "recent") exportParams.set("sort", resolved.sort);
  if (resolved.programme !== "all")
    exportParams.set("programme", resolved.programme);
  if (resolved.scope !== "all") exportParams.set("scope", resolved.scope);
  const exportQs = exportParams.toString();
  const exportAllHref = `/admin/volunteers/export${exportQs ? `?${exportQs}` : ""}`;

  // Pagination links keep every filter and only swap the page.
  const pageHref = (n: number) => {
    const qs = new URLSearchParams(exportParams);
    if (n > 1) qs.set("page", String(n));
    const str = qs.toString();
    return `/admin/volunteers${str ? `?${str}` : ""}`;
  };
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = (page - 1) * PAGE_SIZE + rows.length;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <AdminPageHeader
          eyebrow="Volunteers"
          title="Find & export volunteers"
          description="Filter to the people you need, then copy their emails or export a CSV. Tick rows to pull a hand-picked group."
        />

        <VolunteersFilters
          programmes={programmes}
          counts={{
            all: countAll,
            flagged: countFlagged,
            pending: countPending,
            admins: countAdmins,
          }}
        />

        {/* Padding so the floating selection bar never hides the pager. */}
        <div className="pb-24">
          <VolunteersTable
            key={`${exportQs}|${page}`}
            rows={rows}
            total={total}
            rangeLabel={
              pageCount > 1 ? `Showing ${start}–${end} of ${total}` : null
            }
            facets={facets}
            audience={{
              q: resolved.search || undefined,
              filter: resolved.filter,
              sort: resolved.sort,
              programme: resolved.programme,
              scope: resolved.scope,
            }}
            exportAllHref={exportAllHref}
          />

          {pageCount > 1 && (
            <nav
              aria-label="Volunteer pages"
              className="mt-6 flex items-center justify-between gap-3"
            >
              <PageLink
                href={page > 1 ? pageHref(page - 1) : null}
                rel="prev"
              >
                <ChevronLeft aria-hidden className="size-4" />
                Previous
              </PageLink>
              <p className="text-xs tabular-nums text-foreground/70">
                Page {page} of {pageCount}
              </p>
              <PageLink
                href={page < pageCount ? pageHref(page + 1) : null}
                rel="next"
              >
                Next
                <ChevronRight aria-hidden className="size-4" />
              </PageLink>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

// Mirrors the pager on Manage shifts.
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
    "inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-semibold transition-colors";
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
      className={`${className} text-foreground/85 hover:border-leaf/40 hover:text-leaf-deep`}
    >
      {children}
    </Link>
  );
}
