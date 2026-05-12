# /me/profile/complete — Volunteer questionnaire

**Inherits** `MASTER.md`. Page-specific deviations below.

## Purpose
First-time questionnaire shown *after sign-in, before any shift booking*. Driven by `User.profileCompletedAt` being null. Server action gates `bookShiftAction` — if profile incomplete, redirect here.

## Fields (in order, single page — not multi-step)
1. **Name** (read-only, taken from sign-up; show as confirmation, allow inline edit)
2. **Phone** *(required)* — `tel`, `autocomplete="tel"`, NZ format hint
3. **Birthday** *(required)* — three selects (day / month / year) or native `<input type="date">`. Hint: "We bake a little extra on your kai day."
4. **How did you hear about Fair Food?** *(required)* — `<select>` with options: Friend or whānau, Social media, Search, Workplace, Event, Other; "Other" reveals a free-text field
5. **Why are you interested in volunteering?** *(required)* — `Textarea`, 3 rows, 500 char soft limit, helper "A sentence or two is plenty."
6. **Have you been arrested or incarcerated?** *(required Yes/No)* — radio pair, large click target; if Yes, conditional `Textarea` "Anything you'd like us to know? (kept private to the volunteer coordinator)" with progressive disclosure
7. **Do you have any health conditions we should know about?** *(required Yes/No)* — same pattern, "kept private, used only on the day to keep you safe"

## Layout
- Single `container-x` page, max content width `max-w-2xl mx-auto`
- Header card with eyebrow "Kia ora, [first name]" and h1 "Let's get you sorted before your first shift."
- Sub-copy: "Three minutes of paperwork. We use this to roster safely and to remember who you are next time."
- Fields stacked in **one `bg-card` card**, `space-y-6` between fields
- Sticky bottom action row on mobile (`fixed inset-x-0 bottom-0 border-t bg-card p-4 md:static md:border-0 md:bg-transparent md:p-0`)
- Primary CTA "Save and continue →" full-width on mobile, right-aligned `auto` on desktop
- Secondary "Save for later" ghost button → redirect to `/me`

## Sensitive question UX
- Radio cards (not bare radios): two `<label>` blocks side-by-side, each `rounded-md border border-border p-4 has-[input:checked]:border-leaf has-[input:checked]:bg-leaf/5`
- Conditional follow-up textarea slides in with `motion-safe:animate-in fade-in slide-in-from-top-2 duration-200`
- Helper text under the question, NOT the field: italic-ish weight (regular `text-foreground/65 text-sm`), explaining privacy ("Visible only to the volunteer coordinator.")
- **No checkbox "I agree to share"** — answering the question IS the consent. Don't double-prompt.

## Validation
- Inline `onBlur`; show error below field in `text-sm text-destructive`
- On submit error: scroll-into-view + focus the first invalid field
- Submit feedback: button shows "Saving…" while pending, then redirect to `/me?welcome=1` (which shows the success banner)

## A11y
- `<fieldset>` + `<legend>` for the Yes/No questions (legend is the question itself, visually styled like a label)
- `role="alert"` + `aria-live="polite"` on the field error span
- Conditional textarea must use `aria-expanded` on the parent fieldset

## What NOT to do
- No multi-step wizard with 7 steps — it's 7 questions, fits on one screen scroll on mobile
- No skip button on the two flagged questions — make the answer required even if it's "No"
- No emojis on the radio cards
- No tomato/red on the "Yes" arrest/health answer — it's a neutral answer, not a warning
