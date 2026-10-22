import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatShiftRange } from "@/lib/programs";
import { fullName } from "@/lib/users";
import { countOf } from "@/lib/format";
import { ImpersonateForm } from "@/components/admin/impersonate-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusPill, type PillTone } from "@/components/patterns/status-pill";
import { BookingStatus, EmailLogStatus, Role } from "@/generated/prisma";
import { RetryEmailButton } from "@/components/admin/retry-email-button";
import { NotesForm } from "./notes-form";
import { RoleForm } from "./role-form";
import { FlagNote } from "./flag-note";
import {
  EMAIL_STATUS_BADGE,
  EMAIL_TEMPLATE_LABELS,
  formatEmailTimestamp,
  isRetryableTemplate,
} from "@/lib/email-display";

// Cap how many EmailLog rows we render inline on the detail page. Old rows
// still exist; this is a soft "recent activity" view, not a complete archive
// (we don't link to an archive yet — surface that if the cap ever bites).
const EMAIL_LOG_LIMIT = 50;

export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

const HEARD_ABOUT_LABELS: Record<string, string> = {
  FRIEND: "From a friend or family",
  SOCIAL: "Social media",
  SEARCH: "Search engine",
  WORKPLACE: "Workplace",
  EVENT: "Community event",
  OTHER: "Other",
};

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  // Next calls generateMetadata independently of the page component, so the
  // page's own requireAdmin() doesn't gate this DB query. Guard it explicitly
  // — match the rest of /admin where every server read is admin-gated.
  await requireAdmin();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  return {
    title: user ? `${fullName(user)} · Admin` : "Volunteer · Admin",
  };
}

