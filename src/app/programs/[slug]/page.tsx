import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteNav } from "@/components/site/nav";
import { SiteFooter } from "@/components/site/footer";
import { ProgramArt } from "@/components/site/illustrations";
import { Button } from "@/components/ui/button";
import {
  formatShiftRange,
  INCLUSIVE_SLUG,
  INCLUSIVE_MAILTO,
} from "@/lib/programs";
import { sumBlocks, shiftAvailability } from "@/lib/shifts";
import { BookingStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const program = await db.program.findUnique({ where: { slug } });
  return program ? { title: `${program.title} · Fair Food Volunteer` } : {};
}

export default async function ProgramPage({ params }: Props) {
  const { slug } = await params;

  const program = await db.program.findFirst({
    where: { slug, active: true },
    include: {
      shifts: {
        where: { startsAt: { gte: new Date() }, cancelled: false },
        orderBy: { startsAt: "asc" },
        take: 12,
        include: {
          _count: {
            select: { bookings: { where: { status: BookingStatus.CONFIRMED } } },
          },
          blocks: { select: { slots: true } },
        },
      },
    },
  });
  if (!program) notFound();

  // Inclusive volunteering runs by arrangement with pre-registered groups: the
  // page stays so people can see we offer it, but it routes to email rather
  // than the self-serve booking flow.
  const isInclusive = program.slug === INCLUSIVE_SLUG;

  // Coordinators can leave these blank — fall back to the org defaults so the
  // page never shows a hole.
  const contactEmail = program.contactEmail || "volunteering@fairfood.org.nz";
  const contactPhone = program.contactPhone || "(09) 555-1234";
  const gettingHere =
    program.gettingHere ||
    "Free street parking. We’re a five-minute walk from Avondale train station.";

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-cream-deep">
          <div className="container-x grid gap-10 py-16 md:grid-cols-[1.4fr_1fr] md:items-center md:py-20">
            <div className="space-y-5">
              <p className="eyebrow text-leaf-deep">{program.tagline}</p>
              <h1 className="display text-balance text-4xl font-bold leading-[1.05] md:text-6xl">
                {program.title}
              </h1>
              <p className="max-w-xl text-lg text-foreground/80">
                {program.description}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {isInclusive ? (
                  <Button asChild size="lg" className="bg-leaf hover:bg-leaf-deep">
                    <Link href={INCLUSIVE_MAILTO}>
                      Enquire about inclusive volunteering →
                    </Link>
                  </Button>
                ) : program.shifts.length > 0 ? (
                  <Button asChild size="lg" className="bg-leaf hover:bg-leaf-deep">
                    <Link href={`/shifts?programme=${program.slug}`}>
                      See {program.shifts.length} open shifts →
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="bg-leaf hover:bg-leaf-deep">
                    <Link href="mailto:volunteering@fairfood.org.nz?subject=Volunteering">
                      Email us to plan a day
                    </Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline">
                  <Link href="/programs">All programmes</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-72 overflow-hidden rounded-md bg-leaf/10 md:h-96">
              <ProgramArt program={program} />
            </div>
          </div>
        </section>

        <section className="container-x py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
            {isInclusive ? (
              <div className="rounded-md border border-border bg-card p-7 md:p-9">
                <h2 className="display text-2xl font-bold md:text-3xl">
                  How to join
                </h2>
                <p className="mt-3 max-w-prose text-foreground/75">
                  Inclusive volunteering runs by arrangement with
                  pre-registered groups, so we can tailor the tasks, support
                  and pace to your crew. Tell us a little about your group and
                  we&rsquo;ll plan a session together — there&rsquo;s nearly
                  always a way.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-6 bg-leaf hover:bg-leaf-deep"
                >
                  <Link href={INCLUSIVE_MAILTO}>
                    Email volunteering@fairfood.org.nz →
                  </Link>
                </Button>
              </div>
            ) : (
            <div>
              <h2 className="display text-2xl font-bold md:text-3xl">
                Next available shifts
              </h2>
              <ul className="mt-6 divide-y divide-border rounded-md border border-border bg-card">
                {program.shifts.length === 0 && (
                  <li className="p-6 text-center text-sm text-foreground/65">
                    No upcoming shifts listed. Email{" "}
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-semibold text-leaf-deep underline-offset-4 hover:underline"
                    >
                      {contactEmail}
                    </a>{" "}
                    and we&rsquo;ll find a fit.
                  </li>
                )}
                {program.shifts.map((s) => {
                  const { free } = shiftAvailability(
                    s.capacity,
                    s._count.bookings,
                    sumBlocks(s.blocks),
                  );
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/shifts/${s.id}`}
                        className="flex items-center justify-between p-5 hover:bg-cream-deep/40"
                      >
                        <div>
                          <p className="font-medium">
                            {formatShiftRange(s.startsAt, s.endsAt)}
                          </p>
                          <p className="text-xs text-foreground/65">
                            {free} of {s.capacity} spots open
                          </p>
                        </div>
                        <span className="font-semibold text-leaf-deep">Book →</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            )}
            <aside className="space-y-3 rounded-md bg-cream-deep p-6 text-sm md:p-8">
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                Where you&rsquo;ll be
              </p>
              <p className="font-semibold">{program.location}</p>
              <p className="whitespace-pre-line text-foreground/75">
                {gettingHere}
              </p>
              <hr className="my-4 border-foreground/10" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                Pātai?
              </p>
              <p>
                Email{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-semibold text-leaf-deep underline underline-offset-4"
                >
                  {contactEmail}
                </a>{" "}
                or call {contactPhone}.
              </p>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
