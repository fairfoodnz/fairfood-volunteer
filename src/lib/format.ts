/** "1 shift" / "2 shifts" — pass `many` for irregular plurals. */
export function plural(n: number, one: string, many = `${one}s`) {
  return n === 1 ? one : many;
}

/** `${n} ${noun}` with the right plural, e.g. countOf(1, "upcoming shift"). */
export function countOf(n: number, one: string, many = `${one}s`) {
  return `${n} ${plural(n, one, many)}`;
}

/** "13:30" → "1:30 PM". Input is a 24-hour "HH:MM" wall-clock string. */
export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}
