import Link from "next/link";
import {
  Accessibility,
  HeartHandshake,
  Languages,
  type LucideIcon,
  SlidersHorizontal,
  Sprout,
  UsersRound,
  Volume1,
  Waves,
} from "lucide-react";

const tags: { label: string; icon: LucideIcon }[] = [
  { label: "Modified tasks", icon: SlidersHorizontal },
  { label: "Bring a support person", icon: HeartHandshake },
  { label: "Wheelchair accessible", icon: Accessibility },
  { label: "Quiet shift options", icon: Volume1 },
  { label: "Te reo welcome", icon: Languages },
  { label: "Group bookings", icon: UsersRound },
  { label: "Sensory-aware", icon: Waves },
  { label: "First-timers", icon: Sprout },
];

export function InclusiveBand() {
  return (
    <section className="border-y border-border/60 bg-cream-deep">
      <div className="container-x grid gap-10 py-16 md:grid-cols-[1fr_1.2fr] md:py-20">
        <div className="space-y-5">
          <p className="eyebrow">Built for every body</p>
          <h2 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
            Inclusive volunteering, in practice — not just on the website.
          </h2>
          <p className="max-w-md text-foreground/75">
            We modify tasks, allow support people to come along, and welcome
            groups like the Young Onset Dementia Collective every Monday. Tell
            us what you need on the form. There&rsquo;s nearly always a way.
          </p>
          <Link
            href="/programs/inclusive"
            className="inline-flex items-center gap-2 text-base font-semibold text-leaf-deep underline-offset-4 hover:underline"
          >
            See inclusive programmes →
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-3 self-center sm:grid-cols-2">
          {tags.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-[0_1px_0_oklch(0_0_0/0.03)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-leaf-deep/35 hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-leaf-deep/10 text-leaf-deep transition-colors duration-200 group-hover:bg-leaf-deep/15">
                <Icon aria-hidden className="size-[18px]" strokeWidth={2} />
              </span>
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
