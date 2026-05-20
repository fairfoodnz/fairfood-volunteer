import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { ProgramArt } from "@/components/site/illustrations";
import { VerifyEmailBanner } from "@/components/site/verify-email-banner";
import { formatShiftRange } from "@/lib/programs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CancelBookingDialog } from "../shifts/[id]/cancel-booking";
import { BookingStatus } from "@/generated/prisma";

export const metadata = { title: "My shifts · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ booked?: string }> };

export default async function MePage({ searchParams }: Props) {
  const user = await requireUser();
  const { booked } = await searchParams;

  const bookings = await db.booking.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { shift: { startsAt: "asc" } }],
    include: { shift: { include: { program: true } } },
  });

  const upcoming = bookings.filter(
    (b) =>
      b.status === BookingStatus.CONFIRMED &&
      b.shift.startsAt >= new Date(),
  );
  const past = bookings.filter(
    (b) =>
      b.shift.startsAt < new Date() ||
      b.status === BookingStatus.CANCELLED ||
      b.status === BookingStatus.ATTENDED ||
      b.status === BookingStatus.NO_SHOW,
  );

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-12 md:py-16">
        <div className="container-x">
          {!user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}
          {booked && (
            <div className="mb-8 rounded-md border border-leaf/30 bg-leaf/10 px-5 py-4">
              <p className="font-semibold text-leaf-deep">Ka pai — you&rsquo;re booked.</p>
              <p className="text-sm text-foreground/75">
                We&rsquo;ll send a reminder the day before. See you then.
              </p>
            </div>
          )}

          <header className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Kia ora, {user.firstName}</p>
              <h1 className="display mt-2 text-balance text-4xl font-bold leading-tight md:text-5xl">
                Your shifts at the kai table.
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-leaf hover:bg-leaf-deep">
                <Link href="/shifts">Book another shift</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/me/profile">Edit profile</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/me/security">Sign-in &amp; security</Link>
              </Button>
            </div>
          </header>

          <section className="space-y-4">
            <h2 className="display text-2xl font-semibold">Coming up</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
                <p className="text-foreground/70">
                  Nothing booked yet.{" "}
                  <Link
                    href="/shifts"
                    className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
                  >
                    Browse open shifts →
                  </Link>
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((b) => (
                  <li
                    key={b.id}
                    className="relative grid gap-4 overflow-hidden rounded-md border border-border bg-card p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded bg-cream-deep">
                      <ProgramArt program={b.shift.program} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-leaf-deep">
                        {b.shift.program.title}
                      </p>
                      <p className="mt-1 text-base font-medium">
                        {formatShiftRange(b.shift.startsAt, b.shift.endsAt)}
                      </p>
                      <p className="text-sm text-foreground/65">
                        {b.shift.program.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 md:justify-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/shifts/${b.shiftId}`}>Details</Link>
                      </Button>
                      <CancelBookingDialog
                        bookingId={b.id}
                        triggerLabel="Cancel"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section className="mt-12 space-y-4">
              <h2 className="display text-2xl font-semibold">Past & cancelled</h2>
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {past.slice(0, 12).map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">{b.shift.program.title}</p>
                      <p className="text-xs text-foreground/65">
                        {formatShiftRange(b.shift.startsAt, b.shift.endsAt)}
                      </p>
                    </div>
                    <BookingPill status={b.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function BookingPill({ status }: { status: BookingStatus }) {
  const cfg: Record<BookingStatus, { label: string; cls: string }> = {
    CONFIRMED: { label: "Confirmed", cls: "bg-leaf/15 text-leaf-deep" },
    CANCELLED: { label: "Cancelled", cls: "bg-foreground/10 text-foreground/65" },
    ATTENDED: { label: "Attended", cls: "bg-leaf text-cream" },
    NO_SHOW: { label: "No-show", cls: "bg-tomato/15 text-tomato" },
  };
  const c = cfg[status];
  return <Badge className={`${c.cls} hover:${c.cls}`}>{c.label}</Badge>;
}
