// Pure view logic for /admin/flagged: URL params in, grouped rows + headline
// numbers out. The page fetches every flagged volunteer once (a few hundred at
// most) and everything else - view, disclosure type, search, ordering - happens
// here, so the counts on the tabs can never drift from the rows underneath.

export const VIEWS = [
  { key: "todo", label: "To review" },
  { key: "reviewed", label: "Reviewed" },
  { key: "all", label: "Everyone" },
] as const;

export type ViewKey = (typeof VIEWS)[number]["key"];

export const TYPES = [
  { key: "all", label: "Any disclosure" },
  { key: "arrest", label: "Arrest history" },
  { key: "health", label: "Health" },
] as const;

export type TypeKey = (typeof TYPES)[number]["key"];

export type FlaggedQueryParams = { view?: string; type?: string; q?: string };

export type ResolvedFlaggedQuery = {
  view: ViewKey;
  type: TypeKey;
  search: string;
};

export function resolveFlaggedQuery(raw: FlaggedQueryParams): ResolvedFlaggedQuery {
  const view = VIEWS.find((v) => v.key === raw.view)?.key ?? "todo";
  const type = TYPES.find((t) => t.key === raw.type)?.key ?? "all";
  return { view, type, search: (raw.q ?? "").trim() };
}

export type FlaggedPerson = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  arrest: boolean;
  health: boolean;
  flaggedAt: Date;
  reviewedAt: Date | null;
  firstTimer: boolean;
  nextShift: { id: string; startsAt: Date; programme: string } | null;
};

export type FlaggedGroupKey = "booked" | "unbooked" | "reviewed";

export type FlaggedGroup = { key: FlaggedGroupKey; people: FlaggedPerson[] };

export type FlaggedStats = {
  total: number;
  todo: number;
  reviewed: number;
  // Unreviewed *and* holding an upcoming confirmed booking - the people a
  // coordinator actually has a deadline on.
  todoBooked: number;
  nextDeadline: Date | null;
};

export function flaggedStats(people: FlaggedPerson[]): FlaggedStats {
  const todo = people.filter((p) => p.reviewedAt === null);
  const booked = todo.filter((p) => p.nextShift !== null);
  const nextDeadline = booked.reduce<Date | null>(
    (min, p) =>
      min === null || p.nextShift!.startsAt < min ? p.nextShift!.startsAt : min,
    null,
  );
  return {
    total: people.length,
    todo: todo.length,
    reviewed: people.length - todo.length,
    todoBooked: booked.length,
    nextDeadline,
  };
}

function matchesType(p: FlaggedPerson, type: TypeKey) {
  return type === "all" || (type === "arrest" ? p.arrest : p.health);
}

function matchesView(p: FlaggedPerson, view: ViewKey) {
  if (view === "all") return true;
  return view === "todo" ? p.reviewedAt === null : p.reviewedAt !== null;
}

function matchesSearch(p: FlaggedPerson, search: string) {
  if (!search) return true;
  const haystack = `${p.firstName} ${p.lastName ?? ""} ${p.email}`.toLowerCase();
  // Every token must hit, so "john smi" finds John Smith without needing the
  // first/last split the stored name has.
  return search
    .toLowerCase()
    .split(/\s+/)
    .every((token) => haystack.includes(token));
}

/** Rows per view, honouring type + search - what the tab counts show. */
export function viewCounts(
  people: FlaggedPerson[],
  q: Pick<ResolvedFlaggedQuery, "type" | "search">,
): Record<ViewKey, number> {
  const pool = people.filter(
    (p) => matchesType(p, q.type) && matchesSearch(p, q.search),
  );
  return {
    todo: pool.filter((p) => matchesView(p, "todo")).length,
    reviewed: pool.filter((p) => matchesView(p, "reviewed")).length,
    all: pool.length,
  };
}

/**
 * The ordered, grouped list for the current view. Unreviewed people with a
 * shift coming up lead, soonest shift first - that's the order the chats need
 * to happen in. Then unreviewed with nothing booked (newest flag first), then
 * anyone already reviewed (most recently reviewed first). Empty groups are
 * dropped.
 */
export function groupFlagged(
  people: FlaggedPerson[],
  q: ResolvedFlaggedQuery,
): FlaggedGroup[] {
  const pool = people.filter(
    (p) =>
      matchesView(p, q.view) &&
      matchesType(p, q.type) &&
      matchesSearch(p, q.search),
  );

  const todo = pool.filter((p) => p.reviewedAt === null);
  const booked = todo
    .filter((p) => p.nextShift !== null)
    .sort(
      (a, b) => a.nextShift!.startsAt.getTime() - b.nextShift!.startsAt.getTime(),
    );
  const unbooked = todo
    .filter((p) => p.nextShift === null)
    .sort((a, b) => b.flaggedAt.getTime() - a.flaggedAt.getTime());
  const reviewed = pool
    .filter((p) => p.reviewedAt !== null)
    .sort((a, b) => b.reviewedAt!.getTime() - a.reviewedAt!.getTime());

  const groups: FlaggedGroup[] = [
    { key: "booked", people: booked },
    { key: "unbooked", people: unbooked },
    { key: "reviewed", people: reviewed },
  ];
  return groups.filter((g) => g.people.length > 0);
}

const NZ_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Pacific/Auckland",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Whole NZ calendar days from `from` to `to` (0 = same NZ day, 1 = tomorrow). */
export function nzDaysBetween(from: Date, to: Date): number {
  const dayNumber = (d: Date) => {
    const [y, m, day] = NZ_YMD.format(d).split("-").map(Number);
    return Date.UTC(y, m - 1, day) / 86_400_000;
  };
  return dayNumber(to) - dayNumber(from);
}

/** "Today", "Tomorrow", "In 5 days" - the countdown pill on a booked row. */
export function countdownLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
