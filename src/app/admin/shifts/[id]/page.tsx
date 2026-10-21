import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  formatShiftRange,
  programHref,
  programmeVisibilityHint,
} from "@/lib/programs";
import { countOf } from "@/lib/format";
import { ProgrammeVisibilityBadge } from "@/components/admin/programme-visibility-badge";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusPill, type PillTone } from "@/components/patterns/status-pill";
import { fullName, isFirstTimer } from "@/lib/users";
import { sumBlocks, shiftAvailability } from "@/lib/shifts";
import { Button } from "@/components/ui/button";
import { CancelShiftDialog } from "@/components/admin/cancel-shift-dialog";
import { CancelBookingDialog } from "@/components/admin/cancel-booking-dialog";
import { SlotBlocks } from "./slot-blocks";
import { AssignVolunteerTrigger } from "./assign-volunteer";
import {
  RestoreShiftButton,
  RosterStatusButton,
  ShiftFlash,
} from "./roster-actions";
import { BookingStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flash?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">) {
  // generateMetadata runs independently of the page, so gate its DB read the
  // same way the rest of /admin is gated.
  await requireAdmin();
  const { id } = await params;
  const shift = await db.shift.findUnique({
    where: { id },
    select: { program: { select: { title: true } } },
  });
  return {
    title: shift ? `${shift.program.title} roster · Admin` : "Shift · Admin",
  };
}

const BOOKING_PILL: Partial<
  Record<BookingStatus, { label: string; tone: PillTone }>
> = {
  [BookingStatus.CONFIRMED]: { label: "Confirmed", tone: "neutral" },
  [BookingStatus.ATTENDED]: { label: "Attended", tone: "positive" },
  [BookingStatus.NO_SHOW]: { label: "No-show", tone: "warning" },
  [BookingStatus.CANCELLED]: { label: "Cancelled", tone: "neutral" },
};

