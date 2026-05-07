import Link from "next/link";
import { db } from "@/lib/db";
import { ProgramArt } from "./illustrations";
import { programSlugToHref } from "@/lib/programs";

const PALETTES: Record<
  string,
  { card: string; art: string; tag: string }
> = {
  KAI_BOX: {
    card: "bg-cream-deep",
    art: "text-leaf-deep",
    tag: "bg-leaf/15 text-leaf-deep",
  },
  CONSCIOUS_KITCHEN: {
    card: "bg-charcoal text-cream",
    art: "text-tomato",
    tag: "bg-tomato/20 text-cream",
  },
  WORK_SKILLS: {
    card: "bg-tomato/10",
    art: "text-tomato",
    tag: "bg-tomato/20 text-tomato",
  },
  INCLUSIVE: {
    card: "bg-leaf/10",
    art: "text-leaf-deep",
    tag: "bg-leaf/20 text-leaf-deep",
  },
  CORPORATE: {
    card: "bg-cream-deep",
    art: "text-charcoal",
    tag: "bg-charcoal/10 text-charcoal",
  },
};

export async function ProgramsGrid() {
  const programs = await db.program.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { shifts: true } } },
  });

  return (
    <section id="programs" className="container-x py-20 md:py-28">
      <header className="mb-12 flex flex-col gap-4 md:mb-16 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow">Five ways to roll up your sleeves</p>
          <h2 className="display mt-3 text-balance text-4xl font-semibold leading-tight md:text-5xl">
            Find a place that fits the day you&rsquo;ve got.
          </h2>
        </div>
        <p className="max-w-sm text-foreground/70">
          Most volunteer mahi happens at our home base in Avondale. Choose a
          programme below to see open shifts.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        {programs.map((p, idx) => {
          const palette = PALETTES[p.slug] ?? PALETTES.KAI_BOX;
          const span =
            idx === 0
              ? "lg:col-span-7"
              : idx === 1
                ? "lg:col-span-5"
                : idx === 2
                  ? "lg:col-span-5"
                  : idx === 3
                    ? "lg:col-span-7"
                    : "lg:col-span-12";
          return (
            <Link
              key={p.id}
              href={programSlugToHref(p.slug)}
              className={`group relative flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-md p-7 transition-transform hover:-translate-y-0.5 ${palette.card} ${span}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${palette.tag}`}
                >
                  {p.tagline}
                </span>
                <span className="font-mono text-xs opacity-60">
                  0{idx + 1}
                </span>
              </div>

              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-3/5"
                style={{
                  maskImage:
                    "linear-gradient(to right, transparent 0%, black 35%)",
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, black 35%)",
                }}
              >
                <ProgramArt slug={p.slug} />
              </div>

              <div className="relative z-10 mt-auto max-w-[60%] space-y-3">
                <h3 className="display text-3xl font-semibold leading-tight md:text-[2.4rem]">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed opacity-85 md:text-[0.95rem]">
                  {p.description}
                </p>
                <div className="flex items-center gap-2 pt-2 text-sm font-semibold">
                  {p._count.shifts > 0 ? (
                    <span>{p._count.shifts} upcoming shifts</span>
                  ) : (
                    <span>Get in touch →</span>
                  )}
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
