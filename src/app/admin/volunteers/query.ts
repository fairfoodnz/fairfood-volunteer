import { Prisma, BookingStatus, Role } from "@/generated/prisma";

// Shared between the volunteers list page and the CSV export route so both apply
// identical search / filter / programme / booking-scope rules. Keep the option
// arrays here as the single source of truth for the UI controls.

export const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "complete", label: "Profile complete" },
  { key: "pending", label: "Profile pending" },
  { key: "flagged", label: "Flagged" },
  { key: "admins", label: "Admins" },
] as const;

export type FilterKey = (typeof FILTERS)[number]["key"];

export const SORTS = [
  { key: "recent", label: "Newest" },
  { key: "name", label: "Name (A–Z)" },
  { key: "active", label: "Most active" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

// Booking-scope narrows to people with a booking matching a status window.
// Combined with `programme`, this is how a coordinator pulls e.g. "everyone with
// an upcoming confirmed Conscious Kitchen booking". "all" adds no status
// constraint (so programme=all + scope=all means literally everyone).
export const SCOPES = [
  { key: "all", label: "Any booking status" },
  { key: "confirmed", label: "Confirmed only" },
  { key: "upcoming", label: "Upcoming confirmed" },
] as const;

export type ScopeKey = (typeof SCOPES)[number]["key"];

export function isFilter(v: string | undefined): v is FilterKey {
  return !!v && FILTERS.some((f) => f.key === v);
}
export function isSort(v: string | undefined): v is SortKey {
  return !!v && SORTS.some((s) => s.key === v);
}
export function isScope(v: string | undefined): v is ScopeKey {
  return !!v && SCOPES.some((s) => s.key === v);
}

export type VolunteerQueryParams = {
  q?: string;
  filter?: string;
  sort?: string;
  programme?: string;
  scope?: string;
};

export type ResolvedVolunteerQuery = {
  search: string;
  filter: FilterKey;
  sort: SortKey;
  programme: string; // "all" or a Program.slug
  scope: ScopeKey;
  where: Prisma.UserWhereInput;
  orderBy: Prisma.UserOrderByWithRelationInput[];
};

export function resolveVolunteerQuery(
  raw: VolunteerQueryParams,
): ResolvedVolunteerQuery {
  const filter: FilterKey = isFilter(raw.filter) ? raw.filter : "all";
  const sort: SortKey = isSort(raw.sort) ? raw.sort : "recent";
  const scope: ScopeKey = isScope(raw.scope) ? raw.scope : "all";
  const programme = raw.programme?.trim() ? raw.programme.trim() : "all";
  const search = (raw.q ?? "").trim();

  const conditions: Prisma.UserWhereInput[] = [];

  if (search) {
    const or: Prisma.UserWhereInput[] = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
    // A full-name query like "John Smith" matches neither column alone now that
    // the name is split, so also try first token → firstName, remainder → last.
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

  const some = bookingScopeFilter(programme, scope);
  if (some) conditions.push({ bookings: { some } });

  const where: Prisma.UserWhereInput = conditions.length ? { AND: conditions } : {};

  const orderBy: Prisma.UserOrderByWithRelationInput[] =
    sort === "name"
      ? [{ firstName: "asc" }, { lastName: "asc" }]
      : sort === "active"
        ? [{ bookings: { _count: "desc" } }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  return { search, filter, sort, programme, scope, where, orderBy };
}

/**
 * Plain-language description of the active audience, shown above the table and
 * used to label the export (e.g. "Conscious Kitchen · confirmed bookings").
 * Returns an empty array when no facet narrows the list (i.e. "All volunteers").
 */
export function audienceFacets(
  r: Pick<ResolvedVolunteerQuery, "programme" | "scope" | "filter" | "search">,
  programmeTitle: string | null,
): string[] {
  const facets: string[] = [];
  if (r.programme !== "all") facets.push(programmeTitle ?? r.programme);
  if (r.scope === "confirmed") facets.push("confirmed bookings");
  if (r.scope === "upcoming") facets.push("upcoming confirmed");
  if (r.filter === "flagged") facets.push("needs review");
  if (r.filter === "pending") facets.push("profile pending");
  if (r.filter === "complete") facets.push("profile complete");
  if (r.filter === "admins") facets.push("admins");
  if (r.search) facets.push(`matching “${r.search}”`);
  return facets;
}

function bookingScopeFilter(
  programme: string,
  scope: ScopeKey,
): Prisma.BookingWhereInput | null {
  if (programme === "all" && scope === "all") return null;

  const some: Prisma.BookingWhereInput = {};
  const shift: Prisma.ShiftWhereInput = {};

  if (programme !== "all") shift.program = { slug: programme };

  if (scope === "confirmed" || scope === "upcoming") {
    some.status = BookingStatus.CONFIRMED;
    shift.cancelled = false;
  }
  // `new Date()` is the server's UTC "now", which is correct for the
  // UTC-stored shift times. This resolver must therefore only run server-side
  // (Server Component / route handler) — never at build time or on the client.
  if (scope === "upcoming") shift.startsAt = { gte: new Date() };

  if (Object.keys(shift).length) some.shift = shift;
  return some;
}
