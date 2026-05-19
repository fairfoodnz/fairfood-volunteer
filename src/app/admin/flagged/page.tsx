import { db } from "@/lib/db";
import { fullName } from "@/lib/users";
import {
  markFlagReviewedAction,
  clearFlagReviewedAction,
} from "./actions";

export const metadata = { title: "Flagged volunteers · Admin" };
export const dynamic = "force-dynamic";

type FlaggedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  arrestHistory: boolean | null;
  arrestDetails: string | null;
  healthConditions: boolean | null;
  healthDetails: string | null;
  flagReviewedAt: Date | null;
  lastBookingAt: Date | null;
};

export default async function FlaggedPage() {
  // Admin gate is enforced by /admin/layout.tsx via requireAdmin().
  const rows = await db.user.findMany({
    where: {
      OR: [{ arrestHistory: true }, { healthConditions: true }],
    },
    orderBy: [
      // Unreviewed first, then most-recently-flagged first within each group.
      { flagReviewedAt: { sort: "asc", nulls: "first" } },
      { profileCompletedAt: "desc" },
    ],
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const users: FlaggedUser[] = rows.map((u) => ({
    id: u.id,
    name: fullName(u),
    email: u.email,
    phone: u.phone,
    createdAt: u.profileCompletedAt ?? u.createdAt,
    arrestHistory: u.arrestHistory,
    arrestDetails: u.arrestDetails,
    healthConditions: u.healthConditions,
    healthDetails: u.healthDetails,
    flagReviewedAt: u.flagReviewedAt,
    lastBookingAt: u.bookings[0]?.createdAt ?? null,
  }));

  const arrestUsers = users.filter((u) => u.arrestHistory);
  const healthUsers = users.filter((u) => u.healthConditions);

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Volunteers</p>
        <h1 className="display mt-2 text-balance text-3xl font-bold leading-tight md:text-4xl">
          Needs review
        </h1>
        <p className="mt-3 max-w-2xl text-foreground/75">
          These volunteers flagged something on their profile. Have a chat
          before their first shift. Don&rsquo;t share these notes outside the
          coordinator team.
        </p>

        <FlagSection
          label="arrest history"
          empty="Nothing flagged right now."
          users={arrestUsers}
          field="arrest"
        />
        <FlagSection
          label="health conditions"
          empty="Nothing flagged right now."
          users={healthUsers}
          field="health"
        />
      </div>
    </div>
  );
}

function FlagSection({
  label,
  users,
  empty,
  field,
}: {
  label: string;
  users: FlaggedUser[];
  empty: string;
  field: "arrest" | "health";
}) {
  return (
    <section className="mt-12">
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </p>
      <div className="mt-4 space-y-3">
        {users.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-foreground/65">
            {empty}
          </div>
        ) : (
          users.map((u) => <FlaggedCard key={u.id + field} user={u} field={field} />)
        )}
      </div>
    </section>
  );
}

function FlaggedCard({ user, field }: { user: FlaggedUser; field: "arrest" | "health" }) {
  const notes = field === "arrest" ? user.arrestDetails : user.healthDetails;
  const reviewed = user.flagReviewedAt !== null;
  const firstInitial = lastInitial(user.name);
  const joinedFmt = formatDateNZ(user.createdAt);
  const lastBookedFmt = user.lastBookingAt
    ? formatDateNZ(user.lastBookingAt)
    : null;

  return (
    <details
      className={
        "group rounded-md border border-border bg-card p-5 transition-colors open:border-leaf/40 " +
        (reviewed ? "opacity-70" : "")
      }
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="font-semibold">
            <span className="group-open:hidden">{firstInitial}</span>
            <span className="hidden group-open:inline">{user.name}</span>
            {reviewed && (
              <span className="ml-2 rounded-full bg-leaf/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-leaf-deep">
                Reviewed
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-foreground/65">
            Joined {joinedFmt}
            {lastBookedFmt && <> · Last booked {lastBookedFmt}</>}
          </p>
        </div>
        <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded border border-border bg-card px-3 text-xs font-semibold text-foreground/80 transition-colors group-hover:border-leaf/40 group-hover:text-leaf-deep">
          <span className="group-open:hidden">Reveal notes ▾</span>
          <span className="hidden group-open:inline">Hide notes ▴</span>
        </span>
      </summary>
      <div className="mt-5 space-y-4 border-t border-border pt-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
              Email
            </dt>
            <dd className="mt-1 text-sm">{user.email}</dd>
          </div>
          {user.phone && (
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                Phone
              </dt>
              <dd className="mt-1 text-sm">{user.phone}</dd>
            </div>
          )}
        </dl>
        <div className="rounded-md bg-cream-deep p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
            What they shared
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">
            {notes && notes.trim().length > 0
              ? notes
              : "Answered yes but left the details blank — worth following up."}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-foreground/55">
            {reviewed
              ? `Reviewed ${formatDateNZ(user.flagReviewedAt!)}.`
              : "Mark as reviewed once you've spoken with them."}
          </p>
          <form
            action={reviewed ? clearFlagReviewedAction : markFlagReviewedAction}
          >
            <input type="hidden" name="userId" value={user.id} />
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded border border-border bg-card px-3 text-xs font-semibold text-foreground/80 transition-colors hover:border-leaf hover:text-leaf-deep"
            >
              {reviewed ? "Mark as unreviewed" : "Mark as reviewed"}
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

function lastInitial(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

function formatDateNZ(d: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Pacific/Auckland",
  }).format(d);
}
