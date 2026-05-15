/**
 * Fair Food brand palette for transactional email.
 *
 * Email clients don't support OKLCH or CSS variables, so these are the
 * `src/app/globals.css` design-system tokens converted to sRGB hex
 * (see design-system/MASTER.md). Keep this in lockstep with globals.css —
 * if the app palette changes, regenerate these.
 *
 * Contrast (WCAG AA, verified):
 *   white on leafDeep  → 5.63:1  ✓ (CTA button)
 *   leafDeep on cream  → 5.06:1  ✓ (links)
 *   charcoal on cream  → 16.87:1 ✓ (body)
 *   white on leaf      → 3.42:1  ✗ (do NOT put white text on `leaf`)
 */
export const brand = {
  cream: "#f8f2eb", // page background
  card: "#ffffff", // content surface
  charcoal: "#0f130e", // body text
  muted: "#5b5f57", // footer / secondary text
  leaf: "#3d9e34", // brand accent (decorative only — fails AA with white text)
  leafDeep: "#17780f", // CTA background, links
  border: "#ddd6ce", // hairline rules
  tomato: "#f05940", // warning accent (unused here, kept for parity)
} as const;

/** Poppins is the brand typeface; falls back to a system stack where webfonts aren't supported. */
export const fontStack =
  "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Absolute origin the email links/images resolve against. Email clients can't
 * load relative paths, so social icons are served from this app's own /public
 * — the volunteer app at volunteer.fairfood.org.nz, NOT the Squarespace
 * marketing site at fairfood.org.nz. Production sets NEXT_PUBLIC_APP_URL; the
 * fallback is the production origin on purpose, because a localhost URL is
 * never useful in a sent email (and react-email's preview/export CLI runs
 * with no env loaded).
 */
export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "https://volunteer.fairfood.org.nz";

/** Public-facing Fair Food details used across email footers. */
export const org = {
  name: "Fair Food NZ",
  address: "624 Rosebank Road, Avondale, Auckland 1026",
  site: "https://fairfood.org.nz",
  logo: "https://images.squarespace-cdn.com/content/v1/6722a260432d004478253a07/4f095930-9d9c-4693-ba84-29faf3e333d2/FF_Website_Logo.png",
  /** Brand-green badge PNGs in public/email/ (generated, 120px for retina). */
  social: [
    {
      label: "Facebook",
      href: "https://www.facebook.com/fairfoodnz",
      icon: `${appUrl}/email/social-facebook.png`,
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/fairfoodnz",
      icon: `${appUrl}/email/social-instagram.png`,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/fairfoodnz/?viewAsMember=true",
      icon: `${appUrl}/email/social-linkedin.png`,
    },
  ],
} as const;
