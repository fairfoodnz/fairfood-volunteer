import Link from "next/link";
import { db } from "@/lib/db";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { ProgramArt } from "@/components/site/illustrations";
import { formatShiftRange } from "@/lib/programs";
import { Badge } from "@/components/ui/badge";
import { BookingStatus, type ProgramSlug } from "@/generated/prisma";

export const metadata = { title: "Open shifts · Fair Food Volunteer" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ programme?: string }> };

const SLUG_FILTERS: { label: string; slug: ProgramSlug | "ALL" }[] = [
  { label: "All", slug: "ALL" },
  { label: "Pack Kai Boxes", slug: "KAI_BOX" },
  { label: "Conscious Kitchen", slug: "CONSCIOUS_KITCHEN" },
  { label: "Inclusive", slug: "INCLUSIVE" },
];

export default async function ShiftsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter =
    SLUG_FILTERS.find((f) => f.slug === sp.programme)?.slug ?? "ALL";

  const shifts = await db.shift.findMany({
    where: {
      cancelled: false,
      startsAt: { gte: new Date() },
      ...(filter !== "ALL"
        ? { program: { slug: filter as ProgramSlug } }
        : {}),
    },
    orderBy: { startsAt: "asc" },
    include: {
      program: true,
      _count: {
        select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
      },
    },
    take: 60,
  });

  const grouped = groupByDay(shifts);

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-cream-deep">
          <div className="container-x py-12 md:py-16">
            <p className="eyebrow">Roster</p>
            <h1 className="display mt-3 text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Open shifts in Avondale.
            </h1>
            <p className="mt-3 max-w-2xl text-foreground/75">
              Pick a shift that fits the day you&rsquo;ve got. Most run for 3
              hours and finish with a cuppa together.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              {SLUG_FILTERS.map((f) => {
                const active = filter === f.slug;
                const href = f.slug === "ALL" ? "/shifts" : `/shifts?programme=${f.slug}`;
                return (
                  <Link
                    key={f.slug}
                    href={href}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "border-leaf bg-leaf text-cream"
                        : "border-foreground/15 bg-background text-foreground/75 hover:border-foreground/35"
                    }`}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container-x py-12 md:py-16">
          {grouped.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-12">
              {grouped.map(({ day, shifts }) => (
                <div key={day}>
                  <div className="mb-5 flex items-baseline justify-between">
                    <h2 className="display text-2xl font-semibold md:text-3xl">
                      {day}
                    </h2>
                    <span className="font-mono text-xs uppercase tracking-widest text-foreground/55">
                      {shifts.length} shift{shifts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {shifts.map((s) => {
                      const taken = s._count.bookings;
                      const free = Math.max(0, s.capacity - taken);
                      return (
                        <li key={s.id}>
                          <Link
                            href={`/shifts/${s.id}`}
                            className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-md border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-leaf/50 hover:shadow-sm"
                          >
                            <div className="absolute right-2 top-2 h-20 w-24 opacity-25 transition-opacity group-hover:opacity-50">
                              <ProgramArt
                                slug={s.program.slug}
                                className="h-full w-full text-leaf-deep"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf-deep">
                                {s.program.title}
                              </p>
                              <p className="mt-1 text-sm font-medium text-foreground/75">
                                {formatShiftRange(s.startsAt, s.endsAt)}
                              </p>
                            </div>
                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-sm">
                                <span className="font-semibold">{free}</span>
                                <span className="text-foreground/55">
                                  {" "}
                                  of {s.capacity} spot{s.capacity === 1 ? "" : "s"} left
                                </span>
                              </span>
                              {free === 0 ? (
                                <Badge variant="secondary">Full</Badge>
                              ) : free <= 2 ? (
                                <Badge className="bg-tomato/15 text-tomato hover:bg-tomato/15">
                                  Almost full
                                </Badge>
                              ) : (
                                <span className="text-sm font-semibold text-leaf-deep">
                                  Book →
                                </span>
                              )}
                            </div>
                            {s.notes && (
                              <p className="text-xs italic text-foreground/65">
                                {s.notes}
                              </p>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

type ShiftWithCount = Awaited<
  ReturnType<typeof db.shift.findMany>
>[number] & { _count: { bookings: number }; program: { title: string; slug: ProgramSlug } };

function groupByDay(shifts: ShiftWithCount[]) {
  const map = new Map<string, ShiftWithCount[]>();
  const fmt = new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Pacific/Auckland",
  });
  for (const s of shifts) {
    const k = fmt.format(s.startsAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(s);
  }
  return Array.from(map, ([day, shifts]) => ({ day, shifts }));
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
      <h3 className="display text-2xl font-semibold">
        No shifts match — yet.
      </h3>
      <p className="mt-2 text-foreground/70">
        Try a different programme, or come back tomorrow when next week opens.
      </p>
    </div>
  );
}
