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
