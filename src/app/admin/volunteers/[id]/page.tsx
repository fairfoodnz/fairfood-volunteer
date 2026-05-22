import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatShiftRange } from "@/lib/programs";
import { fullName } from "@/lib/users";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImpersonateForm } from "@/components/admin/impersonate-form";
import { BookingStatus, Role } from "@/generated/prisma";
import {
  updateVolunteerNotesAction,
  setVolunteerRoleAction,
} from "../actions";

export const dynamic = "force-dynamic";

const NZ_DATE = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

const HEARD_ABOUT_LABELS: Record<string, string> = {
  FRIEND: "From a friend or whānau",
  SOCIAL: "Social media",
  SEARCH: "Search engine",
  WORKPLACE: "Workplace",
  EVENT: "Community event",
  OTHER: "Other",
};

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { firstName: true, lastName: true },
  });
  return {
    title: user ? `${fullName(user)} · Volunteers` : "Volunteer · Admin",
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

  const isSelf = user.id === admin.id;
  const isAdminUser = user.role === Role.ADMIN;
  const flagged = user.arrestHistory || user.healthConditions;
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
        <Link
          href="/admin/volunteers"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/65 hover:text-foreground"
        >
          ← All volunteers
        </Link>

        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Volunteer</p>
            <h1 className="display mt-2 flex flex-wrap items-center gap-3 text-3xl font-bold leading-tight md:text-4xl">
              {fullName(user)}
              {isAdminUser && (
                <span className="rounded-full bg-leaf/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-leaf-deep">
                  Admin
                </span>
              )}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              {user.email}
              {user.phone && <> · {user.phone}</>}
              {user.pronouns && <> · {user.pronouns}</>}
            </p>
            <p className="mt-1 text-xs text-foreground/55">
              Joined {NZ_DATE.format(user.createdAt)}
              {user.profileCompletedAt
                ? ` · Profile completed ${NZ_DATE.format(user.profileCompletedAt)}`
                : " · Profile pending"}
            </p>
          </div>
          {flagged && (
            <Link
              href="/admin/flagged"
              className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-tomato/40 bg-tomato/5 px-3 text-xs font-semibold text-tomato hover:bg-tomato/10"
            >
              Review flags →
            </Link>
          )}
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Confirmed" value={confirmedCount} />
          <Stat label="Attended" value={attendedCount} />
          <Stat label="No-shows" value={noShowCount} />
          <Stat label="Cancelled" value={cancelledCount} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <Section title="Profile">
              {!user.profileCompletedAt ? (
                <Empty>
                  Hasn&rsquo;t finished the questionnaire yet. They can&rsquo;t
                  book shifts until they do.
                </Empty>
              ) : (
                <div className="rounded-md border border-border bg-card p-5">
                  <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <Field label="Birthday">
                      {user.birthday ? NZ_DATE.format(user.birthday) : "—"}
                    </Field>
                    <Field label="Heard about us">
                      {user.heardAbout
                        ? HEARD_ABOUT_LABELS[user.heardAbout] ?? user.heardAbout
                        : "—"}
                      {user.heardAboutOther && (
                        <span className="block text-xs text-foreground/55">
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
                      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                        Why they want to volunteer
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">
                        {user.whyInterested}
                      </p>
                    </div>
                  )}

                  {flagged && (
                    <div className="mt-6 rounded-md border border-tomato/30 bg-tomato/5 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-tomato">
                        Flagged on questionnaire
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {user.arrestHistory && (
                          <li>· Disclosed arrest history</li>
                        )}
                        {user.healthConditions && (
                          <li>· Disclosed health conditions</li>
                        )}
                      </ul>
                      <p className="mt-3 text-xs text-tomato">
                        Open{" "}
                        <Link
                          href="/admin/flagged"
                          className="underline underline-offset-2"
                        >
                          needs review
                        </Link>{" "}
                        for full details and to mark as reviewed.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Section title={`Bookings (${user.bookings.length})`}>
              {user.bookings.length === 0 ? (
                <Empty>No bookings yet.</Empty>
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
          </div>

          <aside className="space-y-8">
            <Section title="Private notes">
              <form
                action={updateVolunteerNotesAction}
                className="rounded-md border border-border bg-card p-4"
              >
                <input type="hidden" name="userId" value={user.id} />
                <label
                  htmlFor="notes"
                  className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
                >
                  Coordinator notes
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={6}
                  defaultValue={user.notes ?? ""}
                  placeholder="Anything the team should know — visible to admins only."
                  className="mt-2"
                  maxLength={2000}
                />
                <p className="mt-2 text-xs text-foreground/55">
                  Only admins can see this. Keep it factual.
                </p>
                <div className="mt-3 flex justify-end">
                  <Button type="submit" size="sm">
                    Save notes
                  </Button>
                </div>
              </form>
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
                <form
                  action={setVolunteerRoleAction}
                  className="rounded-md border border-border bg-card p-4"
                >
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    type="hidden"
                    name="role"
                    value={isAdminUser ? Role.VOLUNTEER : Role.ADMIN}
                  />
                  <p className="text-sm">
                    {isAdminUser ? (
                      <>
                        <span className="font-semibold">{fullName(user)}</span>{" "}
                        is currently an admin. Demoting removes access to{" "}
                        <code className="rounded bg-foreground/10 px-1 text-xs">
                          /admin
                        </code>{" "}
                        immediately.
                      </>
                    ) : (
                      <>
                        Make{" "}
                        <span className="font-semibold">{fullName(user)}</span>{" "}
                        an admin. They&rsquo;ll be able to manage rosters,
                        documents, and other volunteers.
                      </>
                    )}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      variant={isAdminUser ? "destructive" : "default"}
                    >
                      {isAdminUser ? "Remove admin" : "Make admin"}
                    </Button>
                  </div>
                </form>
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
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/55">
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

function StatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { label: string; cls: string }> = {
    CONFIRMED: { label: "Confirmed", cls: "bg-leaf/15 text-leaf-deep" },
    ATTENDED: { label: "Attended", cls: "bg-leaf/25 text-leaf-deep" },
    CANCELLED: {
      label: "Cancelled",
      cls: "bg-foreground/10 text-foreground/65",
    },
    NO_SHOW: { label: "No-show", cls: "bg-tomato/15 text-tomato" },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${cls}`}
    >
      {label}
    </span>
  );
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

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-foreground/65">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </p>
      <p className="display mt-2 text-3xl font-bold">{value}</p>
    </div>
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
      <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
