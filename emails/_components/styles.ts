import { brand } from "../brand";

/**
 * Tailwind class strings shared by the templates. Kept as plain strings (not
 * components) because react-email's <Tailwind> inlines whatever classes it
 * finds, and the arbitrary-value hex needs the brand palette interpolated.
 */

/** Body paragraph. */
export const text = `text-[16px] leading-[26px] text-[${brand.charcoal}] m-0 mb-[20px]`;

/** Small caps label above a value in the shift-details card. */
export const detailLabel = `m-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[${brand.muted}]`;

/** The value under a `detailLabel`. */
export const detailValue = `m-0 mt-[4px] text-[16px] leading-[24px] text-[${brand.charcoal}]`;
