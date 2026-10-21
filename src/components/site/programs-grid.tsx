import Link from "next/link";
import { db } from "@/lib/db";
import { ProgramArt } from "./illustrations";
import { programHref, INCLUSIVE_SLUG } from "@/lib/programs";
import { programmeTheme } from "@/lib/programme-theme";
import { countOf } from "@/lib/format";
import { cn } from "@/lib/utils";

// Desktop only: fade the photo in from the left so the scrim can carry the
// text. Below lg the photo stacks above the copy instead.
const ART_MASK =
  "lg:[mask-image:linear-gradient(to_right,transparent_0%,black_35%)] lg:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_35%)]";

export async function ProgramsGrid({
  showHeader = true,
  className,
}: {
  /** Off on /programs, where the page header already introduces the grid. */
  showHeader?: boolean;
  className?: string;
} = {}) {
  // PUBLIC only — unlisted and private programmes are reachable by link (or
  // not at all), never by browsing.
  const programs = await db.program.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          // "{n} upcoming shifts" must not count past or cancelled shifts.
          shifts: { where: { cancelled: false, startsAt: { gte: new Date() } } },
        },
      },
    },
  });

  return (
    <section
      id="programs"
      aria-label={showHeader ? undefined : "Programmes"}
      className={cn("container-x py-16 md:py-20", className)}
    >
      {showHeader && (
        <header className="mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {/* Count-agnostic: coordinators can add any number of programmes. */}
            <p className="eyebrow">Ways to roll up your sleeves</p>
            <h2 className="display mt-3 text-balance text-4xl font-semibold leading-tight md:text-5xl">
              Find a place that fits the day you&rsquo;ve got.
            </h2>
          </div>
          <p className="max-w-sm text-foreground/70">
            Most volunteer mahi happens at our home base in Avondale. Choose a
            programme below to see open shifts.
          </p>
        </header>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        {programs.map((p, idx) => {
          const palette = programmeTheme(p.theme);
          // Bento rhythm: a feature pair (7+5) then full-width bands. Cycles so
          // any number of programmes still reads as an intentional grid.
          const pos = idx % 3;
          const span =
            pos === 0
              ? "lg:col-span-7"
              : pos === 1
                ? "lg:col-span-5"
                : "lg:col-span-12 md:col-span-2";
          return (
            <Link
              key={p.id}
              href={programHref(p.slug)}
              className={`group relative flex flex-col overflow-hidden rounded-md motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 lg:min-h-[22rem] lg:p-7 ${palette.card} ${span}`}
            >
              {/* Mobile/tablet: a photo band above the copy. Desktop: the
                  photo fills the right of the card behind a scrim. */}
              <div
                className={`relative h-48 w-full shrink-0 sm:h-56 lg:pointer-events-none lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-3/5 ${ART_MASK}`}
              >
                <ProgramArt program={p} />
              </div>

              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden lg:block"
                style={{
                  background: `linear-gradient(to right, ${palette.scrim} 0%, ${palette.scrim} 50%, transparent 82%)`,
                }}
              />

              <div className="relative z-10 flex flex-1 flex-col p-6 sm:p-7 lg:p-0">
                <span
                  className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${palette.tag}`}
                >
                  {p.tagline}
                </span>

                <div className="mt-5 space-y-3 lg:mt-auto lg:max-w-[55%] lg:pt-10">
                  <h3 className="display text-3xl font-semibold leading-tight md:text-[2.4rem]">
                    {p.title}
                  </h3>
                  {p.schedule && (
                    <p className="font-mono text-xs uppercase tracking-[0.18em] opacity-85">
                      {p.schedule}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed opacity-85 md:text-[0.95rem]">
                    {p.description}
                  </p>
                  <div className="flex items-center gap-2 pt-2 text-sm font-semibold">
                    <span>
                      {p.slug === INCLUSIVE_SLUG
                        ? "Enquire to volunteer"
                        : p._count.shifts > 0
                          ? countOf(p._count.shifts, "upcoming shift")
                          : "Get in touch"}
                    </span>
                    <span
                      aria-hidden
                      className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
