# Fair Food Volunteer — Design System

The visual language is **editorial community zine, not SaaS dashboard**: warm cream backgrounds, hand-typeset feel, te reo Māori greetings, polaroid photography. Build on what's in `src/app/globals.css` — do not introduce new primary colours, fonts, or radii.

## Tokens (already defined in globals.css — use, don't redefine)

### Colour
| Token | OKLCH | Use |
|---|---|---|
| `cream` | `0.965 0.012 75` | Page background |
| `cream-deep` | `0.93 0.02 75` | Section banding, secondary cards, code/note callouts |
| `leaf` | `0.62 0.17 142` | **Decorative only** — accent dots, rules, tints (`bg-leaf/10`), icons, display-size type |
| `leaf-deep` | `0.5 0.16 142` | Primary CTA fill (`--primary`), focus ring (`--ring`), links, accent text — 5.1:1 on cream, white on it 5.6:1 |
| `leaf-ink` | `0.43 0.14 142` | CTA hover / pressed |
| `forest` | `0.22 0.04 140` | Reserved — deep emphasis only |
| `charcoal` | `0.18 0.012 140` | Body text (`foreground`) |
| `tomato` | `0.66 0.19 32` | **Decorative only** — warning dots, tints (`bg-tomato/10`), borders (`border-tomato/40`) |
| `tomato-deep` | `0.52 0.19 32` | Warning text, low-capacity pill text, cancel-outline text — 5.5:1 on cream |
| `destructive` | `0.52 0.2 27` | Error text, destructive confirm buttons |
| `border` | `0.88 0.014 75` | Card/divider hairlines |
| `input` | `0.62 0.02 75` | Form-field borders (3:1, WCAG 1.4.11) |

**Why the -deep split:** `leaf` and `tomato` only reach ~3.1–3.4:1 — fine for large display type and non-text decoration, not for body-size text or white-on-fill buttons. If text sits on it or it *is* the text, use the -deep step.

**Foreground opacity ladder** (use these, not new greys): `text-foreground` (100), `text-foreground/85` (body emphasis), `text-foreground/70` (secondary, eyebrows), `text-foreground/65` (mono labels, very muted). **`/65` is the floor** (5.6:1) — never go lower for text.

### Typography
- **Display & body:** Poppins (`font-sans`, `display` class) — `tracking-tight`, `letter-spacing: -0.035em` on display headings
- **Mono accents:** Geist Mono (`font-mono`, loaded via `next/font` in `layout.tsx`) — lowercase or UPPERCASE eyebrows only, never body
- **Eyebrow:** `.eyebrow` utility (mono, uppercase, `tracking-[0.18em]`, `text-foreground/70`)
- **Scale:** 4xl/5xl for hero h1, 2xl–3xl for section h2, base/lg body, xs–sm for mono labels

### Spacing & shape
- Container: `.container-x` (`max-w-[78rem]`, `px-6 md:px-10`)
- Radius scale is tight: base `0.25rem`. Use `rounded-md` (0.2rem) for cards, `rounded` for chips, full only for pills/avatars
- Section vertical rhythm: `py-12 md:py-16` for inner pages, `py-20 md:py-28` for hero only

### Motion
- Default: 150–200ms ease-out for hover; 200–300ms for state transitions. No bounce, no spring.
- Respect `prefers-reduced-motion` — Tailwind's `motion-safe:` utility for anything beyond simple colour fades. `globals.css` also carries a global reduced-motion reset as a backstop.
- Anything that moves on its own for more than 5s (the marquee) pauses on hover/focus.

## Pattern library (codify what's already on the site)

Shared components live in `src/components/patterns/` (volunteer + admin) and `src/components/admin/` (admin-only). Reach for these before hand-rolling markup:

| Component | Use for |
|---|---|
| `PageHeader` | Volunteer-facing page header (eyebrow, h1, lead, actions; `band` for listing pages) |
| `AdminPageHeader` | Every `/admin` page (back link to parent list, eyebrow, h1 without a full stop, actions) |
| `FormField` | Label + required asterisk + helper + linked, announced error around one control |
| `ConfirmDialog` | Every destructive or consequential confirm (alertdialog, safe button focused, pending copy) |
| `EmptyState` | Dashed empty state with one inline link CTA |
| `StatusPill` | All status pills (`positive`, `warning`, `danger`, `info`, `neutral`, `solid`) |
| `StatTile` | Headline numbers in admin |

