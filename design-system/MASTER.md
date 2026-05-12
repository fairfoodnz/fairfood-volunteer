# Fair Food Volunteer — Design System

The visual language is **editorial community zine, not SaaS dashboard**: warm cream backgrounds, hand-typeset feel, te reo Māori greetings, polaroid photography. Build on what's in `src/app/globals.css` — do not introduce new primary colours, fonts, or radii.

## Tokens (already defined in globals.css — use, don't redefine)

### Colour
| Token | OKLCH | Use |
|---|---|---|
| `cream` | `0.965 0.012 75` | Page background |
| `cream-deep` | `0.93 0.02 75` | Section banding, secondary cards, code/note callouts |
| `leaf` | `0.62 0.17 142` | Primary CTAs, focus ring, accent dot |
| `leaf-deep` | `0.5 0.16 142` | CTA hover, links, eyebrow accent text |
| `forest` | `0.22 0.04 140` | Reserved — deep emphasis only |
| `charcoal` | `0.18 0.012 140` | Body text (`foreground`) |
| `tomato` | `0.66 0.19 32` | Warning, low-capacity badge, destructive accent |
| `destructive` | `0.58 0.22 27` | Cancel buttons, error text |
| `border` | `0.88 0.014 75` | All borders |

**Foreground opacity ladder** (use these, not new greys): `text-foreground` (100), `text-foreground/85` (body emphasis), `text-foreground/70` (secondary), `text-foreground/55` (mono labels), `text-foreground/50` (very muted).

### Typography
- **Display & body:** Poppins (`font-sans`, `display` class) — `tracking-tight`, `letter-spacing: -0.035em` on display headings
- **Mono accents:** Geist Mono (`font-mono`) — lowercase or UPPERCASE eyebrows only, never body
- **Eyebrow:** `.eyebrow` utility (mono, uppercase, `tracking-[0.18em]`, muted)
- **Scale:** 4xl/5xl for hero h1, 2xl–3xl for section h2, base/lg body, xs–sm for mono labels

### Spacing & shape
- Container: `.container-x` (`max-w-[78rem]`, `px-6 md:px-10`)
- Radius scale is tight: base `0.25rem`. Use `rounded-md` (0.2rem) for cards, `rounded` for chips, full only for pills/avatars
- Section vertical rhythm: `py-12 md:py-16` for inner pages, `py-20 md:py-28` for hero only

### Motion
- Default: 150–200ms ease-out for hover; 200–300ms for state transitions. No bounce, no spring.
- Respect `prefers-reduced-motion` — Tailwind's `motion-safe:` utility for anything beyond simple colour fades.

## Pattern library (codify what's already on the site)

### Eyebrow
```tsx
<p className="eyebrow text-leaf-deep">Eyebrow text</p>
```
Optionally prefixed with a dot: `<span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf" />`.

### Display heading
```tsx
<h1 className="display text-balance text-4xl font-bold leading-tight md:text-5xl">
  Headline goes here.
</h1>
```
Wrap a single keyword in `text-leaf-deep` to colour-highlight it. Use `em` (`<em className="not-italic">word</em>`) to gently emphasise without italics.

### Card
```tsx
<div className="rounded-md border border-border bg-card p-6 shadow-sm md:p-8">…</div>
```
Background `bg-card` (white) sits on `bg-background` (cream). Use `bg-cream-deep` for nested or quieter callouts (no border + left accent rule).

### Quiet note / pull-quote
```tsx
<div className="rounded-md border-l-2 border-leaf bg-cream-deep px-5 py-4 text-sm">
  <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">Note from the team</p>
  <p className="mt-1 text-foreground/85">…</p>
</div>
```

### Empty state
Dashed border, centred, with a single inline link CTA in `leaf-deep`. No illustration heavier than a small `ProgramArt` icon.
```tsx
<div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
  <p className="text-foreground/70">Nothing here yet. <Link className="font-semibold text-leaf-deep underline-offset-4 hover:underline" href="…">Do the thing →</Link></p>
</div>
```

### Definition list (used on shift detail)
Mono label above value, two-column on `sm`.
```tsx
<dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
  <div>
    <dt className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">Label</dt>
    <dd className="mt-1 text-foreground/85">Value</dd>
  </div>
</dl>
```

### Pill / badge
- Confirmed/positive: `bg-leaf/15 text-leaf-deep`
- Warning/low-capacity: `bg-tomato/15 text-tomato`
- Neutral: `bg-foreground/10 text-foreground/65`
- Solid emphasis: `bg-leaf text-cream`

### Primary CTA button
```tsx
<Button size="lg" className="h-12 bg-leaf text-base font-semibold hover:bg-leaf-deep">…</Button>
```
Secondary: `variant="outline"`. Tertiary: `variant="ghost"`. Destructive (cancel): `border-tomato/40 text-tomato hover:bg-tomato/10 hover:text-tomato` on an outline.

### Form field
- Visible `<Label>` above input (never placeholder-only)
- `Input` / `Textarea` height `h-11` (≥44pt touch) for sign-in / booking
- Helper text below field in `text-xs text-foreground/55`
- Required asterisk: `<span className="text-tomato">*</span>` after the label text
- Error state: render `<p className="text-sm text-destructive">…</p>` directly below the field
- Group `space-y-2` per field, `space-y-5` between fields

### Voice & copy
- te reo Māori sprinkles: "Kia ora", "Ka pai", "kaiāwhina", "whānau" — never overuse; one per page max in headings
- Friendly second person ("you're booked"), em-dashes for warmth (`—`, not `--`)
- Mono micro-labels in lowercase for facts ("est. 2011", "place Tāmaki Makaurau"); UPPERCASE for eyebrows and dt labels

## A11y baseline (non-negotiable)
- All interactive elements must have ≥4.5:1 contrast against their background — verify `leaf` and `tomato` foregrounds, not just charcoal
- Focus ring: leaf at 2–3px, already wired via `--ring`
- Touch targets ≥44pt — keep buttons at `h-11`/`h-12`, never `h-8` on a tap target
- Form errors live near the field AND use `aria-live="polite"` on the error region
- Sensitive content (arrest/health flags in admin) defaults collapsed; click to reveal — never indexed in page title or visible without intent

## Anti-patterns for this project
- No SaaS gradients, no glassmorphism, no neon
- No emoji as functional icons (use Lucide / the custom `ProgramArt`/`illustrations.tsx` set)
- No new font families — Poppins + Geist Mono only
- No grey-on-grey low-contrast text — stick to the foreground opacity ladder
- No full-bleed photos competing with text without an overlay (see `programs-grid` fade)
- No "click here" — link text describes destination ("Browse open shifts →")
- No spinners over 300ms without an inline skeleton or "Sending…" copy
