# /admin/flagged - Volunteers needing a chat

**Inherits** `MASTER.md`. Privacy-first surface, admin-only.

## Purpose
Lists users where `arrestHistory === true` OR `healthConditions === true`. Coordinators have a chat before the volunteer's first shift, then mark them reviewed. **This data is sensitive - design for restraint, not visibility.**

The page is a **work queue, not a register**. The question it answers is "who do I need to talk to next?", so the default view is only the people still waiting, ordered by how soon they turn up. (The original design was two flat lists and assumed ~30 people; production passed 60 and it stopped being usable.)

## Access
Route guarded by `role === ADMIN`. Render 404 (not 403) for non-admins to avoid leaking the page's existence.

## Information architecture
1. **Header** - eyebrow "Volunteers", h1 "Needs review", the don't-share sub-copy.
2. **Progress band** - one `bg-forest text-cream` panel, three figures: *Waiting for a chat* (the big number), *With a shift coming up* (+ when the next one is), *Reviewed so far* (n of total + leaf progress bar). Dot-grid texture only, no gradients. On mobile the big number spans the top and the other two sit side by side so the band stays under one screen.
3. **Views** - underline links with live counts: **To review** (default, bare URL) · **Reviewed** · **Everyone**. Real links with `aria-current`, not ARIA tabs.
4. **Filters** - disclosure-type segmented control (Any / Arrest history / Health) and a name/email search. All state lives in the URL (`view`, `type`, `q`); defaults stay out of it. View counts honour type + search.
5. **Groups**, in this order, empty ones dropped:
   - **Shift coming up** - unreviewed with an upcoming confirmed booking, soonest shift first. Countdown pill per row; today/tomorrow gets the solid `bg-forest` pill.
   - **Nothing booked yet** - unreviewed, no deadline, newest flag first.
   - **Reviewed** - most recently reviewed first.

**One row per person.** Someone flagged on both questions is one row with two chips, not two cards - the type filter is how a coordinator scans one kind at a time.

All of the view logic is pure and lives in `src/app/admin/flagged/query.ts` (unit-tested in `tests/unit/flagged.test.ts`). The page fetches every flagged volunteer once and derives counts, groups and the band from the same array so they can't disagree.

## Row (default state: COLLAPSED)
```
(AW)  Anaru W.  [First shift]      [In 5 days] Sat 26 Sept, 9:00 am  Kai Sorting      [Reveal notes v]
      [ARREST HISTORY] [HEALTH]    Flagged 24 Aug 2026
```
- Rows sit in one `rounded-xl border bg-card` list with `divide-y`, not separate cards - 60+ people need the density.
- Name is first name + last initial until revealed (same privacy ladder as the volunteer-facing roster).
- "First shift" badge comes from `isFirstTimer()` - never re-derive it.
- Reviewed rows swap the initials for a leaf tick.

## Revealed state
- **Notes, full name, email and phone are not in the page at all until "Reveal notes" is clicked.** The list query doesn't select them; `revealFlagAction` fetches them on demand, and "Hide notes" drops them from the DOM again. A screen-share or screenshot of the list leaks nothing.
- Left column "Get in touch": mailto, tel, link to their next shift, link to the full volunteer profile.
- Right column: one quiet-note block (`border-l-2 border-leaf bg-cream-deep`) per disclosure. A "yes" with blank details says so and prompts a follow-up.
- Mono cue "Revealed by you · 2:32 pm" (audit cue, not actually logged).
- "Mark as reviewed" is the single primary action; on a reviewed row it becomes an outline "Move back to review". Both toast with **Undo**. Marking reviewed also refreshes the sidebar badge.

## Empty states
Dashed card, `MASTER.md` pattern, one inline link each: filters matched nobody → "Clear filters"; queue empty → "All caught up" + link to Reviewed; nothing flagged at all → "Nothing flagged right now."

## Mobile
- Rows stack: identity, shift line, full-width reveal button.
- Reveal stays inline; do not switch to a modal on mobile - the inline disclosure is the privacy affordance.

## What NOT to do
- No bulk export, no CSV download, no "select all and email", no bulk "mark all reviewed" - this data does not leave the page, and a review means a conversation happened.
- No tomato/red colour - these aren't dangerous people, they're volunteers we need to chat with. Urgency is carried by ordering and the solid forest pill, never by alarm colours.
- Never ship notes or contact details in the initial render, even visually hidden.
- No te reo sprinkles - admin surfaces stay plain English.