export default async function AdminShiftPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { flash } = await searchParams;

  const shift = await db.shift.findUnique({
    where: { id },
    include: {
      program: true,
      // Arrival order only — sorting by status would make a row jump away
      // from under the coordinator's thumb the moment they mark it.
      bookings: {
        orderBy: { createdAt: "asc" },
        include: { user: true },
      },
      blocks: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!shift) notFound();

  // Everyone who was expected on the day stays on the roster, whatever
  // happened: confirmed, attended or a no-show. Only cancellations move out.
  const roster = shift.bookings.filter(
    (b) => b.status !== BookingStatus.CANCELLED,
  );
  const cancelled = shift.bookings.filter(
    (b) => b.status === BookingStatus.CANCELLED,
  );
  // Spots actually held — the same CONFIRMED + ATTENDED rule capacity uses.
  const holding = roster.filter(
    (b) =>
      b.status === BookingStatus.CONFIRMED ||
      b.status === BookingStatus.ATTENDED,
  );
  const confirmedCount = roster.filter(
    (b) => b.status === BookingStatus.CONFIRMED,
  ).length;
  const attendedCount = roster.filter(
    (b) => b.status === BookingStatus.ATTENDED,
  ).length;
  const noShowCount = roster.filter(
    (b) => b.status === BookingStatus.NO_SHOW,
  ).length;

  // Who on this roster has never worked a shift with us — the induction list.
  // Attendance is counted excluding this shift, so a past roster still shows
  // who was new on the day even after everyone's been marked attended.
  const rosterUserIds = Array.from(new Set(shift.bookings.map((b) => b.userId)));
  const attendedElsewhere = rosterUserIds.length
    ? await db.booking.groupBy({
        by: ["userId"],
        where: {
          userId: { in: rosterUserIds },
          status: BookingStatus.ATTENDED,
          shiftId: { not: shift.id },
        },
        _count: { _all: true },
      })
    : [];
  const attendedCounts = new Map(
    attendedElsewhere.map((row) => [row.userId, row._count._all]),
  );
  const firstTimerIds = new Set(
    shift.bookings
      .filter((b) =>
        isFirstTimer({
          volunteeredBefore: b.user.volunteeredBefore,
          attendedCount: attendedCounts.get(b.userId) ?? 0,
        }),
      )
      .map((b) => b.id),
  );
  const firstTimersBooked = holding.filter((b) =>
    firstTimerIds.has(b.id),
  ).length;

  const blocked = sumBlocks(shift.blocks);
  const { free } = shiftAvailability(shift.capacity, holding.length, blocked);

  const isPast = shift.startsAt < new Date();
  const assignDisabledReason = shift.cancelled
    ? "This shift is cancelled. Restore it to add volunteers."
    : isPast
      ? "This shift has already started, so it can't take new assignments."
      : free <= 0
        ? "This shift is full. Cancel a booking or remove a slot block first."
        : undefined;

  const summary = [
    `${holding.length} booked`,
    attendedCount > 0 ? `${attendedCount} attended` : null,
    noShowCount > 0 ? `${noShowCount} no-show` : null,
    firstTimersBooked > 0 ? countOf(firstTimersBooked, "first-timer") : null,
    blocked > 0 ? `${blocked} blocked` : null,
    `${free} of ${shift.capacity} open`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <ShiftFlash flash={flash} />
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          back={{ href: "/admin/shifts", label: "Manage shifts" }}
          eyebrow={
            <span className="inline-flex flex-wrap items-center gap-2">
              Rosters · {shift.program.title}
              {shift.program.visibility !== "PUBLIC" && (
                <ProgrammeVisibilityBadge
                  visibility={shift.program.visibility}
                />
              )}
            </span>
          }
          title={formatShiftRange(shift.startsAt, shift.endsAt)}
          description={summary}
          actions={
            <>
              <Button asChild variant="outline">
                <Link href={`/admin/shifts/${shift.id}/edit`}>Edit shift</Link>
              </Button>
              {!shift.cancelled && (
                <CancelShiftDialog
                  shiftId={shift.id}
                  bookedCount={confirmedCount}
                />
              )}
            </>
          }
        />

        {shift.cancelled && (
          <div
            role="status"
            className="mb-8 flex flex-col gap-4 rounded-md border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-2">
              <StatusPill tone="danger">Cancelled</StatusPill>
              <p className="text-sm text-foreground/85">
                This shift is off the schedule and hidden from volunteers.
                Restoring puts it back, but it doesn&rsquo;t re-book anyone
                whose booking was cancelled. Use Assign volunteer to add them
                back.
              </p>
            </div>
            <RestoreShiftButton shiftId={shift.id} />
          </div>
        )}

        {/* Nobody should have to remember which programmes are hidden while
            they're staring at a roster — say it here, next to the roster. */}
        {shift.program.visibility !== "PUBLIC" && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-cream-deep px-5 py-3 text-sm">
            <p className="text-foreground/85">
              {programmeVisibilityHint(shift.program.visibility)}
            </p>
            {shift.program.visibility === "UNLISTED" && (
              <CopyLinkButton
                path={programHref(shift.program.slug)}
                label="Copy programme link"
              />
            )}
          </div>
        )}

        {shift.notes && (
          <p className="mb-8 rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-3 text-sm">
            {shift.notes}
          </p>
        )}

        <Section
          title={`On the roster (${roster.length})`}
          action={
            <AssignVolunteerTrigger
              shiftId={shift.id}
              disabledReason={assignDisabledReason}
            />
          }
        >
          {roster.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-foreground/70">
              <p>No bookings yet.</p>
              {!assignDisabledReason && (
                <p className="mt-1">
                  Use Assign volunteer to add someone yourself.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {roster.map((b) => {
                const name = fullName(b.user);
                const pill = BOOKING_PILL[b.status];
                return (
                  <li
                    key={b.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {name}
                        {pill && (
                          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                        )}
                        {firstTimerIds.has(b.id) && (
                          <StatusPill tone="info">First shift</StatusPill>
                        )}
                      </p>
                      <p className="break-words text-sm text-foreground/70">
                        {b.user.email}
                        {b.user.phone && ` · ${b.user.phone}`}
                      </p>
                      {b.user.accessNeeds && (
                        <p className="mt-1 text-sm italic text-foreground/85">
                          {b.user.accessNeeds}
                        </p>
                      )}
                      {b.notes && (
                        <p className="mt-1 text-sm text-foreground/85">
                          Note: {b.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {b.status === BookingStatus.CONFIRMED && (
                        <>
                          <RosterStatusButton
                            bookingId={b.id}
                            status={BookingStatus.ATTENDED}
                            label="Mark attended"
                            pendingLabel="Saving…"
                            ariaLabel={`Mark ${name} attended`}
                            successMessage={`${name} marked attended.`}
                            variant="default"
                            className="bg-leaf-deep hover:bg-leaf-ink"
                          />
                          <RosterStatusButton
                            bookingId={b.id}
                            status={BookingStatus.NO_SHOW}
                            label="No-show"
                            pendingLabel="Saving…"
                            ariaLabel={`Mark ${name} as a no-show`}
                            successMessage={`${name} marked as a no-show.`}
                          />
                          <CancelBookingDialog
                            bookingId={b.id}
                            volunteerName={name}
                          />
                        </>
                      )}
                      {b.status === BookingStatus.ATTENDED && (
                        <RosterStatusButton
                          bookingId={b.id}
                          status={BookingStatus.CONFIRMED}
                          label="Undo"
                          pendingLabel="Undoing…"
                          ariaLabel={`Undo attended for ${name}`}
                          successMessage={`${name} is back to confirmed.`}
                        />
                      )}
                      {b.status === BookingStatus.NO_SHOW && (
                        <RosterStatusButton
                          bookingId={b.id}
                          status={BookingStatus.CONFIRMED}
                          label="Undo"
                          pendingLabel="Undoing…"
                          ariaLabel={`Undo no-show for ${name}`}
                          successMessage={`${name} is back to confirmed.`}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {cancelled.length > 0 && (
          <Section title={`Cancelled bookings (${cancelled.length})`}>
            {shift.cancelled && (
              <p className="mb-3 text-sm text-foreground/70">
                Restore the shift before reinstating anyone.
              </p>
            )}
            <ul className="divide-y divide-border rounded-md border border-border bg-card">
              {cancelled.map((b) => {
                const name = fullName(b.user);
                return (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{name}</span>
                      <StatusPill tone="neutral">Cancelled</StatusPill>
                    </span>
                    {!shift.cancelled && (
                      <RosterStatusButton
                        bookingId={b.id}
                        status={BookingStatus.CONFIRMED}
                        label="Reinstate"
                        pendingLabel="Reinstating…"
                        ariaLabel={`Reinstate ${name}`}
                        successMessage={`${name} is back on the roster.`}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title={`Blocked slots (${blocked})`}>
          <SlotBlocks shiftId={shift.id} blocks={shift.blocks} remaining={free} />
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <h2 className="display text-xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
