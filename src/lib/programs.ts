import type { ProgramVisibility } from "@/generated/prisma";

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

const NZ_TZ = "Pacific/Auckland";

// "en-CA" yields a sortable "YYYY-MM-DD".
const nzDayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: NZ_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const shiftDateFmt = new Intl.DateTimeFormat("en-NZ", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: NZ_TZ,
});
const shiftTimeFmt = new Intl.DateTimeFormat("en-NZ", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: NZ_TZ,
});

/**
 * The NZ calendar date of an instant as "YYYY-MM-DD". Never use
 * `toDateString()` for this — it reads the process's ambient zone (UTC on CI /
 * in the Docker image), so a shift crossing NZ midnight inside one UTC day
 * would be mislabelled.
 */
export function nzDateKey(d: Date) {
  return nzDayFmt.format(d);
}

/**
 * "Wed, 21 Oct · 9:00 am – 12:00 pm". A shift that runs past NZ midnight
 * keeps both times — "Wed, 21 Oct · 10:00 pm – Thu, 22 Oct · 1:00 am" — since
 * the time is the fact a volunteer needs most.
 */
export function formatShiftRange(start: Date, end: Date) {
  const startLabel = `${shiftDateFmt.format(start)} · ${shiftTimeFmt.format(start)}`;
  if (nzDateKey(start) === nzDateKey(end)) {
    return `${startLabel} – ${shiftTimeFmt.format(end)}`;
  }
  return `${startLabel} – ${shiftDateFmt.format(end)} · ${shiftTimeFmt.format(end)}`;
}

/**
 * Times only, for lists already grouped under a date heading:
 * "9:00 am – 12:00 pm". A cross-midnight shift names the day it ends on —
 * "10:00 pm – 1:00 am Thu, 22 Oct" — so the heading never misleads.
 */
export function formatShiftTimes(start: Date, end: Date) {
  const range = `${shiftTimeFmt.format(start)} – ${shiftTimeFmt.format(end)}`;
  if (nzDateKey(start) === nzDateKey(end)) return range;
  return `${range} ${shiftDateFmt.format(end)}`;
}

/**
 * Coarse week bucket for scannable shift lists, Monday-start in NZ time:
 * "This week", "Next week", then "Week of 17 Nov". `dateKey` is an
 * `nzDateKey()`; `todayKey` defaults to today in NZ.
 */
export function nzWeekBucket(
  dateKey: string,
  todayKey: string = nzDateKey(new Date()),
): { key: string; label: string } {
  const monday = mondayOf(dateKey);
  const thisMonday = mondayOf(todayKey);
  const weeks = Math.round((monday - thisMonday) / (7 * 86_400_000));
  const key = new Date(monday).toISOString().slice(0, 10);
  if (weeks <= 0) return { key, label: "This week" };
  if (weeks === 1) return { key, label: "Next week" };
  const label = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(monday);
  return { key, label: `Week of ${label}` };
}

/** UTC-midnight epoch ms of the Monday on or before a "YYYY-MM-DD" date. */
function mondayOf(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const sinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return ms - sinceMonday * 86_400_000;
}

export function dayOfWeek(d: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    timeZone: NZ_TZ,
  }).format(d);
}

// --- Programme visibility -------------------------------------------------
// One enum answers "who can see this programme?" — see the ProgramVisibility
// block in prisma/schema.prisma for the full rationale. These three predicates
// are the only places the enum should be compared by hand; every surface reads
// its rule from here so a new state can't be half-implemented.

/**
 * Shows up in browsable listings: the home grid, /programs, the /shifts roster
 * and filter chips, and the sitemap. PUBLIC only.
 */
export function isListedPublicly(visibility: ProgramVisibility) {
  return visibility === "PUBLIC";
}

/**
 * Reachable by anyone holding the URL, and self-serve bookable. PUBLIC and
 * UNLISTED. PRIVATE/ARCHIVED programmes are admin-run: their pages 404 for
 * everyone except coordinators and the volunteers already on the roster, and
 * their shifts refuse public booking.
 */
export function isLinkVisible(visibility: ProgramVisibility) {
  return visibility === "PUBLIC" || visibility === "UNLISTED";
}

/**
 * Offered when scheduling new shifts in /admin. Everything except ARCHIVED —
 * a private programme still needs shifts, it just doesn't advertise them.
 */
export function isSchedulable(visibility: ProgramVisibility) {
  return visibility !== "ARCHIVED";
}

/**
 * Metadata `robots` value for anything that isn't PUBLIC. An unlisted link
 * that search engines index is not unlisted.
 */
export const NOINDEX = { index: false, follow: false } as const;

export type ProgrammeVisibilityOption = {
  value: ProgramVisibility;
  /** Coordinator-facing name — also the badge text in admin listings. */
  label: string;
  /** One line explaining what actually happens, in the coordinator's terms. */
  hint: string;
};

// Ordered most → least visible, which is also the enum's declaration order, so
// `orderBy: { visibility: "asc" }` sorts admin lists the same way.
export const PROGRAMME_VISIBILITY_OPTIONS: ProgrammeVisibilityOption[] = [
  {
    value: "PUBLIC",
    label: "Public",
    hint: "Listed on the website. Anyone can find it and book a shift.",
  },
  {
    value: "UNLISTED",
    label: "Unlisted",
    hint: "Hidden from the website and search engines. Anyone you send the link to can view it and book.",
  },
  {
    value: "PRIVATE",
    label: "Private",
    hint: "Nobody outside the team can open it. You add volunteers to its shifts yourself from Admin.",
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    hint: "Retired. Hidden everywhere, and you can't schedule new shifts on it.",
  },
];

/** The one-line explanation shown wherever the label alone isn't enough. */
export function programmeVisibilityHint(visibility: ProgramVisibility) {
  return (
    PROGRAMME_VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.hint ?? ""
  );
}

export function programmeVisibilityLabel(visibility: ProgramVisibility) {
  return (
    PROGRAMME_VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ??
    visibility
  );
}
