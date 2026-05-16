// Card themes for the bento programme grid. Each key maps to a coordinated set
// of Tailwind classes plus a scrim CSS var (used for the right-edge gradient on
// the grid cards). Kept in one place so the admin theme picker and the public
// grid never drift apart. Safe to import from client components — no server deps.

export type ProgrammeThemeKey =
  | "cream"
  | "charcoal"
  | "forest"
  | "clay"
  | "ocean";

export type ProgrammeTheme = {
  /** Human label shown in the admin picker. */
  label: string;
  /** Card background (+ text colour when the card is dark). */
  card: string;
  /** Tint for the artwork layer. */
  art: string;
  /** Pill/tag classes for the tagline chip. */
  tag: string;
  /** Solid colour for the left→right readability scrim. CSS var. */
  scrim: string;
  /** Swatch colour for the admin picker preview. */
  swatch: string;
};

export const DEFAULT_THEME: ProgrammeThemeKey = "cream";

export const PROGRAMME_THEMES: Record<ProgrammeThemeKey, ProgrammeTheme> = {
  cream: {
    label: "Cream",
    card: "bg-cream-deep",
    art: "text-leaf-deep",
    tag: "bg-leaf/15 text-leaf-deep",
    scrim: "var(--ff-cream-deep)",
    swatch: "var(--ff-cream-deep)",
  },
  charcoal: {
    label: "Charcoal",
    card: "bg-charcoal text-cream",
    art: "text-tomato",
    tag: "bg-tomato/20 text-cream",
    scrim: "var(--ff-charcoal)",
    swatch: "var(--ff-charcoal)",
  },
  forest: {
    label: "Forest",
    card: "bg-forest text-cream",
    art: "text-cream",
    tag: "bg-cream/15 text-cream",
    scrim: "var(--ff-forest)",
    swatch: "var(--ff-forest)",
  },
  clay: {
    label: "Clay",
    card: "bg-clay text-cream",
    art: "text-cream",
    tag: "bg-cream/15 text-cream",
    scrim: "var(--ff-clay)",
    swatch: "var(--ff-clay)",
  },
  ocean: {
    label: "Ocean",
    card: "bg-ocean text-cream",
    art: "text-cream",
    tag: "bg-cream/15 text-cream",
    scrim: "var(--ff-ocean)",
    swatch: "var(--ff-ocean)",
  },
};

export const THEME_KEYS = Object.keys(
  PROGRAMME_THEMES,
) as ProgrammeThemeKey[];

export function isThemeKey(value: string): value is ProgrammeThemeKey {
  return value in PROGRAMME_THEMES;
}

/** Resolve a (possibly unknown / legacy) theme key to a concrete theme. */
export function programmeTheme(key: string | null | undefined): ProgrammeTheme {
  if (key && isThemeKey(key)) return PROGRAMME_THEMES[key];
  return PROGRAMME_THEMES[DEFAULT_THEME];
}
