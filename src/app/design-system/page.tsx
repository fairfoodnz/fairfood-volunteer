import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/patterns/status-pill";
import { EmptyState } from "@/components/patterns/empty-state";
import { FormField } from "@/components/patterns/form-field";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Internal reference — deliberately not linked in nav and not indexed.
export const metadata: Metadata = {
  title: "Design system · Fair Food (internal)",
  description:
    "Living reference for the Fair Food volunteer portal design language.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

/* ------------------------------------------------------------------ */
/*  Small building blocks (local to this reference page)               */
/* ------------------------------------------------------------------ */

function Section({
  id,
  index,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-12 md:pt-16">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-xs text-foreground/65">{index}</span>
        <p className="eyebrow text-leaf-deep">{eyebrow}</p>
      </div>
      <h2 className="display mt-3 text-2xl font-bold leading-tight text-balance md:text-3xl">
        {title}
      </h2>
      {intro ? (
        <p className="mt-3 max-w-2xl text-foreground/70">{intro}</p>
      ) : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Demo({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className="overflow-hidden rounded-md border border-border bg-card">
      <div className={`p-6 md:p-8 ${className}`}>{children}</div>
      <figcaption className="border-t border-border bg-cream-deep px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
        {label}
      </figcaption>
    </figure>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-cream-deep px-1.5 py-0.5 font-mono text-[0.78rem] text-foreground/80">
      {children}
    </code>
  );
}

function Swatch({
  name,
  cls,
  oklch,
  swatchClass,
  ring = false,
}: {
  name: string;
  cls: string;
  oklch: string;
  swatchClass: string;
  ring?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div
        className={`h-16 w-full rounded ${swatchClass} ${
          ring ? "ring-1 ring-inset ring-black/10" : ""
        }`}
      />
      <p className="mt-3 font-mono text-xs font-semibold text-foreground">
        {name}
      </p>
      <p className="mt-1 font-mono text-[10px] text-foreground/65">{cls}</p>
      <p className="mt-0.5 font-mono text-[10px] text-foreground/65">{oklch}</p>
    </div>
  );
}

function Toc() {
  const items = [
    ["ethos", "Foundations"],
    ["colour", "Colour"],
    ["type", "Typography"],
    ["shape", "Spacing & shape"],
    ["motion", "Motion"],
    ["components", "Components"],
    ["voice", "Voice & copy"],
    ["a11y", "A11y & anti-patterns"],
  ];
  return (
    <nav
      aria-label="On this page"
      className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-auto"
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
        On this page
      </p>
      <ol className="mt-3 space-y-1.5 text-sm">
        {items.map(([id, label], i) => (
          <li key={id} className="flex gap-3">
            <span className="font-mono text-xs text-foreground/65">
              {String(i + 1).padStart(2, "0")}
            </span>
            <a
              href={`#${id}`}
              className="text-foreground/70 underline-offset-4 transition-colors duration-150 ease-out hover:text-leaf-deep hover:underline"
            >
              {label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DesignSystemPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Standalone reference header — not the public SiteNav. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-6">
          <div className="flex items-baseline gap-3">
            <span className="brand text-lg text-foreground">Fair Food</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
              design system
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-foreground/70 underline-offset-4 transition-colors duration-150 ease-out hover:text-leaf-deep hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to site
          </Link>
        </div>
      </header>

      <div className="container-x grid gap-12 py-12 md:py-16 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <aside className="hidden lg:block">
          <Toc />
        </aside>

        <main id="main" className="min-w-0 max-w-3xl space-y-4">
          {/* Intro */}
          <div>
            <p className="eyebrow text-leaf-deep">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-leaf align-middle" />
              Internal reference
            </p>
            <h1 className="display mt-3 text-4xl font-bold leading-tight text-balance md:text-5xl">
              The shared language for the{" "}
              <span className="text-leaf-deep">volunteer portal</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-foreground/75">
              A living view of every token, pattern, and rule in{" "}
              <Mono>design-system/MASTER.md</Mono>. Build on what is here — do
              not introduce new primary colours, fonts, or radii.
            </p>
            <div className="mt-4 rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-4 text-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                Note from the team
              </p>
              <p className="mt-1 text-foreground/85">
                This page is unlisted and{" "}
                <span className="font-medium">noindex</span> — a working
                reference for designers and engineers, not a public surface.
              </p>
            </div>
          </div>

          {/* 01 — Foundations */}
          <Section
            id="ethos"
            index="01"
            eyebrow="Foundations"
            title="Editorial community zine, not SaaS dashboard"
            intro="Warm cream backgrounds, a hand-typeset feel, te reo Māori greetings on volunteer surfaces, polaroid photography. Every choice below serves that voice."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Warm, not clinical", "Cream surfaces, charcoal text — never stark white-on-grey."],
                ["Typeset, not generic", "Tight tracking, mono eyebrows, a confident display weight."],
                ["Calm motion", "Short ease-out fades. No bounce, no spring, no spinners."],
              ].map(([h, b]) => (
                <div
                  key={h}
                  className="rounded-md border border-border bg-card p-5"
                >
                  <p className="font-semibold text-foreground">{h}</p>
                  <p className="mt-1.5 text-sm text-foreground/70">{b}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 02 — Colour */}
          <Section
            id="colour"
            index="02"
            eyebrow="Colour"
            title="One palette, defined once in globals.css"
            intro="Use these tokens via Tailwind utilities — never hand-pick a new hex. leaf and tomato are decorative (dots, rules, tints, display type): they don't reach 4.5:1 as text or behind white text, so text and filled controls use leaf-deep and tomato-deep."
          >
            <div className="space-y-8">
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                  Surfaces
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Swatch name="cream" cls="bg-background" oklch="0.965 0.012 75" swatchClass="bg-cream" ring />
                  <Swatch name="cream-deep" cls="bg-cream-deep" oklch="0.93 0.02 75" swatchClass="bg-cream-deep" ring />
                  <Swatch name="card" cls="bg-card" oklch="1 0 0" swatchClass="bg-card" ring />
                  <Swatch name="border" cls="border-border" oklch="0.88 0.014 75" swatchClass="bg-border" ring />
                </div>
              </div>
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                  Brand
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Swatch name="leaf" cls="decorative only" oklch="0.62 0.17 142" swatchClass="bg-leaf" />
                  <Swatch name="leaf-deep" cls="text / CTA fill · 5.1:1" oklch="0.5 0.16 142" swatchClass="bg-leaf-deep" />
                  <Swatch name="leaf-ink" cls="CTA hover" oklch="0.43 0.14 142" swatchClass="bg-leaf-ink" />
                  <Swatch name="forest" cls="text-forest" oklch="0.22 0.04 140" swatchClass="bg-forest" />
                  <Swatch name="charcoal" cls="text-foreground" oklch="0.18 0.012 140" swatchClass="bg-charcoal" />
                </div>
              </div>
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                  Accents
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Swatch name="tomato" cls="decorative only" oklch="0.66 0.19 32" swatchClass="bg-tomato" />
                  <Swatch name="tomato-deep" cls="warning text · 5.5:1" oklch="0.52 0.19 32" swatchClass="bg-tomato-deep" />
                  <Swatch name="destructive" cls="errors / destroy" oklch="0.52 0.2 27" swatchClass="bg-destructive" />
                  <Swatch name="clay" cls="bg-clay" oklch="0.42 0.09 45" swatchClass="bg-clay" />
                  <Swatch name="ocean" cls="bg-ocean" oklch="0.4 0.055 215" swatchClass="bg-ocean" />
                </div>
              </div>

              <Demo label="foreground opacity ladder — use these, not new greys (floor is /65)">
                <div className="space-y-1.5">
                  <p className="text-foreground">text-foreground — primary body</p>
                  <p className="text-foreground/85">text-foreground/85 — body emphasis</p>
                  <p className="text-foreground/70">text-foreground/70 — secondary, eyebrows</p>
                  <p className="font-mono text-sm text-foreground/65">
                    text-foreground/65 — mono labels, very muted (lowest step: 5.6:1)
                  </p>
                </div>
              </Demo>
            </div>
          </Section>

          {/* 03 — Typography */}
          <Section
            id="type"
            index="03"
            eyebrow="Typography"
            title="Poppins for everything, mono for accents"
            intro="Poppins is display and body (tight tracking on display). The mono face is reserved for eyebrows and dt labels — lowercase for facts, UPPERCASE for eyebrows. Never set body copy in mono."
          >
            <div className="space-y-4">
              <Demo label="display heading — .display, tracking -0.035em">
                <h3 className="display text-4xl font-bold leading-tight text-balance md:text-5xl">
                  Turn leftovers into{" "}
                  <span className="text-leaf-deep">lifelines</span>.
                </h3>
              </Demo>
              <Demo label="type scale">
                <div className="space-y-3">
                  <p className="display text-5xl font-bold leading-none">5xl hero</p>
                  <p className="display text-3xl font-bold">3xl section h2</p>
                  <p className="text-lg text-foreground/85">lg — lead paragraph</p>
                  <p className="text-base text-foreground/85">
                    base — default body copy at a comfortable measure
                  </p>
                  <p className="eyebrow">eyebrow · mono · uppercase · 0.18em</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                    dt label · mono · 10px
                  </p>
                </div>
              </Demo>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-md border border-border bg-card p-5">
                  <p className="display text-2xl">Aa</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                    .display
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    Poppins 700, −0.035em
                  </p>
                </div>
                <div className="rounded-md border border-border bg-card p-5">
                  <p className="brand text-2xl">Aa</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                    .brand
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    Poppins 600, −0.045em
                  </p>
                </div>
                <div className="rounded-md border border-border bg-card p-5">
                  <p className="font-mono text-2xl">Aa</p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                    font-mono
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    Labels & eyebrows only
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* 04 — Spacing & shape */}
          <Section
            id="shape"
            index="04"
            eyebrow="Spacing & shape"
            title="Tight radii, generous rhythm"
            intro="Base radius is 0.25rem — the corners stay crisp. Cards use rounded-md, chips rounded, pills/avatars only get full."
          >
            <div className="space-y-4">
              <Demo label="radius scale">
                <div className="flex flex-wrap items-end gap-6">
                  {[
                    ["rounded-sm", "rounded-sm"],
                    ["rounded-md", "rounded-md · cards"],
                    ["rounded", "rounded · chips"],
                    ["rounded-full", "rounded-full · pills"],
                  ].map(([cls, label]) => (
                    <div key={label} className="text-center">
                      <div
                        className={`size-16 border border-leaf/40 bg-leaf/15 ${cls}`}
                      />
                      <p className="mt-2 font-mono text-[10px] text-foreground/65">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </Demo>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-card p-5 text-sm">
                  <p className="font-semibold text-foreground">Container</p>
                  <p className="mt-1.5 text-foreground/70">
                    <Mono>.container-x</Mono> — max-w-[78rem], px-6 md:px-10
                  </p>
                </div>
                <div className="rounded-md border border-border bg-card p-5 text-sm">
                  <p className="font-semibold text-foreground">
                    Section rhythm
                  </p>
                  <p className="mt-1.5 text-foreground/70">
                    <Mono>py-12 md:py-16</Mono> inner pages ·{" "}
                    <Mono>py-20 md:py-28</Mono> hero only
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* 05 — Motion */}
          <Section
            id="motion"
            index="05"
            eyebrow="Motion"
            title="Short, calm, reduced-motion aware"
            intro="150–200ms ease-out for hover, 200–300ms for state changes. No bounce, no spring. Anything beyond a colour fade goes behind motion-safe:."
          >
            <Demo label="hover me — 200ms ease-out colour + lift">
              <div className="flex flex-wrap gap-4">
                <button className="rounded-md border border-border bg-cream-deep px-5 py-3 text-sm font-medium text-foreground transition-colors duration-200 ease-out hover:bg-leaf-deep hover:text-cream">
                  Colour fade
                </button>
                <button className="rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground shadow-sm transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5">
                  Subtle lift (motion-safe)
                </button>
              </div>
            </Demo>
          </Section>

          {/* 06 — Components */}
          <Section
            id="components"
            index="06"
            eyebrow="Components"
            title="The codified pattern library"
            intro="These render the real components from src/components/ui — what you see is what ships."
          >
            <div className="space-y-10">
              {/* Buttons */}
              <div>
                <h3 className="font-semibold text-foreground">Buttons</h3>
                <Demo label="variants — default · outline · secondary · ghost · destructive · link (default h-11, sm h-9 for dense admin rows only)" className="!pb-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button>Default</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </Demo>
                <div className="mt-4">
                  <Demo label="MASTER recipes — primary CTA (h-12) & cancel">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="lg" className="font-semibold">
                        Book this shift
                      </Button>
                      <Button
                        variant="outline"
                        className="border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep"
                      >
                        Cancel booking
                      </Button>
                    </div>
                  </Demo>
                </div>
              </div>

              {/* Badges & pills */}
              <div>
                <h3 className="font-semibold text-foreground">
                  Badges &amp; pills
                </h3>
                <Demo label="Badge component variants">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </Demo>
                <div className="mt-4">
                  <Demo label="<StatusPill tone=…> — patterns/status-pill">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone="positive">Confirmed</StatusPill>
                      <StatusPill tone="warning">Almost full</StatusPill>
                      <StatusPill tone="danger">Cancelled</StatusPill>
                      <StatusPill tone="info">First shift</StatusPill>
                      <StatusPill tone="neutral">Not marked yet</StatusPill>
                      <StatusPill tone="solid">Attended</StatusPill>
                    </div>
                  </Demo>
                </div>
              </div>

              {/* Cards & callouts */}
              <div>
                <h3 className="font-semibold text-foreground">
                  Cards &amp; callouts
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-card p-6 shadow-sm md:p-8">
                    <p className="eyebrow text-leaf-deep">Standard card</p>
                    <p className="mt-2 font-semibold text-foreground">
                      White on cream
                    </p>
                    <p className="mt-1.5 text-sm text-foreground/70">
                      <Mono>bg-card</Mono> on <Mono>bg-background</Mono>,
                      rounded-md, shadow-sm.
                    </p>
                  </div>
                  <div className="rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                      Note from the team
                    </p>
                    <p className="mt-1 text-sm text-foreground/85">
                      Quiet pull-quote — no border, left leaf rule, on
                      cream-deep.
                    </p>
                  </div>
                </div>
                <EmptyState
                  className="mt-4"
                  action={{ href: "/shifts", label: "Browse open shifts →" }}
                >
                  Nothing here yet.
                </EmptyState>
              </div>

              {/* Definition list */}
              <div>
                <h3 className="font-semibold text-foreground">
                  Definition list
                </h3>
                <Demo label="used on shift detail — mono label over value">
                  <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    {[
                      ["When", "Sat 24 May · 9:00–12:00"],
                      ["Where", "Fair Food, Onehunga"],
                      ["Programme", "Food rescue sort"],
                      ["Spaces left", "4 of 12"],
                    ].map(([dt, dd]) => (
                      <div key={dt}>
                        <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/65">
                          {dt}
                        </dt>
                        <dd className="mt-1 text-foreground/85">{dd}</dd>
                      </div>
                    ))}
                  </dl>
                </Demo>
              </div>

              {/* Form field */}
              <div>
                <h3 className="font-semibold text-foreground">Form field</h3>
                <Demo label="<FormField> — visible label · h-11 · helper · linked error · required">
                  <div className="max-w-sm space-y-5">
                    <FormField
                      id="ds-email"
                      label="Email"
                      required
                      error="Enter a valid email address."
                    >
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        defaultValue="not-an-email"
                      />
                    </FormField>
                    <FormField
                      id="ds-note"
                      label="Anything we should know?"
                      optional
                      helper="Helps coordinators plan the shift."
                    >
                      <Textarea placeholder="Dietary needs, access requirements, anything else…" />
                    </FormField>
                  </div>
                </Demo>
              </div>

              {/* Alert */}
              <div>
                <h3 className="font-semibold text-foreground">
                  Inline alert
                </h3>
                <Demo label="the auth-form error pattern">
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive"
                  >
                    <X className="mt-0.5 size-5 shrink-0" aria-hidden />
                    <p className="text-sm font-medium">
                      That email or password didn&apos;t match. Try again.
                    </p>
                  </div>
                </Demo>
              </div>

              {/* Tabs */}
              <div>
                <h3 className="font-semibold text-foreground">Tabs</h3>
                <Demo label="Tabs component">
                  <Tabs defaultValue="upcoming">
                    <TabsList>
                      <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                      <TabsTrigger value="past">Past</TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="upcoming"
                      className="pt-4 text-sm text-foreground/75"
                    >
                      Your next shift is Saturday — see you there.
                    </TabsContent>
                    <TabsContent
                      value="past"
                      className="pt-4 text-sm text-foreground/75"
                    >
                      You&apos;ve done 12 shifts. Ka pai!
                    </TabsContent>
                  </Tabs>
                </Demo>
              </div>

              {/* Accordion */}
              <div>
                <h3 className="font-semibold text-foreground">Accordion</h3>
                <Accordion className="mt-4 rounded-md border border-border bg-card">
                  {[
                    [
                      "Do I need experience?",
                      "Not at all — every shift has a coordinator who shows you the ropes.",
                    ],
                    [
                      "What should I wear?",
                      "Closed shoes and clothes you don't mind getting a little messy.",
                    ],
                  ].map(([q, a], i) => (
                    <AccordionItem
                      key={q}
                      value={`item-${i}`}
                      className="border-b last:border-b-0"
                    >
                      <AccordionTrigger className="px-5 py-4 text-left text-base font-semibold hover:no-underline">
                        {q}
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 text-[0.95rem] leading-relaxed text-foreground/75">
                        {a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              {/* Separator & skeleton */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Demo label="Separator">
                  <p className="text-sm text-foreground/70">Section one</p>
                  <Separator className="my-4" />
                  <p className="text-sm text-foreground/70">Section two</p>
                </Demo>
                <Demo label="Skeleton — loading >300ms">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </Demo>
              </div>
            </div>
          </Section>

          {/* 07 — Voice & copy */}
          <Section
            id="voice"
            index="07"
            eyebrow="Voice & copy"
            title="Warm, second person, lightly bilingual"
            intro="The examples below show the volunteer-facing voice. Te reo Māori sprinkles belong on public/volunteer surfaces only — admin and coordinator screens stay in plain English."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-card p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-leaf-deep">
                  Do
                </p>
                <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                  <li>&ldquo;Kia ora — you&apos;re booked for Saturday.&rdquo;</li>
                  <li>&ldquo;Ka pai! That&apos;s your 10th shift.&rdquo;</li>
                  <li>&ldquo;Browse open shifts →&rdquo;</li>
                  <li className="font-mono text-xs text-foreground/65">
                    est. 2011 · place Tāmaki Makaurau
                  </li>
                </ul>
              </div>
              <div className="rounded-md border border-border bg-card p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-tomato-deep">
                  Don&apos;t
                </p>
                <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                  <li>&ldquo;Click here&rdquo; / &ldquo;Submit&rdquo;</li>
                  <li>Māori headings on admin screens</li>
                  <li>More than one sprinkle per heading</li>
                  <li>
                    <Mono>--</Mono> instead of a real em-dash —
                  </li>
                </ul>
              </div>
            </div>
          </Section>

          {/* 08 — A11y & anti-patterns */}
          <Section
            id="a11y"
            index="08"
            eyebrow="A11y & anti-patterns"
            title="Non-negotiables"
            intro="These hold on every surface. If a design fights one of these, the design changes — not the rule."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-leaf/30 bg-leaf/5 p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-leaf-deep">
                  Always
                </p>
                <ul className="mt-3 space-y-2.5 text-sm text-foreground/80">
                  {[
                    "≥4.5:1 text contrast — text uses leaf-deep / tomato-deep, never leaf / tomato",
                    "Solid leaf-deep focus ring with offset (wired via --ring)",
                    "Touch targets ≥44pt — Button/Input defaults are h-11",
                    "Form errors linked to the field (<FormField>) and announced",
                    "Consequential actions confirm via <ConfirmDialog>",
                    "Sensitive admin flags collapsed until clicked",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-leaf-deep"
                        aria-hidden
                      />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-tomato/30 bg-tomato/5 p-5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-tomato-deep">
                  Never
                </p>
                <ul className="mt-3 space-y-2.5 text-sm text-foreground/80">
                  {[
                    "SaaS gradients, glassmorphism, or neon",
                    "Emoji as functional icons (use Lucide)",
                    "New font families beyond Poppins + mono",
                    "Text below foreground/65, or white on leaf / tomato",
                    "Spinners >300ms without a skeleton or copy",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <X
                        className="mt-0.5 size-4 shrink-0 text-tomato-deep"
                        aria-hidden
                      />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-10 border-t border-border pt-6 text-sm text-foreground/65">
              Source of truth:{" "}
              <Mono>design-system/MASTER.md</Mono> ·{" "}
              <Mono>src/app/globals.css</Mono>. Keep this page in lockstep when
              tokens change.
            </p>
          </Section>
        </main>
      </div>
    </div>
  );
}
