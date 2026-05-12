# /admin/flagged — Volunteers needing a kōrero

**Inherits** `MASTER.md`. Privacy-first surface, admin-only.

## Purpose
Lists users where `arrestHistory === true` OR `healthConditions === true`. Coordinators review before approving shifts. **This data is sensitive — design for restraint, not visibility.**

## Access
Route guarded by `role === ADMIN`. Render 404 (not 403) for non-admins to avoid leaking the page's existence.

## Layout
- Page header: eyebrow "Admin · Volunteers", h1 "Kōrero needed"
- Sub-copy: "These volunteers flagged something on their profile. Have a chat before their first shift. Don't share these notes outside the coordinator team."
- Two horizontal-scroll-safe sections, with mono divider labels:
  - `arrest history` — list of cards
  - `health conditions` — list of cards
- A volunteer flagged on both shows under both sections (don't dedupe — coordinator may scan one at a time)

## Volunteer card (default state: COLLAPSED)
```
[avatar/initial]  Aroha W.            Joined 12 Apr 2026          [Reveal notes ▾]
                  aroha@…  ·  021…    Last booked: Sat 3 May
```
- `rounded-md border border-border bg-card p-5`
- Name uses first name + last initial *in admin*, full name on reveal (keep the privacy ladder consistent with the volunteer-facing roster)
- Right-aligned "Reveal notes" button — `variant="outline"` size `sm`. Until clicked, the answer details are hidden from the DOM entirely (not just `hidden`), so a screenshot/screen-share doesn't accidentally show them.

## Revealed state
- Pushes a `bg-cream-deep` block below the card header with the notes
- Adds a mono timestamp "Revealed by you · 14:32" at top of the block (audit cue, not actually logged)
- Includes a "Mark as reviewed" button — sets a `reviewedAt` field on the User; reviewed cards collapse to a thin row at the bottom of each section in a `text-foreground/55` style

## Empty state
"Nothing flagged. Mā te wā." — dashed card, same pattern as `MASTER.md` empty state.

## Mobile
- Cards stack full-width
- Reveal action keeps the same row position; do not switch to a modal on mobile — the inline disclosure is the privacy affordance

## What NOT to do
- No bulk export, no CSV download, no "select all and email" — this data does not leave the page
- No notification dot in the main nav linking here (would advertise that someone flagged something)
- No tomato/red colour — these aren't dangerous people, they're volunteers we need to chat with. Use the neutral palette only.
- No search/filter input — keep the list short by design. If it grows past ~30 entries the coordinator should be using a different tool.
