import Link from "next/link";
import { Search, Users, ShieldAlert, UserCheck } from "lucide-react";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Prisma, BookingStatus, Role } from "@/generated/prisma";
import { fullName } from "@/lib/users";

export const metadata = { title: "Volunteers · Admin" };
export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "complete", label: "Profile complete" },
  { key: "pending", label: "Profile pending" },
  { key: "flagged", label: "Flagged" },
  { key: "admins", label: "Admins" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const SORTS = [
  { key: "recent", label: "Newest" },
  { key: "name", label: "Name (A–Z)" },
  { key: "active", label: "Most active" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function isFilter(v: string | undefined): v is FilterKey {
  return !!v && FILTERS.some((f) => f.key === v);
}
function isSort(v: string | undefined): v is SortKey {
  return !!v && SORTS.some((s) => s.key === v);
}

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string }>;
}) {
  const { q = "", filter: rawFilter, sort: rawSort } = await searchParams;
  const filter: FilterKey = isFilter(rawFilter) ? rawFilter : "all";
  const sort: SortKey = isSort(rawSort) ? rawSort : "recent";
  const search = q.trim();

  const where: Prisma.UserWhereInput = {};
  const conditions: Prisma.UserWhereInput[] = [];

  if (search) {
    const or: Prisma.UserWhereInput[] = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
    // A full-name query like "John Smith" matches neither column alone now
    // that the name is split, so also try first token → firstName and the
    // remainder → lastName.
    const [first, ...rest] = search.split(/\s+/);
    if (first && rest.length > 0) {
      or.push({
        AND: [
          { firstName: { contains: first, mode: "insensitive" } },
          { lastName: { contains: rest.join(" "), mode: "insensitive" } },
        ],
      });
    }
    conditions.push({ OR: or });
  }
  if (filter === "complete") conditions.push({ profileCompletedAt: { not: null } });
  if (filter === "pending") conditions.push({ profileCompletedAt: null });
  if (filter === "flagged")
    conditions.push({ OR: [{ arrestHistory: true }, { healthConditions: true }] });
  if (filter === "admins") conditions.push({ role: Role.ADMIN });
  if (conditions.length) where.AND = conditions;

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    sort === "name"
      ? [{ firstName: "asc" }, { lastName: "asc" }]
      : sort === "active"
        ? [{ bookings: { _count: "desc" } }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const [users, totals] = await Promise.all([
    db.user.findMany({
      where,
      orderBy,
      take: 200,
      include: {
        _count: {
          select: {
            bookings: { where: { status: BookingStatus.CONFIRMED } },
          },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, status: true },
        },
      },
    }),
    db.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
  ]);

  const totalAll = totals.reduce((s, t) => s + t._count._all, 0);
  const totalAdmins =
    totals.find((t) => t.role === Role.ADMIN)?._count._all ?? 0;
  const totalVolunteers = totalAll - totalAdmins;

  const completeCount = await db.user.count({
    where: { profileCompletedAt: { not: null }, role: Role.VOLUNTEER },
  });
  const flaggedCount = await db.user.count({
    where: { OR: [{ arrestHistory: true }, { healthConditions: true }] },
  });

  const buildHref = (next: { filter?: FilterKey; sort?: SortKey }) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const f = next.filter ?? filter;
    const s = next.sort ?? sort;
    if (f !== "all") params.set("filter", f);
    if (s !== "recent") params.set("sort", s);
    const qs = params.toString();
    return `/admin/volunteers${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Volunteers</p>
            <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Everyone signed up
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-foreground/70">
              Search, sort, and open a profile to add private notes or change
              someone&rsquo;s admin access.
            </p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat
            icon={Users}
            label="Volunteers"
            value={totalVolunteers}
            hint={`${totalAdmins} admin${totalAdmins === 1 ? "" : "s"}`}
          />
          <Stat
            icon={UserCheck}
            label="Profile complete"
            value={completeCount}
            hint={
              totalVolunteers > 0
                ? `${Math.round((completeCount / totalVolunteers) * 100)}% of volunteers`
                : "—"
            }
          />
          <Stat
            icon={ShieldAlert}
            label="Flagged"
            value={flaggedCount}
            hint={flaggedCount > 0 ? "See needs-review" : "Nothing to review"}
          />
          <Stat
            label="Showing"
            value={users.length}
            hint={users.length >= 200 ? "Capped at 200 — refine search" : "matching this view"}
          />
        </div>

        <section className="mt-10">
          <form
            action="/admin/volunteers"
            method="get"
            className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            {/* preserve current filter/sort when submitting search */}
            {filter !== "all" && (
              <input type="hidden" name="filter" value={filter} />
            )}
            {sort !== "recent" && (
              <input type="hidden" name="sort" value={sort} />
            )}
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/50" />
              <Input
                type="search"
                name="q"
                defaultValue={search}
                placeholder="Search by name or email"
                className="h-10 pl-9"
                aria-label="Search volunteers"
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="vol-sort"
                className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
              >
                Sort
              </label>
              <select
                id="vol-sort"
                name="sort"
                defaultValue={sort}
                className="h-10 rounded-md border border-border bg-background px-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-md bg-foreground/5 px-3 text-sm font-semibold hover:bg-foreground/10"
              >
                Apply
              </button>
              {(search || filter !== "all" || sort !== "recent") && (
                <Link
                  href="/admin/volunteers"
                  className="text-xs text-foreground/55 hover:text-foreground"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          <nav
            aria-label="Filter volunteers"
            className="mt-4 flex flex-wrap gap-2"
          >
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Link
                  key={f.key}
                  href={buildHref({ filter: f.key })}
                  className={
                    "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors " +
                    (active
                      ? "border-leaf bg-leaf text-cream"
                      : "border-border bg-card text-foreground/75 hover:border-leaf/40 hover:text-leaf-deep")
                  }
                >
                  {f.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 overflow-hidden rounded-md border border-border bg-card">
            {users.length === 0 ? (
              <div className="p-10 text-center text-sm text-foreground/65">
                No volunteers match this view.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-cream-deep text-left text-foreground/65">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                      Name
                    </th>
                    <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-widest md:table-cell">
                      Contact
                    </th>
                    <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-widest sm:table-cell">
                      Joined
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                      Bookings
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest">
                      Last active
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isAdmin = u.role === Role.ADMIN;
                    const flagged = u.arrestHistory || u.healthConditions;
                    const profileDone = u.profileCompletedAt !== null;
                    const lastBooking = u.bookings[0];
                    return (
                      <tr
                        key={u.id}
                        className="border-t border-border transition-colors hover:bg-cream-deep/40"
                      >
                        <td className="max-w-[16rem] px-4 py-3 align-top">
                          <Link
                            href={`/admin/volunteers/${u.id}`}
                            className="group flex flex-col gap-1"
                          >
                            <span className="font-semibold break-words group-hover:text-leaf-deep">
                              {fullName(u)}
                            </span>
                            <span className="flex flex-wrap items-center gap-1">
                              {isAdmin && <Pill tone="leaf">Admin</Pill>}
                              {!profileDone && (
                                <Pill tone="muted">Profile pending</Pill>
                              )}
                              {flagged && <Pill tone="tomato">Flagged</Pill>}
                            </span>
                          </Link>
                        </td>
                        <td className="hidden max-w-[18rem] px-4 py-3 align-top text-foreground/75 md:table-cell">
                          <div className="truncate">{u.email}</div>
                          {u.phone && (
                            <div className="text-xs text-foreground/55">
                              {u.phone}
                            </div>
                          )}
                        </td>
                        <td className="hidden px-4 py-3 align-top whitespace-nowrap text-foreground/75 sm:table-cell">
                          {NZ_DATE.format(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <span className="font-semibold">
                            {u._count.bookings}
                          </span>
                          <span className="ml-1 text-xs text-foreground/55">
                            confirmed
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap text-foreground/75">
                          {lastBooking
                            ? NZ_DATE.format(lastBooking.createdAt)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/volunteers/${u.id}`}
                            className="font-semibold text-leaf-deep hover:underline"
                            aria-label={`Open ${fullName(u)}`}
                          >
                            Open →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="size-3.5 text-foreground/55" />}
        <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
          {label}
        </p>
      </div>
      <p className="display mt-2 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-foreground/55">{hint}</p>}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "leaf" | "tomato" | "muted";
  children: React.ReactNode;
}) {
  const palette = {
    leaf: "bg-leaf/15 text-leaf-deep",
    tomato: "bg-tomato/15 text-tomato",
    muted: "bg-foreground/10 text-foreground/65",
  }[tone];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${palette}`}
    >
      {children}
    </span>
  );
}
