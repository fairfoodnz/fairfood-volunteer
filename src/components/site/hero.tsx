import Image from "next/image";
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
            Every day at our Hub in Avondale we sort, cook and share over 2
            tonnes of rescued kai. Whether you&rsquo;re a pro in the kitchen or
            want to save kai from going to landfill — we&rsquo;d love to have
            you at our tables.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 bg-leaf-deep px-7 text-base font-semibold tracking-tight hover:bg-leaf-ink"
            >
              <Link href="/shifts">Browse open shifts →</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="h-12 px-5 text-base"
            >
              <Link href="mailto:volunteering@fairfood.org.nz?subject=Corporate%20volunteering">
                I&rsquo;m bringing a team
              </Link>
            </Button>
          </div>

          <dl className="flex flex-wrap items-center gap-x-8 gap-y-2 pt-2 text-sm text-foreground/70">
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-xs text-foreground/65">est.</dt>
              <dd className="font-medium text-foreground">2011</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-xs text-foreground/65">place</dt>
              <dd className="font-medium text-foreground">Tāmaki Makaurau</dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-mono text-xs text-foreground/65">mahi</dt>
              <dd className="font-medium text-foreground">
                2,400 kg of kai / day
              </dd>
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
          <pattern
            id="paper"
            width="3"
            height="3"
            patternUnits="userSpaceOnUse"
          >
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
    <div className="relative mx-auto h-[26rem] w-full max-w-md md:h-[32rem]">
      <Polaroid
        rotate="-7deg"
        position="top-2 left-2 sm:left-0"
        src="/photos/hero-rescue.webp"
      />
      <Polaroid
        rotate="4deg"
        position="top-20 right-2"
        src="/photos/kai-box.webp"
      />
      <Polaroid
        rotate="-3deg"
        position="bottom-0 left-8 sm:left-12"
        src="/photos/hero-kitchen.webp"
      />
    </div>
  );
}

// The polaroid collage is mood, not content — the headline and copy beside it
// say everything — so the stack is aria-hidden and the photos carry alt="".
function Polaroid({
  rotate,
  position,
  src,
}: {
  rotate: string;
  position: string;
  src: string;
}) {
  return (
    <div
      aria-hidden
      className={`absolute ${position} z-10 w-44 select-none rounded-sm bg-white p-3 pb-10 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.25)] sm:w-56`}
      style={{ transform: `rotate(${rotate})` }}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2px] bg-charcoal/10">
        <Image
          src={src}
          alt=""
          fill
          sizes="(min-width: 640px) 224px, 176px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
