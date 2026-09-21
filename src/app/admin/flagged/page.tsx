import Link from "next/link";
import { db } from "@/lib/db";
import { BookingStatus } from "@/generated/prisma";
import { initials, isFirstTimer, type PersonName } from "@/lib/users";
import { cn } from "@/lib/utils";
import {
  countdownLabel,
  flaggedStats,
  groupFlagged,
  nzDaysBetween,
  resolveFlaggedQuery,
  viewCounts,
  type FlaggedGroupKey,
  type FlaggedPerson,
  type FlaggedQueryParams,
  type FlaggedStats,
  type ResolvedFlaggedQuery,
} from "./query";
import { FlaggedToolbar } from "./flagged-toolbar";
import { FlaggedRow, type FlaggedRowData } from "./flagged-row";

export const metadata = { title: "Needs review · Admin" };
export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

const NZ_SHIFT = new Intl.DateTimeFormat("en-NZ", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Pacific/Auckland",
});

const NZ_DAY = new Intl.DateTimeFormat("en-NZ", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Pacific/Auckland",
});

const GROUP_COPY: Record<FlaggedGroupKey, { title: string; hint: string }> = {
  booked: {
    title: "Shift coming up",
    hint: "Soonest first - chat with these people before they turn up.",
  },
  unbooked: {
    title: "Nothing booked yet",
    hint: "No deadline. Newest flags first.",
  },
  reviewed: {
    title: "Reviewed",
    hint: "Most recently reviewed first.",
  },
};

