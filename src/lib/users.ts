/**
 * Display helpers for the split first/last name model.
 *
 * `User.firstName` is required; `User.lastName` is nullable for mononyms and
 * OAuth identities that only ever supply a given name. Anything rendering a
 * person's name must go through here so the empty-last-name case stays
 * consistent — never reassemble a full name ad hoc.
 *
 * Structural param (not the Prisma `User` type) so client components can import
 * this without pulling the generated client into the browser bundle.
 */
export type PersonName = { firstName: string; lastName: string | null };

/**
 * Names must be written in the English (Latin) alphabet so coordinators can
 * read rosters and volunteers can find each other on the "Going" list.
 * Precomposed and combining diacritics stay allowed (Tāmaki, José, Zoë), as do
 * spaces, hyphens, apostrophes and full stops (Mary-Jane O'Neil Jr.). At least
 * one letter is required so punctuation alone doesn't pass.
 *
 * This is the single source of the rule: sign-up, profile edits, the onboarding
 * questionnaire (via the Zod fields in lib/name-fields.ts) and the booking gate
 * all go through it.
 */
const ENGLISH_NAME = /^(?=.*\p{Script=Latin})[\p{Script=Latin}\p{M} '’.-]+$/u;

export const ENGLISH_NAME_MESSAGE =
  "Please write your name using the English alphabet.";

export function isEnglishName(value: string): boolean {
  return ENGLISH_NAME.test(value.trim());
}

/** True when every part of the stored name satisfies `isEnglishName`. */
export function hasEnglishName(p: PersonName): boolean {
  return isEnglishName(p.firstName) && (!p.lastName || isEnglishName(p.lastName));
}

/** "First Last", collapsing to just "First" when there's no last name. */
export function fullName(p: PersonName): string {
  return p.lastName ? `${p.firstName} ${p.lastName}` : p.firstName;
}

/**
 * Up to two uppercase initials for avatar chips. Falls back to "K"
 * (kaiāwhina) if first name is somehow blank.
 */
export function initials(p: PersonName): string {
  const i = (p.firstName.charAt(0) + (p.lastName?.charAt(0) ?? "")).toUpperCase();
  return i || "K";
}

/**
 * A volunteer the coordinator should walk through an induction on the day:
 * they told us they'd never volunteered with Fair Food, and no shift of theirs
 * has been marked attended yet.
 *
 * The attendance half matters — a single questionnaire answer must not badge
 * someone a newcomer for the rest of their time here. The first "Mark
 * attended" retires the badge on its own, with nothing for a coordinator to
 * remember to clear.
 *
 * A null `volunteeredBefore` (accounts predating the question) is treated as
 * "we don't know", never as "new".
 */
export function isFirstTimer(p: {
  volunteeredBefore: boolean | null;
  attendedCount: number;
}): boolean {
  return p.volunteeredBefore === false && p.attendedCount === 0;
}
