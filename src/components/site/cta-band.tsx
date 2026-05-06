import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="container-x pb-20 md:pb-28">
      <div className="relative overflow-hidden rounded-md bg-charcoal text-cream">
        <BackgroundDecoration />
        <div className="relative grid gap-8 px-8 py-14 md:grid-cols-[1.4fr_1fr] md:items-end md:px-14 md:py-20">
          <div className="space-y-5">
            <p className="eyebrow text-cream/60">Nau mai, haere mai</p>
            <h2 className="display text-balance text-4xl font-semibold leading-tight md:text-[3.6rem] md:leading-[1]">
              Ready to come down to the kai table?
            </h2>
            <p className="max-w-md text-cream/75">
              Pick a shift that suits, register in 30 seconds, and you&rsquo;ll
              get a confirmation with everything you need to know.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Button
              asChild
              size="lg"
              className="h-12 bg-leaf px-7 text-base font-semibold tracking-tight hover:bg-leaf-deep"
            >
              <Link href="/shifts">See open shifts →</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-cream/40 bg-transparent px-7 text-cream hover:bg-cream/10 hover:text-cream"
            >
              <Link href="mailto:kiaora@fairfood.org.nz">Email us</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function BackgroundDecoration() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      viewBox="0 0 600 300"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="ctaPaper" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.7" fill="white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ctaPaper)" />
      <path
        d="M-20 220 Q200 130 400 220 T620 200"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
