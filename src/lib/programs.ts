export const CORPORATE_MAILTO =
  "mailto:volunteering@fairfood.org.nz?subject=Corporate%20volunteering";

/**
 * Inclusive volunteering runs by arrangement with pre-registered groups, so it
 * is shown but never self-serve bookable: every public surface routes enquiries
 * to volunteering@fairfood.org.nz instead of the booking flow. Identified by
 * this stable seed slug; keep in lockstep with `prisma/seed.ts`.
 */
export const INCLUSIVE_SLUG = "inclusive";

export const INCLUSIVE_MAILTO =
  "mailto:volunteering@fairfood.org.nz?subject=Inclusive%20volunteering%20enquiry";

/** Public path for a programme detail page. */
export function programHref(slug: string) {
  return `/programs/${slug}`;
}

/**
 * Turn a free-form title into a URL-safe slug. Used both client-side (live
 * preview as the coordinator types) and server-side (source of truth). Strips
 * accents/macrons so "Pack Kai Boxes" → "pack-kai-boxes".
 */
export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Display URL for a programme image. Seeded programmes ship a static path in
 * `imageUrl`; uploaded ones are streamed from Garage via the public route.
 */
export function programmeImageSrc(p: {
  id: string;
  imageUrl: string | null;
  imageKey: string | null;
}): string | null {
  if (p.imageKey) return `/api/programmes/${p.id}/image`;
  return p.imageUrl ?? null;
}

export function formatShiftRange(start: Date, end: Date) {
  // Compare the NZ calendar date, not `toDateString()` — the latter uses the
  // process's ambient zone (UTC on CI / in the Docker image), so a shift that
  // crosses NZ midnight while staying within one UTC day would otherwise be
  // mislabelled as single-day. "en-CA" yields a sortable "YYYY-MM-DD".
  const nzDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const sameDay = nzDay.format(start) === nzDay.format(end);
  const dateFmt = new Intl.DateTimeFormat("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Pacific/Auckland",
  });
  const timeFmt = new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Pacific/Auckland",
  });
  if (sameDay) {
    return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }
  return `${dateFmt.format(start)} – ${dateFmt.format(end)}`;
}

export function dayOfWeek(d: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    timeZone: "Pacific/Auckland",
  }).format(d);
}
