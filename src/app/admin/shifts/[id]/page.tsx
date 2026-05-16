import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatShiftRange } from "@/lib/programs";
import { sumBlocks, shiftAvailability } from "@/lib/shifts";
import { Button } from "@/components/ui/button";
import { setBookingStatus, cancelShift } from "../../actions";
import { SlotBlocks } from "./slot-blocks";
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
            {!shift.cancelled && (
              <form action={cancelShift}>
                <input type="hidden" name="shiftId" value={shift.id} />
                <Button
                  type="submit"
                  variant="outline"
                  className="border-tomato/40 text-tomato hover:bg-tomato/10 hover:text-tomato"
                >
                  Cancel shift
                </Button>
              </form>
            )}
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

          <Section title={`On the roster (${confirmed.length})`}>
            {confirmed.length === 0 ? (
              <Empty>No bookings yet.</Empty>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {confirmed.map((b) => (
                  <li key={b.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold">{b.user.name}</p>
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
                      <StatusForm bookingId={b.id} status={BookingStatus.CANCELLED}>
                        Cancel
                      </StatusForm>
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
                      {b.user.name}{" "}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="display mb-3 text-xl font-semibold">{title}</h2>
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
