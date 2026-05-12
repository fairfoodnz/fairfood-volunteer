import { ProgramSlug } from "@/generated/prisma";

const SLUG_TO_PATH: Record<ProgramSlug, string> = {
  KAI_BOX: "/programs/kai-box",
  CONSCIOUS_KITCHEN: "/programs/conscious-kitchen",
  INCLUSIVE: "/programs/inclusive",
};

export const CORPORATE_MAILTO =
  "mailto:volunteering@fairfood.org.nz?subject=Corporate%20volunteering";

const PATH_TO_SLUG: Record<string, ProgramSlug> = Object.fromEntries(
  Object.entries(SLUG_TO_PATH).map(([slug, path]) => [path.split("/").pop()!, slug as ProgramSlug]),
);

export function programSlugToHref(slug: ProgramSlug) {
  return SLUG_TO_PATH[slug];
}

export function programPathToSlug(path: string): ProgramSlug | null {
  return PATH_TO_SLUG[path] ?? null;
}

export function formatShiftRange(start: Date, end: Date) {
  const sameDay = start.toDateString() === end.toDateString();
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
