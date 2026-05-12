# /admin/documents — Upload & manage resources

**Inherits** `MASTER.md`. Admin-only counterpart to `/resources`.

## Purpose
Admins upload, re-categorise, replace, and delete documents stored in Garage. Volunteer-facing `/resources` reflects this list.

## Layout
- Page header: eyebrow "Admin · Resources", h1 "Volunteer kete", sub-copy on where uploads go
- Two-column on `lg`: left = upload area (`lg:col-span-1`), right = existing documents list (`lg:col-span-2`)

## Upload area (left column)
- `rounded-md border-2 border-dashed border-border bg-cream-deep p-8 text-center transition-colors`
- Dashed border thickens to `border-leaf` on `dragover`
- Body: Lucide `Upload` icon (32px, `text-leaf-deep`), then "Drop a file here or click to choose", then mono `text-xs text-foreground/55` "PDF · DOCX · JPG · PNG up to 25 MB"
- Hidden `<input type="file">` triggered by clicking the card
- After file selected (before upload): metadata form fields appear in the same card — Title, Category dropdown, Description, then "Upload" button (`bg-leaf hover:bg-leaf-deep`) and "Cancel" ghost
- Upload progress: replace the icon with a thin determinate progress bar (`h-1.5 bg-leaf rounded-full`), keep the filename visible. No spinning circles.

## Documents list (right column)
- Section heading per category (matches `/resources` grouping)
- Each row: thin `bg-card` card, single-line layout on desktop, stacks on mobile
  ```
  [glyph] Volunteer handbook     PDF · 2.4 MB · 4 May    [Replace] [Edit] [Delete]
  ```
- Actions are `variant="ghost" size="sm"`, except Delete which uses the destructive outline pattern (tomato)
- Delete = confirmation dialog: "Delete handbook for everyone?" with "Cancel" (default focus) and "Delete" (tomato). Soft-delete is fine — set `deletedAt` — but show as gone on `/resources`.

## File constraints
- Whitelist mime types server-side: `application/pdf`, common image types, `application/msword`, `application/vnd.openxmlformats-*`
- Max 25 MB enforced server-side AND in the form
- Files renamed to `documents/{cuid}.{ext}` in the bucket; original filename stored in `title` field

## Error states
- Upload failure: red banner above the upload card with the error and a "Try again" button. Don't lose the form values.
- Rejected mime type: inline error "We can only take PDFs, Word docs, and images right now."
- Too large: inline error "That file is bigger than 25 MB — please compress it or split it up."

## A11y
- Drag/drop area also responds to keyboard (Enter/Space activates the file picker)
- Live region announces upload progress milestones (25/50/75/100%) — `aria-live="polite"`
- Each delete confirmation dialog uses `role="alertdialog"`

## What NOT to do
- No reorder-by-drag in v1 — alphabetical within category is fine
- No image cropping or PDF preview — admin uploads exactly what volunteers download
- No version history — replace overwrites the object key (after deleting the previous one to avoid orphans)
