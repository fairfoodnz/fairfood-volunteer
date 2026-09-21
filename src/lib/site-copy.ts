import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Volunteer-facing wording the coordinators own.
 *
 * Every string here ships with a `fallback` and is overridden by a SiteSetting
 * row only when a coordinator has saved something. That ordering is deliberate:
 * the site must read correctly on a fresh database, an empty override must mean
 * "use the shipped wording" rather than "show nothing", and a coordinator
 * clearing a box is a reset, not a way to blank a health-and-safety notice off
 * the page.
 *
 * Adding a new editable string means adding an entry here — no migration, and
 * /admin/settings picks it up automatically.
 */

export const COPY_SECTIONS = [
  {
    id: "english",
    title: "English on the floor",
    description:
      "Shown on the sign-up questionnaire and on every volunteer's profile page.",
  },
  {
    id: "firstTime",
    title: "First-time volunteer question",
    description:
      "Asked once on the sign-up questionnaire, and again on the booking form for volunteers who joined before we started asking.",
  },
] as const;

export type CopySectionId = (typeof COPY_SECTIONS)[number]["id"];

type CopyField = {
  section: CopySectionId;
  /** Field label in /admin/settings. */
  label: string;
  /** One line under the label explaining where it shows up. */
  help: string;
  multiline: boolean;
  maxLength: number;
  fallback: string;
};

export const SITE_COPY = {
  englishRequirementTitle: {
    section: "english",
    label: "Note heading",
    help: "The small uppercase label above the note.",
    multiline: false,
    maxLength: 60,
    fallback: "Health & safety",
  },
  englishRequirementBody: {
    section: "english",
    label: "Note",
    help: "Leave a blank line between paragraphs. A line offering to talk it through over email is added underneath automatically.",
    multiline: true,
    maxLength: 1200,
    fallback:
      "We're a working warehouse and kitchen — briefings, safety instructions and calls across the floor all happen in English. So we can keep everyone safe, volunteers need to follow and speak conversational English on the day.",
  },
  firstTimeQuestion: {
    section: "firstTime",
    label: "Question",
    help: "The question itself, on the sign-up questionnaire.",
    multiline: false,
    maxLength: 160,
    fallback: "Have you volunteered with Fair Food before?",
  },
  firstTimeHelper: {
    section: "firstTime",
    label: "Helper text",
    help: "The smaller line under the question. Say what happens if they're new.",
    multiline: true,
    maxLength: 400,
    fallback:
      "First time? Say so — we'll make sure someone walks you through the floor and the safety basics before you start.",
  },
  firstTimeCheckboxLabel: {
    section: "firstTime",
    label: "Booking-form tick box",
    help: "Shown on the booking form to volunteers we've never asked the question. Ticking it means they're new.",
    multiline: false,
    maxLength: 160,
    fallback: "This is my first time volunteering with Fair Food",
  },
} as const satisfies Record<string, CopyField>;

export type SiteCopyKey = keyof typeof SITE_COPY;
export type SiteCopy = Record<SiteCopyKey, string>;

export const SITE_COPY_KEYS = Object.keys(SITE_COPY) as SiteCopyKey[];

export function isSiteCopyKey(value: string): value is SiteCopyKey {
  return Object.prototype.hasOwnProperty.call(SITE_COPY, value);
}

/** The shipped wording, with no database involved. */
export function siteCopyFallbacks(): SiteCopy {
  return Object.fromEntries(
    SITE_COPY_KEYS.map((key) => [key, SITE_COPY[key].fallback]),
  ) as SiteCopy;
}

/**
 * Resolved copy for a render. `cache` dedupes it across every component in a
 * single request, so a page can ask for it wherever it's needed instead of
 * threading it down from the route.
 */
export const getSiteCopy = cache(async (): Promise<SiteCopy> => {
  const resolved = siteCopyFallbacks();
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await db.siteSetting.findMany({
      where: { key: { in: SITE_COPY_KEYS } },
      select: { key: true, value: true },
    });
  } catch (e) {
    // Copy overrides are a convenience; a database hiccup here must not take
    // down a booking page that would otherwise render the shipped wording.
    console.error("Failed to read site copy overrides:", e);
    return resolved;
  }
  for (const row of rows) {
    if (isSiteCopyKey(row.key) && row.value.trim()) {
      resolved[row.key] = row.value.trim();
    }
  }
  return resolved;
});

/** Saved overrides only — what /admin/settings pre-fills its boxes with. */
export async function getSiteCopyOverrides(): Promise<
  Partial<Record<SiteCopyKey, string>>
> {
  const rows = await db.siteSetting.findMany({
    where: { key: { in: SITE_COPY_KEYS } },
    select: { key: true, value: true },
  });
  const out: Partial<Record<SiteCopyKey, string>> = {};
  for (const row of rows) {
    if (isSiteCopyKey(row.key)) out[row.key] = row.value;
  }
  return out;
}

/** Split an edited body into paragraphs on blank lines. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
