import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { ProgramArt } from "@/components/site/illustrations";
import { formatShiftRange } from "@/lib/programs";
import { currentUser } from "@/lib/auth";
import { BookForm } from "./book-form";
import { CancelBookingDialog } from "./cancel-booking";
import { BookingStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const shift = await db.shift.findUnique({
    where: { id },
    include: { program: true },
  });
  if (!shift) return {};
  return {
    title: `${shift.program.title} · ${formatShiftRange(shift.startsAt, shift.endsAt)}`,
  };
}

export default async function ShiftPage({ params }: Props) {
  const { id } = await params;
  const shift = await db.shift.findUnique({
    where: { id },
    include: {
      program: true,
      bookings: {
        where: { status: BookingStatus.CONFIRMED },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          userId: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!shift) notFound();

  const user = await currentUser();
  const myBooking =
    (user && shift.bookings.find((b) => b.userId === user.id)) || null;

  const bookedCount = shift.bookings.length;
  const free = Math.max(0, shift.capacity - bookedCount);
  const isFull = free === 0;
  const inPast = shift.startsAt < new Date();
  const rosterChips = buildRosterChips(shift.bookings, user?.id ?? null);

  return (
    <>
      <SiteNav />
      <main className="flex-1 py-12 md:py-16">
        <div className="container-x">
          <Link
            href="/shifts"
            className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/65 hover:text-foreground"
          >
            ← All shifts
          </Link>

          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
            <article className="space-y-8">
              <header className="space-y-3">
                <p className="eyebrow text-leaf-deep">{shift.program.tagline}</p>
                <h1 className="display text-balance text-4xl font-bold leading-tight md:text-5xl">
                  {shift.program.title}
                </h1>
                <p className="text-lg text-foreground/75">
                  {formatShiftRange(shift.startsAt, shift.endsAt)}
                </p>
              </header>

              <div className="relative overflow-hidden rounded-md border border-border bg-cream-deep px-7 py-10">
                <div className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 opacity-50">
                  <ProgramArt
                    slug={shift.program.slug}
                    className="h-full w-full text-leaf-deep"
                  />
                </div>
                <p className="relative max-w-xl text-foreground/85">
                  {shift.program.description}
                </p>
              </div>

              <section aria-labelledby="roster-heading" className="space-y-3">
                <p
                  id="roster-heading"
                  className="font-mono text-[10px] uppercase tracking-widest text-foreground/55"
                >
                  Going · {bookedCount} of {shift.capacity}
                </p>
                {rosterChips.length === 0 ? (
                  <p className="text-sm text-foreground/65">
                    Be the first to put your name down.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {rosterChips.map((c) => (
                      <li key={c.key}>
                        <span
                          className={
                            c.isYou
                              ? "inline-flex rounded-full bg-leaf px-3 py-1 text-sm font-semibold text-cream"
                              : "inline-flex rounded-full bg-leaf/15 px-3 py-1 text-sm font-medium text-leaf-deep"
                          }
                        >
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                <Detail label="Location" value={shift.program.location} />
                <Detail
                  label="Capacity"
                  value={`${free} of ${shift.capacity} spots open`}
                  emphasis={isFull ? "warn" : free <= 2 ? "warn" : "ok"}
                />
                <Detail
                  label="Bring"
                  value="Closed-toe shoes, water bottle, kind energy. Aprons, gloves and a cuppa on us."
                />
                <Detail
                  label="Not sure?"
                  value={
                    <>
                      Email{" "}
                      <a
                        className="font-semibold text-leaf-deep underline underline-offset-4"
                        href="mailto:kiaora@fairfood.org.nz"
                      >
                        kiaora@fairfood.org.nz
                      </a>
                    </>
                  }
                />
              </dl>

              {shift.notes && (
                <div className="rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-4 text-sm">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                    Note from the team
                  </p>
                  <p className="mt-1 text-foreground/85">{shift.notes}</p>
                </div>
              )}
            </article>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-md border border-border bg-card p-6 shadow-sm md:p-8">
                {inPast ? (
                  <Note title="That shift has passed">
                    Want to come along to the next one?
                    <Link
                      href={`/shifts?programme=${shift.program.slug}`}
                      className="mt-3 inline-flex items-center gap-2 font-semibold text-leaf-deep underline-offset-4 hover:underline"
                    >
                      See upcoming {shift.program.title} shifts →
                    </Link>
                  </Note>
                ) : myBooking ? (
                  <div className="space-y-4">
                    <p className="eyebrow text-leaf-deep">Your shift</p>
                    <h3 className="display text-xl font-semibold leading-snug">
                      You&rsquo;re booked in. See you then.
                    </h3>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-foreground/55">
                      {formatShiftRange(shift.startsAt, shift.endsAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link
                        href="/me"
                        className="inline-flex h-9 items-center rounded border border-border bg-card px-3 text-sm font-semibold text-foreground/80 transition-colors hover:border-leaf hover:text-leaf-deep"
                      >
                        All my shifts →
                      </Link>
                      <CancelBookingDialog bookingId={myBooking.id} />
                    </div>
                  </div>
                ) : isFull ? (
                  <Note title="This shift is full">
                    Try another time slot, or join the waitlist by emailing us.
                  </Note>
                ) : (
                  <BookForm
                    shiftId={shift.id}
                    user={user ? { name: user.name, email: user.email } : null}
                  />
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Detail({
  label,
  value,
  emphasis = "ok",
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: "ok" | "warn";
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
        {label}
      </dt>
      <dd
        className={
          emphasis === "warn"
            ? "mt-1 font-semibold text-tomato"
            : "mt-1 text-foreground/85"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3
        className="display text-xl font-semibold"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      <div className="text-sm text-foreground/75">{children}</div>
    </div>
  );
}

type RosterChip = { key: string; label: string; isYou: boolean };

function buildRosterChips(
  bookings: { id: string; userId: string; user: { name: string } }[],
  currentUserId: string | null,
): RosterChip[] {
  // First names only, disambiguate duplicates with a last initial.
  const firsts = bookings.map((b) => {
    const parts = b.user.name.trim().split(/\s+/);
    const first = parts[0] ?? "";
    const lastInitial = parts.length > 1
      ? parts[parts.length - 1]!.charAt(0).toUpperCase()
      : "";
    return { ...b, first, lastInitial };
  });
  const firstCounts = new Map<string, number>();
  for (const b of firsts) {
    firstCounts.set(b.first, (firstCounts.get(b.first) ?? 0) + 1);
  }

  const chips: RosterChip[] = firsts.map((b) => {
    const isYou = currentUserId !== null && b.userId === currentUserId;
    const needsInitial = (firstCounts.get(b.first) ?? 0) > 1 && b.lastInitial;
    const display = needsInitial ? `${b.first} ${b.lastInitial}.` : b.first;
    return { key: b.id, label: isYou ? "You" : display, isYou };
  });

  // Move the current user's chip to the front for visibility.
  chips.sort((a, b) => (a.isYou === b.isYou ? 0 : a.isYou ? -1 : 1));
  return chips;
}
