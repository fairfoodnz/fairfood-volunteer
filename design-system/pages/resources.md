# /resources — Volunteer handbook & docs

**Inherits** `MASTER.md`. Volunteer-facing read of documents uploaded by admins to Garage (S3).

## Purpose
Single page where volunteers download the handbook, H&S info, site map, etc. Linked from the main nav (`Resources` after `Shifts`) and from the welcome banner on first sign-in.

## Layout
- Standard page header: eyebrow "Volunteer kete", h1 "Things to read before you come in.", sub-copy a sentence on why these exist
- Group documents by `category` (e.g. _Handbook_, _Health & safety_, _Getting here_, _Forms_). Categories render as h2 with mono divider above.
- Within a category, render documents in a 1- or 2-column grid of cards (`md:grid-cols-2`)

## Document card
```
[file-type glyph]  Volunteer handbook
                   PDF · 2.4 MB · Updated 4 May 2026
                   A walk-through of a typical shift, what to wear, who to ask.

                   [Download PDF →]
```
- `rounded-md border border-border bg-card p-5 transition-colors hover:border-leaf/40`
- Glyph is a Lucide icon picked from mime type (`FileText` for pdf, `Image` for images, `Map` for the map). 32px, in `text-leaf-deep`.
- Title: `font-semibold text-base`
- Meta row: mono `text-xs text-foreground/55`
- Optional description (set by admin): one line, `text-sm text-foreground/75`
- Download link uses a signed URL (15-minute TTL) generated server-side. Open in new tab (`target="_blank" rel="noopener"`) so the volunteer doesn't lose the page.

## Empty state
"The team is still putting the kete together — check back soon." Dashed card.

## A11y
- Each card is a `<article>` with the title as `<h3>`
- Download link is a real `<a>`, not a button — uses browser download semantics
- File size announced in the link's `aria-label` ("Download Volunteer handbook, PDF, 2.4 megabytes")

## What NOT to do
- No inline PDF preview iframe — slow, breaks on mobile, accessibility nightmare. Download only.
- No "Save to my profile" feature — out of scope
- No search/filter — at <20 documents, category groupings are enough
- No big hero image with stacked polaroids on this page; keep it library-quiet
