import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <BackgroundFlair />
      <div className="container-x relative grid gap-14 py-20 md:py-28 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div className="space-y-8">
          <p className="eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf" />
            He kaiāwhina ahau · Volunteer
          </p>

          <h1 className="display text-balance text-[2.85rem] leading-[1.02] font-semibold tracking-tight md:text-[4.4rem] md:leading-[0.98]">
            Help turn{" "}
            <span className="relative inline-block whitespace-nowrap text-leaf-deep">
              leftovers
              <UnderlineSwoosh />
            </span>{" "}
            into <em className="not-italic">lifelines</em> for whānau.
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-foreground/80 md:text-xl">
            Every day in Avondale we sort, cook and share over 2,400 kilos of
            rescued kai. Whether you&rsquo;re a pro in the kitchen or you just
            like to eat — we&rsquo;d love to have you at our tables.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 bg-leaf px-7 text-base font-semibold tracking-tight hover:bg-leaf-deep"
            >
              <Link href="/shifts">Browse open shifts →</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="h-12 px-5 text-base"
            >
              <Link href="/programs/bring-your-team">I&rsquo;m bringing a team</Link>
            </Button>
          </div>

          <dl className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-2 text-sm text-foreground/70">
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-xs text-foreground/50">est.</dt>
              <dd className="font-medium text-foreground">2011</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-xs text-foreground/50">place</dt>
              <dd className="font-medium text-foreground">Tāmaki Makaurau</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-xs text-foreground/50">crew</dt>
              <dd className="font-medium text-foreground">2,400 kg of kai / day</dd>
            </div>
          </dl>
        </div>

        <PolaroidStack />
      </div>
    </section>
  );
}

function UnderlineSwoosh() {
  return (
    <svg
      className="absolute -bottom-2 left-0 h-3 w-full text-leaf"
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M2 8 Q 50 2 100 6 T 198 6"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function BackgroundFlair() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-leaf/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-32 h-[22rem] w-[22rem] rounded-full bg-tomato/10 blur-3xl"
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.045]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="paper" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#paper)" />
      </svg>
    </>
  );
}

function PolaroidStack() {
  return (
    <div className="relative mx-auto h-[28rem] w-full max-w-md md:h-[32rem]">
      <Polaroid
        rotate="-7deg"
        position="top-2 left-0"
        accent="from-tomato/80 to-tomato/40"
        title="The kai table"
        caption="Tuesday, 11:42am"
        emoji={
          <svg viewBox="0 0 64 64" className="h-16 w-16 text-cream/95" aria-hidden>
            <path d="M8 32 Q32 8 56 32 Q32 56 8 32 Z" fill="currentColor" />
            <path d="M16 32 Q32 22 48 32" stroke="#3DA84A" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="22" cy="28" r="2" fill="#3DA84A" />
            <circle cx="42" cy="28" r="2" fill="#3DA84A" />
          </svg>
        }
      />
      <Polaroid
        rotate="4deg"
        position="top-20 right-2"
        accent="from-leaf to-leaf-deep"
        title="Pack &amp; share"
        caption="Avondale warehouse"
        emoji={
          <svg viewBox="0 0 64 64" className="h-16 w-16 text-cream/95" aria-hidden>
            <path d="M10 22 L32 12 L54 22 L54 50 L32 60 L10 50 Z" fill="currentColor" />
            <path d="M10 22 L32 32 L54 22" stroke="#1a1a1a" strokeWidth="2" fill="none" />
            <path d="M32 32 L32 60" stroke="#1a1a1a" strokeWidth="2" />
          </svg>
        }
      />
      <Polaroid
        rotate="-3deg"
        position="bottom-0 left-12"
        accent="from-charcoal to-charcoal/80"
        title="Conscious Kitchen"
        caption="Every Wed · 9am"
        emoji={
          <svg viewBox="0 0 64 64" className="h-16 w-16 text-cream/95" aria-hidden>
            <path d="M14 36 L14 50 Q14 54 18 54 L46 54 Q50 54 50 50 L50 36 Z" fill="currentColor" />
            <path d="M14 36 L50 36" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M32 36 L32 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M28 18 q4 -8 8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            <circle cx="22" cy="46" r="1.5" fill="#1a1a1a" />
            <circle cx="42" cy="46" r="1.5" fill="#1a1a1a" />
          </svg>
        }
      />
    </div>
  );
}

function Polaroid({
  rotate,
  position,
  accent,
  title,
  caption,
  emoji,
}: {
  rotate: string;
  position: string;
  accent: string;
  title: string;
  caption: string;
  emoji: React.ReactNode;
}) {
  return (
    <div
      className={`absolute ${position} w-56 select-none rounded-sm bg-white p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.25)] transition-transform hover:scale-[1.02]`}
      style={{ transform: `rotate(${rotate})` }}
    >
      <div
        className={`relative aspect-[4/5] w-full overflow-hidden rounded-[2px] bg-gradient-to-br ${accent}`}
      >
        <div className="absolute inset-0 grid place-items-center">{emoji}</div>
        <div
          aria-hidden
          className="absolute inset-0 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
      </div>
      <div className="px-1 pt-3 pb-1">
        <p
          className="text-[0.95rem] font-semibold leading-tight"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <p className="mt-0.5 font-mono text-[0.7rem] uppercase tracking-wider text-foreground/55">
          {caption}
        </p>
      </div>
    </div>
  );
}
