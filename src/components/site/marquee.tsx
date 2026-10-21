import { Pause, Play } from "lucide-react";

const items = [
  "Good food, shared fairly",
  "Feeding people, not landfill",
  "Since 2011",
  "Avondale, Tāmaki Makaurau",
  "Open to every body",
  "Powered by 1,400+ volunteers",
];

/**
 * Decorative ticker. The scrolling strip is aria-hidden (it repeats the list
 * three times to loop seamlessly); screen readers get one plain copy instead.
 * Motion only runs with motion-safe, pauses on hover, and has a keyboard-
 * reachable pause toggle (WCAG 2.2.2). The toggle is a CSS-only checkbox so
 * the band stays a Server Component; focusing it also pauses the strip.
 */
export function Marquee() {
  return (
    <div className="group relative flex h-11 items-center overflow-hidden border-y border-border/60 bg-background text-foreground/70">
      <ul className="sr-only">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
      <div
        aria-hidden
        className="flex w-max gap-12 whitespace-nowrap motion-safe:animate-[marquee_42s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] group-has-[:checked]:[animation-play-state:paused]"
      >
        {[...items, ...items, ...items].map((it, i) => (
          <span
            key={i}
            className="flex items-center gap-12 font-mono text-xs uppercase tracking-[0.22em]"
          >
            {it}
            <span className="text-leaf">✦</span>
          </span>
        ))}
      </div>
      <label className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center border-l border-border/60 bg-background transition-colors hover:text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline motion-reduce:hidden">
        <input
          type="checkbox"
          className="peer sr-only"
          aria-label="Pause scrolling text"
        />
        <Pause className="size-4 peer-checked:hidden" aria-hidden />
        <Play className="hidden size-4 peer-checked:block" aria-hidden />
      </label>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-33.3333%); }
        }
      `}</style>
    </div>
  );
}