export default async function FlaggedPage({
  searchParams,
}: {
  searchParams: Promise<FlaggedQueryParams>;
}) {
  // Admin gate is enforced by /admin/layout.tsx via requireAdmin().
  const query = resolveFlaggedQuery(await searchParams);
  const now = new Date();

  // Deliberately no arrestDetails / healthDetails / phone here - the row
  // fetches those through revealFlagAction when a coordinator asks.
  const rows = await db.user.findMany({
    where: { OR: [{ arrestHistory: true }, { healthConditions: true }] },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      arrestHistory: true,
      healthConditions: true,
      volunteeredBefore: true,
      profileCompletedAt: true,
      createdAt: true,
      flagReviewedAt: true,
      _count: {
        select: { bookings: { where: { status: BookingStatus.ATTENDED } } },
      },
      bookings: {
        where: {
          status: BookingStatus.CONFIRMED,
          shift: { cancelled: false, startsAt: { gte: now } },
        },
        orderBy: { shift: { startsAt: "asc" } },
        take: 1,
        select: {
          shift: {
            select: {
              id: true,
              startsAt: true,
              program: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  const people: FlaggedPerson[] = rows.map((u) => {
    const shift = u.bookings[0]?.shift ?? null;
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      arrest: u.arrestHistory === true,
      health: u.healthConditions === true,
      flaggedAt: u.profileCompletedAt ?? u.createdAt,
      reviewedAt: u.flagReviewedAt,
      firstTimer: isFirstTimer({
        volunteeredBefore: u.volunteeredBefore,
        attendedCount: u._count.bookings,
      }),
      nextShift: shift && {
        id: shift.id,
        startsAt: shift.startsAt,
        programme: shift.program.title,
      },
    };
  });

  const stats = flaggedStats(people);
  const counts = viewCounts(people, query);
  const groups = groupFlagged(people, query);

  const toRow = (p: FlaggedPerson): FlaggedRowData => {
    const days = p.nextShift ? nzDaysBetween(now, p.nextShift.startsAt) : null;
    return {
      id: p.id,
      shortName: shortName(p),
      initials: initials(p),
      arrest: p.arrest,
      health: p.health,
      firstTimer: p.firstTimer,
      flaggedLabel: NZ_DATE.format(p.flaggedAt),
      reviewedLabel: p.reviewedAt ? NZ_DATE.format(p.reviewedAt) : null,
      nextShift:
        p.nextShift && days !== null
          ? {
              id: p.nextShift.id,
              whenLabel: NZ_SHIFT.format(p.nextShift.startsAt),
              programme: p.nextShift.programme,
              countdown: countdownLabel(days),
              imminent: days <= 1,
            }
          : null,
    };
  };

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="eyebrow">Volunteers</p>
          <h1 className="display mt-2 text-balance text-3xl font-bold leading-tight md:text-4xl">
            Needs review
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-foreground/70">
            These volunteers flagged something on their profile. Have a chat
            before their first shift, then mark them as reviewed. Don&rsquo;t
            share these notes outside the coordinator team.
          </p>
        </header>

        <Summary stats={stats} now={now} />

        <div className="mt-10">
          <FlaggedToolbar counts={counts} />
        </div>

        <div className="mt-6 space-y-8">
          {groups.length === 0 ? (
            <EmptyState query={query} stats={stats} />
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-labelledby={`group-${group.key}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
                  <h2
                    id={`group-${group.key}`}
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block size-1.5 rounded-full",
                        group.key === "booked" ? "bg-leaf" : "bg-foreground/25",
                      )}
                    />
                    {GROUP_COPY[group.key].title}
                    <span className="font-mono text-xs font-normal tabular-nums text-foreground/55">
                      {group.people.length}
                    </span>
                  </h2>
                  <p className="text-xs text-foreground/55">
                    {GROUP_COPY[group.key].hint}
                  </p>
                </div>
                <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  {group.people.map((p) => (
                    <FlaggedRow key={p.id} person={toRow(p)} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Summary({ stats, now }: { stats: FlaggedStats; now: Date }) {
  const percent =
    stats.total === 0 ? 100 : Math.round((stats.reviewed / stats.total) * 100);
  const deadlineDays = stats.nextDeadline
    ? nzDaysBetween(now, stats.nextDeadline)
    : null;

  return (
    <section
      aria-label="Review progress"
      className="relative mt-8 overflow-hidden rounded-xl bg-forest text-cream shadow-sm"
    >
      {/* Seed-packet dot grid - texture, not a gradient. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]"
      />
      <div className="relative grid grid-cols-2 md:grid-cols-[1.1fr_1fr_1.2fr] md:divide-x md:divide-cream/10">
        <div className="col-span-2 border-b border-cream/10 p-5 md:col-span-1 md:border-b-0 md:p-7">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cream/60">
            Waiting for a chat
          </p>
          <p className="display mt-3 text-5xl leading-none tabular-nums md:text-7xl">
            {stats.todo}
          </p>
          <p className="mt-3 text-sm text-cream/70">
            {stats.todo === 0
              ? "Everyone has been reviewed."
              : stats.todo === 1
                ? "volunteer still to review"
                : "volunteers still to review"}
          </p>
        </div>

        <div className="border-r border-cream/10 p-5 md:border-r-0 md:p-7">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cream/60">
            With a shift coming up
          </p>
          <p className="display mt-3 text-3xl leading-none tabular-nums md:text-5xl">
            {stats.todoBooked}
          </p>
          <p className="mt-3 text-sm text-cream/70">
            {stats.nextDeadline && deadlineDays !== null ? (
              <>
                Next one is{" "}
                <span className="font-semibold text-cream">
                  {countdownLabel(deadlineDays).toLowerCase()}
                </span>{" "}
                · {NZ_DAY.format(stats.nextDeadline)}
              </>
            ) : (
              "No one unreviewed is booked in."
            )}
          </p>
        </div>

        <div className="p-5 md:p-7">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cream/60">
            Reviewed so far
          </p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="display text-3xl leading-none tabular-nums md:text-5xl">
              {stats.reviewed}
            </span>
            <span className="text-sm tabular-nums text-cream/60">
              of {stats.total}
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="Flagged volunteers reviewed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-cream/15"
          >
            <div
              className="h-full rounded-full bg-leaf"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/60">
            {percent}% done
          </p>
        </div>
      </div>
    </section>
  );
}

function EmptyState({
  query,
  stats,
}: {
  query: ResolvedFlaggedQuery;
  stats: FlaggedStats;
}) {
  const filtered = query.search !== "" || query.type !== "all";
  const viewHref = query.view === "todo" ? "/admin/flagged" : `/admin/flagged?view=${query.view}`;

  let message: React.ReactNode;
  if (filtered) {
    message = (
      <>
        No one matches those filters.{" "}
        <Link
          href={viewHref}
          className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          Clear filters →
        </Link>
      </>
    );
  } else if (query.view === "todo" && stats.total > 0) {
    message = (
      <>
        All caught up - everyone who flagged something has been reviewed.{" "}
        <Link
          href="/admin/flagged?view=reviewed"
          className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          See who&rsquo;s been reviewed →
        </Link>
      </>
    );
  } else if (query.view === "reviewed" && stats.total > 0) {
    message = (
      <>
        No one has been reviewed yet.{" "}
        <Link
          href="/admin/flagged"
          className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
        >
          Start with who&rsquo;s waiting →
        </Link>
      </>
    );
  } else {
    message = "Nothing flagged right now.";
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-foreground/70">
      {message}
    </div>
  );
}

// Abbreviated form for the collapsed row: first name + last initial.
// Reads lastName directly so compound names ("Ariana Te Whata" → "Ariana T.")
// stay correct rather than re-splitting an assembled string.
function shortName(person: PersonName) {
  const lastInit = person.lastName?.charAt(0).toUpperCase();
  return lastInit ? `${person.firstName} ${lastInit}.` : person.firstName;
}
