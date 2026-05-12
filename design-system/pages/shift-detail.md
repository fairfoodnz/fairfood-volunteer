# /shifts/[id] — Shift detail (roster addition)

**Inherits** `MASTER.md`. Existing page; this override covers only the new "Who else is coming" addition and the new cancel-from-detail action.

## Roster section
Insert above the booking aside on mobile, and inline below the program description on desktop. Visible to **everyone**, signed-in or not — feedback says volunteers want to know who's coming before signing in.

### Layout
- Eyebrow: "Going · 5 of 8"
- Row of first-name "chips" using existing `bg-leaf/15 text-leaf-deep` pill style:
  ```
  Aroha   Sam   Manaia   Te Aroha   Hineārangi   +3 more
  ```
- Chip: `rounded-full px-3 py-1 text-sm font-medium`, mono-spaced number for "+N more"
- Soft wrap, no horizontal scroll
- If empty: "Be the first to put your name down." in `text-sm text-foreground/65`

### What goes in the chip
- `User.name.split(" ")[0]` only (full first name per user's choice, no last initial)
- If a name appears twice, append the last initial to disambiguate ("Sam K.", "Sam T.") — done at render time
- Cancelled bookings never appear

### Privacy
- No avatars, no emails, no phone numbers
- A signed-in user sees their own name as `**You**` in `font-semibold text-leaf-deep`, in the first chip position
- Admins see the same view as volunteers here — for the full roster they go to `/admin/shifts/[id]`

## Cancel from this page (signed-in, booked, upcoming shifts only)
Replace the current "You're booked in" note with a card containing:
- Heading "You're booked in. See you then." (existing copy)
- Mono micro-label "your shift" above the date
- Two actions in a row: `Link` to `/me` (ghost) and a Cancel button (destructive outline pattern from MASTER)
- Cancel must show a confirmation: AlertDialog "Cancel this shift?" body "We'll free your spot for someone else. You can always rebook." with "Keep my spot" (default) and "Cancel shift" (tomato).

## What NOT to do
- No "Invite a friend" share button — out of scope, and adds privacy questions
- No countdown timer to the shift
- No live update / polling — server action `revalidatePath` is sufficient
- No avatar circles even with initials — keep the chip pattern flat to match the program-pill aesthetic on `/shifts`