### Eyebrow
```tsx
<p className="eyebrow">Eyebrow text</p>            {/* default: foreground/70 */}
<p className="eyebrow text-leaf-deep">Accent</p>  {/* optional accent */}
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
Use `<StatusPill tone="…">`. The recipes it encodes:
- Confirmed/positive: `bg-leaf/10 text-leaf-deep`
- Warning/low-capacity: `bg-tomato/10 text-tomato-deep`
- Danger/cancelled: `bg-destructive/10 text-destructive`
- Info (e.g. "First shift"): `bg-clay/10 text-clay`
- Neutral: `bg-foreground/10 text-foreground/75`
- Solid emphasis: `bg-leaf-deep text-white`

The label carries the meaning — never colour alone.

### Primary CTA button
```tsx
<Button size="lg" className="font-semibold">…</Button>   {/* h-12, bg-primary = leaf-deep, hover leaf-ink */}
```
Secondary: `variant="outline"`. Tertiary: `variant="ghost"`. Destructive (cancel): `border-tomato/40 text-tomato-deep hover:bg-tomato/10 hover:text-tomato-deep` on an outline; the confirm inside the dialog is solid `bg-destructive text-white` (ConfirmDialog does this).

Button sizes: default `h-11`, `lg` `h-12`, `icon` `size-11`. `sm` (`h-9`) is for dense **desktop** admin table rows only — never a volunteer-facing control or anything a coordinator taps on a phone on the day (roster actions stay ≥ h-11).

### Form field
Use `<FormField id label required? helper? error?><Input name="…" /></FormField>`. It encodes:
- Visible `<Label>` above input (never placeholder-only)
- `Input` / `SelectTrigger` default to `h-11` (≥44pt touch); fields sit on `bg-card` with a 3:1 `--input` border
- Helper text below field in `text-xs text-foreground/65`, linked via `aria-describedby`
- Required asterisk `text-tomato-deep` after the label text (+ `aria-required`)
- Error in `text-sm text-destructive` directly below the field, linked via `aria-describedby`, `aria-invalid` on the control, inside a persistent polite live region (so it is announced when it appears)
- Group `space-y-2` per field, `space-y-5` between fields

### Confirmation
Every destructive or consequential action (cancel, delete, remove, role change, impersonate) goes through `<ConfirmDialog>`: alertdialog role, the **safe** button has initial focus, the consequence is stated plainly, the confirm button shows pending copy and can't be double-submitted. Never `window.confirm`.

### Voice & copy
- te reo Māori sprinkles: "Kia ora", "Ka pai", "kaiāwhina", "whānau" — never overuse; one per page max in headings
- Friendly second person ("you're booked"), em-dashes for warmth (`—`, not `--`)
- Mono micro-labels in lowercase for facts ("est. 2011", "place Tāmaki Makaurau"); UPPERCASE for eyebrows and dt labels

## A11y baseline (non-negotiable)
- Text ≥4.5:1 against its background: text uses `leaf-deep` / `tomato-deep` / `destructive`, never `leaf` / `tomato`; white text only on `leaf-deep`, `tomato-deep`, `destructive`, forest, clay, ocean or charcoal
- Non-text UI (field borders, focus indicators) ≥3:1
- Focus: solid `leaf-deep` ring, 2px with offset (`--ring`); links get a global `:focus-visible` outline
- Touch targets ≥44pt — primitives default to `h-11`; never `h-8` on a tap target
- Form errors live near the field, linked with `aria-describedby`, announced via a persistent live region (`FormField`)
- A "Skip to content" link targets `<main id="main">` on every page — keep the id on new layouts
- Sensitive content (arrest/health flags in admin) defaults collapsed; click to reveal — never indexed in page title or visible without intent

## Anti-patterns for this project
- No SaaS gradients, no glassmorphism, no neon
- No emoji as functional icons (use Lucide / the custom `ProgramArt`/`illustrations.tsx` set)
- No new font families — Poppins + Geist Mono only
- No grey-on-grey low-contrast text — stick to the foreground opacity ladder
- No full-bleed photos competing with text without an overlay (see `programs-grid` fade)
- No "click here" — link text describes destination ("Browse open shifts →")
- No spinners over 300ms without an inline skeleton or "Sending…" copy (route-level `loading.tsx` skeletons for data-heavy pages)
- No hard-coded counts in copy that coordinators can change ("Three ways…" when programmes are editable)
- No promises the product doesn't keep (SMS reminders, cancellation windows) — reword or move to `SITE_COPY`
