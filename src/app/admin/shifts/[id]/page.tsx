import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatShiftRange } from "@/lib/programs";
import { fullName } from "@/lib/users";
import { sumBlocks, shiftAvailability } from "@/lib/shifts";
import { Button } from "@/components/ui/button";
import { CancelShiftDialog } from "@/components/admin/cancel-shift-dialog";
import { CancelBookingDialog } from "@/components/admin/cancel-booking-dialog";
import { setBookingStatus } from "../../actions";
import { SlotBlocks } from "./slot-blocks";
import { AssignVolunteerTrigger } from "./assign-volunteer";
import { BookingStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminShiftPage({ params }: Props) {
  const { id } = await params;

  const shift = await db.shift.findUnique({
    where: { id },
    include: {
      program: true,
      bookings: {
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        include: { user: true },
      },
      blocks: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!shift) notFound();

  const confirmed = shift.bookings.filter(
    (b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.ATTENDED,
  );
  const cancelled = shift.bookings.filter(
    (b) => b.status === BookingStatus.CANCELLED || b.status === BookingStatus.NO_SHOW,
  );

  const blocked = sumBlocks(shift.blocks);
  const { free } = shiftAvailability(shift.capacity, confirmed.length, blocked);

  const isPast = shift.startsAt < new Date();
  const assignDisabled = shift.cancelled || isPast || free <= 0;
  const assignDisabledReason = shift.cancelled
    ? "This shift was cancelled."
    : isPast
      ? "This shift has already started."
      : free <= 0
        ? "This shift is full — cancel a booking or remove a slot block first."
        : undefined;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/65 hover:text-foreground"
        >
          ← Admin
        </Link>

          <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-leaf-deep">{shift.program.title}</p>
              <h1 className="display mt-2 text-3xl font-bold leading-tight md:text-4xl">
                {formatShiftRange(shift.startsAt, shift.endsAt)}
              </h1>
              <p className="mt-1 text-sm text-foreground/65">
                {confirmed.length} booked
                {blocked > 0 && ` · ${blocked} blocked`} · {free} of{" "}
                {shift.capacity} open
                {shift.cancelled && (
                  <span className="ml-2 rounded-full bg-tomato/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-tomato">
                    Cancelled
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/shifts/${shift.id}/edit`}>Edit shift</Link>
              </Button>
              {!shift.cancelled && (
                <CancelShiftDialog
                  shiftId={shift.id}
                  bookedCount={confirmed.length}
                />
              )}
            </div>
          </header>

          {shift.notes && (
            <p className="mb-8 rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-3 text-sm">
              {shift.notes}
            </p>
          )}

          <Section title={`Blocked slots (${blocked})`}>
            <SlotBlocks
              shiftId={shift.id}
              blocks={shift.blocks}
              remaining={free}
            />
          </Section>

          <Section
            title={`On the roster (${confirmed.length})`}
            action={
              <AssignVolunteerTrigger
                shiftId={shift.id}
                disabled={assignDisabled}
                disabledReason={assignDisabledReason}
              />
            }
          >
            {confirmed.length === 0 ? (
              <Empty>
                <p>No bookings yet.</p>
                {!assignDisabled && (
                  <p className="mt-1 text-xs text-foreground/55">
                    Use{" "}
                    <span className="font-semibold text-leaf-deep">
                      Assign volunteer
                    </span>{" "}
                    to add someone manually.
                  </p>
                )}
              </Empty>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {confirmed.map((b) => (
                  <li key={b.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold">{fullName(b.user)}</p>
                      <p className="text-xs text-foreground/65">
                        {b.user.email}
                        {b.user.phone && ` · ${b.user.phone}`}
                      </p>
                      {b.user.accessNeeds && (
                        <p className="mt-1 text-sm italic text-foreground/75">
                          {b.user.accessNeeds}
                        </p>
                      )}
                      {b.notes && (
                        <p className="mt-1 text-sm text-foreground/75">
                          Note: {b.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusForm bookingId={b.id} status={BookingStatus.ATTENDED}>
                        Mark attended
                      </StatusForm>
                      <StatusForm bookingId={b.id} status={BookingStatus.NO_SHOW}>
                        No-show
                      </StatusForm>
                      <CancelBookingDialog
                        bookingId={b.id}
                        volunteerName={fullName(b.user)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {cancelled.length > 0 && (
            <Section title={`Cancelled / no-show (${cancelled.length})`}>
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {cancelled.map((b) => (
                  <li key={b.id} className="flex items-center justify-between p-4 text-sm">
                    <span>
                      {fullName(b.user)}{" "}
                      <span className="text-foreground/55">
                        · {b.status.toLowerCase()}
                      </span>
                    </span>
                    <StatusForm bookingId={b.id} status={BookingStatus.CONFIRMED}>
                      Reinstate
                    </StatusForm>
                  </li>
                ))}
              </ul>
            </Section>
          )}
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-xl font-semibold">{title}</h2>
        {action}
      </div>
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

function StatusForm({
  bookingId,
  status,
  children,
}: {
  bookingId: string;
  status: BookingStatus;
  children: React.ReactNode;
}) {
  return (
    <form action={setBookingStatus}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="ghost" size="sm" className="text-xs">
        {children}
      </Button>
    </form>
  );
}
