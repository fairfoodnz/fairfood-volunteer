// Bulk-scheduling date math. Shift times are stored as UTC `DateTime`, but
// coordinators think in NZ wall-clock ("9am every Tuesday"). A 9am shift must
// stay 9am across the daylight-saving boundary, so we convert each generated
// calendar date to its own UTC instant DST-aware. There's no date library in
// this repo, so the offset is solved via `Intl` (the same mechanism the rest of
// the app already uses for display in `src/lib/programs.ts`).

const NZ_TZ = "Pacific/Auckland";

/**
 * Milliseconds to add to a UTC instant to read it as NZ wall-clock, evaluated
 * at `date` (so it reflects whichever side of the DST boundary `date` is on).
 */
function nzOffsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: NZ_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - date.getTime();
}

/**
 * Convert an NZ local wall-clock date + time to the matching UTC instant.
 * `dateISO` is "YYYY-MM-DD", `time` is "HH:MM" (24h). DST-aware.
 */
export function nzWallTimeToUtc(dateISO: string, time: string): Date {
  const [y, mo, d] = dateISO.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // First guess: pretend the wall-clock is UTC, then correct by the offset
  // at that instant. Re-check once at the candidate to settle the rare case
  // where the guess and the result land on different sides of a DST switch.
  const guessMs = Date.UTC(y, mo - 1, d, h, mi);
  const o1 = nzOffsetMs(new Date(guessMs));
  let result = new Date(guessMs - o1);
  const o2 = nzOffsetMs(result);
  if (o2 !== o1) result = new Date(guessMs - o2);
  return result;
}

// JS `getUTCDay()` convention: 0 = Sunday … 6 = Saturday. Mon-first for display.
export const WEEKDAYS = [
  { value: 1, short: "Mon", label: "Monday" },
  { value: 2, short: "Tue", label: "Tuesday" },
  { value: 3, short: "Wed", label: "Wednesday" },
  { value: 4, short: "Thu", label: "Thursday" },
  { value: 5, short: "Fri", label: "Friday" },
  { value: 6, short: "Sat", label: "Saturday" },
  { value: 0, short: "Sun", label: "Sunday" },
] as const;

/** "HH:MM" 24-hour validator. */
export function isHHMM(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Minutes since midnight for an "HH:MM" string. */
export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Every calendar date (YYYY-MM-DD) from `startISO` to `endISO` inclusive whose
 * weekday is in `weekdays` (0 = Sun … 6 = Sat). Pure calendar arithmetic in
 * UTC — each value is exactly a calendar date, independent of timezone — so the
 * weekday is just `getUTCDay()` of that date. Bounded by `max`.
 */
export function enumerateDates(
  startISO: string,
  endISO: string,
  weekdays: number[],
  max = 1000,
): string[] {
  const [sy, sm, sd] = startISO.split("-").map(Number);
  const [ey, em, ed] = endISO.split("-").map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  const want = new Set(weekdays);
  const out: string[] = [];
  while (cur <= end && out.length < max) {
    const dt = new Date(cur);
    if (want.has(dt.getUTCDay())) {
      const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const d = String(dt.getUTCDate()).padStart(2, "0");
      out.push(`${dt.getUTCFullYear()}-${m}-${d}`);
    }
    cur += 86_400_000;
  }
  return out;
}