export default async function VolunteerDetailPage({ params }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        include: { shift: { include: { program: true } } },
      },
    },
  });
  if (!user) notFound();

  // Don't pull `bodyHtml` / `bodyText` here — those are 5–20KB each and only
  // needed on the standalone email page. The list view just needs metadata.
  const emails = await db.emailLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: EMAIL_LOG_LIMIT,
    select: {
      id: true,
      subject: true,
      template: true,
      status: true,
      createdAt: true,
      error: true,
    },
  });

  const isSelf = user.id === admin.id;
  const isAdminUser = user.role === Role.ADMIN;
  const flagged = user.arrestHistory || user.healthConditions;
  // Deep-link straight to this person in the queue, reviewed or not.
  const flagQueueHref = `/admin/flagged?${new URLSearchParams({
    view: "all",
    q: user.email,
  })}`;
  const now = new Date();

  const upcoming = user.bookings.filter(
    (b) =>
      b.shift.startsAt >= now &&
      (b.status === BookingStatus.CONFIRMED ||
        b.status === BookingStatus.ATTENDED),
  );
  const past = user.bookings.filter(
    (b) =>
      b.shift.startsAt < now ||
      b.status === BookingStatus.CANCELLED ||
      b.status === BookingStatus.NO_SHOW,
  );

  const confirmedCount = user.bookings.filter(
    (b) => b.status === BookingStatus.CONFIRMED,
  ).length;
  const attendedCount = user.bookings.filter(
    (b) => b.status === BookingStatus.ATTENDED,
  ).length;
  const noShowCount = user.bookings.filter(
    (b) => b.status === BookingStatus.NO_SHOW,
  ).length;
  const cancelledCount = user.bookings.filter(
    (b) => b.status === BookingStatus.CANCELLED,
  ).length;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          back={{ href: "/admin/volunteers", label: "All volunteers" }}
          eyebrow="Volunteers"
          title={
            <span className="flex flex-wrap items-center gap-3">
              {fullName(user)}
              {isAdminUser && <StatusPill tone="positive">Admin</StatusPill>}
            </span>
          }
          description={
            <>
              <span className="block">
                {user.email}
                {user.phone && <> · {user.phone}</>}
                {user.pronouns && <> · {user.pronouns}</>}
              </span>
              <span className="mt-1 block text-xs">
                Joined {NZ_DATE.format(user.createdAt)}
                {user.profileCompletedAt
                  ? ` · Profile completed ${NZ_DATE.format(user.profileCompletedAt)}`
                  : " · Profile pending"}
              </span>
            </>
          }
          actions={
            flagged ? (
              <Link
                href={flagQueueHref}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground/85 hover:border-leaf/50 hover:text-leaf-deep"
              >
                Review flags →
              </Link>
            ) : null
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <StatTile label="Confirmed" value={confirmedCount} />
          <StatTile label="Attended" value={attendedCount} />
          <StatTile label="No-shows" value={noShowCount} />
          <StatTile label="Cancelled" value={cancelledCount} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Section title="Profile">
              {!user.profileCompletedAt ? (
                <EmptyState>
                  Hasn&rsquo;t finished the questionnaire yet. They can&rsquo;t
                  book shifts until they do.
                </EmptyState>
              ) : (
                <div className="rounded-md border border-border bg-card p-5">
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <Field label="Birthday">
                      {user.birthday ? NZ_DATE.format(user.birthday) : "—"}
                    </Field>
                    <Field label="Volunteered before">
                      {user.volunteeredBefore === null
                        ? "Not asked"
                        : user.volunteeredBefore
                          ? "Yes — volunteered with us before signing up"
                          : attendedCount > 0
                            ? `No — has since done ${countOf(attendedCount, "shift")}`
                            : "No — first-timer"}
                    </Field>
                    <Field label="Heard about us">
                      {user.heardAbout
                        ? HEARD_ABOUT_LABELS[user.heardAbout] ?? user.heardAbout
                        : "—"}
                      {user.heardAboutOther && (
                        <span className="block text-xs text-foreground/65">
                          {user.heardAboutOther}
                        </span>
                      )}
                    </Field>
                    <Field label="Emergency contact">
                      {user.emergencyName ? (
                        <>
                          {user.emergencyName}
                          {user.emergencyPhone && (
                            <span className="block text-xs text-foreground/65">
                              {user.emergencyPhone}
                            </span>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </Field>
                    <Field label="Access needs">
                      {user.accessNeeds?.trim() || "—"}
                    </Field>
                  </dl>

                  {user.whyInterested && (
                    <div className="mt-6 border-t border-border pt-5">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                        Why they want to volunteer
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">
                        {user.whyInterested}
                      </p>
                    </div>
                  )}

                  {/* Collapsed by default: what they disclosed only loads
                      on an explicit reveal (MASTER.md a11y baseline). */}
                  {flagged && (
                    <FlagNote
                      userId={user.id}
                      reviewedLabel={
                        user.flagReviewedAt
                          ? `Reviewed ${NZ_DATE.format(user.flagReviewedAt)}`
                          : null
                      }
                      queueHref={flagQueueHref}
                    />
                  )}
                </div>
              )}
            </Section>

            <Section title={`Bookings (${user.bookings.length})`}>
              {user.bookings.length === 0 ? (
                <EmptyState>No bookings yet.</EmptyState>
              ) : (
                <div className="space-y-6">
                  {upcoming.length > 0 && (
                    <BookingList
                      heading="Upcoming"
                      items={upcoming.map(toRow)}
                    />
                  )}
                  {past.length > 0 && (
                    <BookingList heading="History" items={past.map(toRow)} />
                  )}
                </div>
              )}
            </Section>

            <Section
              title={
                emails.length >= EMAIL_LOG_LIMIT
                  ? `Emails sent (${EMAIL_LOG_LIMIT}+)`
                  : `Emails sent (${emails.length})`
              }
            >
              {emails.length === 0 ? (
                <EmptyState>
                  We haven&rsquo;t emailed this volunteer yet. Booking
                  confirmations, password resets and invites will show up here
                  as they go out.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border bg-card">
                  {emails.map((e) => {
                    const badge = EMAIL_STATUS_BADGE[e.status];
                    const failed = e.status === EmailLogStatus.FAILED;
                    return (
                      <li
                        key={e.id}
                        className="flex flex-wrap items-start justify-between gap-3 p-4"
                      >
                        <Link
                          href={`/admin/emails/${e.id}`}
                          className="-m-2 min-w-0 flex-1 rounded-md p-2 hover:bg-foreground/5"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                            {EMAIL_TEMPLATE_LABELS[e.template]}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold">
                            {e.subject}
                          </p>
                          <p className="mt-1 text-xs text-foreground/65">
                            {formatEmailTimestamp(e.createdAt)}
                          </p>
                          {e.error && (
                            <p className="mt-1 truncate text-xs text-destructive">
                              {e.error}
                            </p>
                          )}
                        </Link>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                          {failed && isRetryableTemplate(e.template) && (
                            <RetryEmailButton emailLogId={e.id} />
                          )}
                          <Link
                            href={`/admin/emails/${e.id}`}
                            className="text-xs font-semibold text-leaf-deep hover:underline"
                          >
                            View →
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>

          <aside className="space-y-8">
            <Section title="Private notes">
              <NotesForm userId={user.id} notes={user.notes} />
            </Section>

            {!isSelf && !isAdminUser && (
              <Section title="Impersonate">
                <ImpersonateForm
                  userId={user.id}
                  volunteerName={fullName(user)}
                />
              </Section>
            )}

            <Section title="Admin access">
              {isSelf ? (
                <div className="rounded-md border border-border bg-card p-4 text-sm text-foreground/70">
                  This is you. Ask another admin if you need to change your own
                  access.
                </div>
              ) : (
                <RoleForm
                  userId={user.id}
                  name={fullName(user)}
                  isAdmin={isAdminUser}
                />
              )}
            </Section>
          </aside>
        </div>
      </div>
    </div>
  );
}

type BookingRow = {
  id: string;
  programTitle: string;
  when: string;
  status: BookingStatus;
  shiftId: string;
};

function toRow(b: {
  id: string;
  status: BookingStatus;
  shift: { id: string; startsAt: Date; endsAt: Date; program: { title: string } };
}): BookingRow {
  return {
    id: b.id,
    programTitle: b.shift.program.title,
    when: formatShiftRange(b.shift.startsAt, b.shift.endsAt),
    status: b.status,
    shiftId: b.shift.id,
  };
}

function BookingList({
  heading,
  items,
}: {
  heading: string;
  items: BookingRow[];
}) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
        {heading}
      </h3>
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{b.when}</p>
              <p className="text-xs text-foreground/65">{b.programTitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={b.status} />
              <Link
                href={`/admin/shifts/${b.shiftId}`}
                className="text-xs font-semibold text-leaf-deep hover:underline"
              >
                Roster →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const BOOKING_STATUS: Record<BookingStatus, { label: string; tone: PillTone }> = {
  CONFIRMED: { label: "Confirmed", tone: "positive" },
  ATTENDED: { label: "Attended", tone: "positive" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  NO_SHOW: { label: "No-show", tone: "warning" },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, tone } = BOOKING_STATUS[status];
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="display mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
