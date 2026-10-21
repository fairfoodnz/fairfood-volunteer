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
 *   muted on white     → 7.49:1  ✓ (footer, detail labels)
 *   muted on cream     → 6.74:1  ✓
 *   white on leaf      → 3.42:1  ✗ (do NOT put white text on `leaf`)
 *   tomato on cream    → 3.04:1  ✗ (decorative only — use tomatoDeep for text)
 *   tomatoDeep on cream → 5.44:1 ✓, destructive on cream → 5.49:1 ✓
 */
export const brand = {
  cream: "#f8f2eb", // --ff-cream oklch(0.965 0.012 75) — page background
  card: "#ffffff", // --card — content surface
  charcoal: "#0f130e", // --ff-charcoal oklch(0.18 0.012 140) — body text
  // --muted-foreground oklch(0.45 0.012 75) — footer / secondary text. Sits
  // above the app's foreground/65 text floor (#636662 on white, 5.82:1).
  muted: "#59544e",
  leaf: "#3d9e34", // --ff-green oklch(0.62 0.17 142) — decorative only, fails AA with white text
  leafDeep: "#17780f", // --ff-green-deep oklch(0.5 0.16 142) — CTA background, links
  border: "#ddd6ce", // --border oklch(0.88 0.014 75) — hairline rules
  tomato: "#f05940", // --ff-tomato oklch(0.66 0.19 32) — decorative only (unused here, kept for parity)
  tomatoDeep: "#be260b", // --ff-tomato-deep oklch(0.52 0.19 32) — warning text (unused here, kept for parity)
  destructive: "#c2181d", // --destructive oklch(0.52 0.2 27) — error text (unused here, kept for parity)
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
  name: "Fair Food",
  address: "624 Rosebank Road, Avondale, Auckland 1026",
  site: "https://fairfood.org.nz",
  logo: `${appUrl}/email/logo.png`,
  /** Self-hosted social badge PNGs in public/email/ (brand-green, 120px for retina). */
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
