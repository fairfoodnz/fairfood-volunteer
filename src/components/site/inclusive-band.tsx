import Link from "next/link";
import { INCLUSIVE_SLUG, programHref } from "@/lib/programs";
import {
  Accessibility,
  HeartHandshake,
  type LucideIcon,
  SlidersHorizontal,
  Sprout,
  UsersRound,
  Waves,
} from "lucide-react";

const tags: { label: string; icon: LucideIcon }[] = [
  { label: "Modified tasks", icon: SlidersHorizontal },
  { label: "Bring a support person", icon: HeartHandshake },
  { label: "Wheelchair accessible", icon: Accessibility },
  { label: "Group bookings", icon: UsersRound },
  { label: "Sensory-aware", icon: Waves },
  { label: "First-timers", icon: Sprout },
];

// The Inclusive Volunteering programme card (DB copy, coordinator-owned)
// already describes the programme, and this band sits right below it — so the
// band talks about the everyday practices instead of repeating that copy.
export function InclusiveBand() {
  return (
    <section className="border-y border-border/60 bg-cream-deep">
      <div className="container-x grid gap-10 py-16 md:grid-cols-[1fr_1.2fr] md:py-20">
        <div className="space-y-5">
          <p className="eyebrow">Access &amp; support</p>
          <h2 className="display text-balance text-4xl font-semibold leading-tight md:text-5xl">
            Inclusive volunteering, in practice — not just on the website.
          </h2>
          <p className="max-w-md text-foreground/75">
            Any shift can be shaped around the person doing it — a seated or
            lighter task, a support person by your side, a quieter corner, or
            a slower pace for your first time. Let us know what would help
            when you book or get in touch, and we&rsquo;ll plan around it.
          </p>
          <Link
            href={programHref(INCLUSIVE_SLUG)}
            className="inline-flex min-h-11 items-center gap-2 text-base font-semibold text-leaf-deep underline-offset-4 hover:text-leaf-ink hover:underline"
          >
            About inclusive volunteering →
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-3 self-center sm:grid-cols-2">
          {tags.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3.5 py-3 shadow-[0_1px_0_oklch(0_0_0/0.03)]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-leaf-deep/10 text-leaf-deep">
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
