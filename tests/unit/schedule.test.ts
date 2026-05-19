import { describe, expect, it } from "vitest";
import {
  WEEKDAYS,
  enumerateDates,
  isHHMM,
  minutesOf,
  nzWallTimeToUtc,
  toNzDateTimeLocal,
} from "@/lib/schedule";

describe("isHHMM", () => {
  it("accepts valid 24-hour times", () => {
    for (const t of ["00:00", "09:30", "13:05", "23:59"]) {
      expect(isHHMM(t)).toBe(true);
    }
  });

  it("rejects malformed or out-of-range times", () => {
    for (const t of ["24:00", "9:30", "12:60", "12:5", "ab:cd", "", "12:30 "]) {
      expect(isHHMM(t)).toBe(false);
    }
  });
});

describe("minutesOf", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(minutesOf("00:00")).toBe(0);
    expect(minutesOf("09:30")).toBe(570);
    expect(minutesOf("23:59")).toBe(1439);
  });
});

describe("nzWallTimeToUtc", () => {
  it("treats summer wall-clock as NZDT (UTC+13)", () => {
    // 2026-01-15 09:00 NZDT → 2026-01-14 20:00 UTC
    expect(nzWallTimeToUtc("2026-01-15", "09:00").toISOString()).toBe(
      "2026-01-14T20:00:00.000Z",
    );
  });

  it("treats winter wall-clock as NZST (UTC+12)", () => {
    // 2026-07-15 09:00 NZST → 2026-07-14 21:00 UTC
    expect(nzWallTimeToUtc("2026-07-15", "09:00").toISOString()).toBe(
      "2026-07-14T21:00:00.000Z",
    );
  });

  it("keeps a 9am shift at 9am across the DST boundary", () => {
    // NZ clocks spring forward on 2026-09-27. Same wall time, different
    // offsets — both must still read 09:00 when converted back.
    const before = nzWallTimeToUtc("2026-09-20", "09:00");
    const after = nzWallTimeToUtc("2026-10-04", "09:00");
    expect(toNzDateTimeLocal(before)).toBe("2026-09-20T09:00");
    expect(toNzDateTimeLocal(after)).toBe("2026-10-04T09:00");
  });
});

describe("toNzDateTimeLocal", () => {
  it("round-trips with nzWallTimeToUtc (summer)", () => {
    expect(toNzDateTimeLocal(nzWallTimeToUtc("2026-01-15", "13:45"))).toBe(
      "2026-01-15T13:45",
    );
  });

  it("round-trips with nzWallTimeToUtc (winter)", () => {
    expect(toNzDateTimeLocal(nzWallTimeToUtc("2026-07-15", "06:05"))).toBe(
      "2026-07-15T06:05",
    );
  });
});

describe("enumerateDates", () => {
  it("returns every matching weekday in an inclusive range", () => {
    // 2026-01-01 is a Thursday (getUTCDay() === 4).
    expect(enumerateDates("2026-01-01", "2026-01-31", [4])).toEqual([
      "2026-01-01",
      "2026-01-08",
      "2026-01-15",
      "2026-01-22",
      "2026-01-29",
    ]);
  });

  it("includes both endpoints when they match", () => {
    expect(enumerateDates("2026-01-01", "2026-01-08", [4])).toEqual([
      "2026-01-01",
      "2026-01-08",
    ]);
  });

  it("supports multiple weekdays in calendar order", () => {
    // Sat (6) + Sun (0) in the first week of Jan 2026: 3rd & 4th.
    expect(enumerateDates("2026-01-01", "2026-01-07", [0, 6])).toEqual([
      "2026-01-03",
      "2026-01-04",
    ]);
  });

  it("returns nothing when start is after end", () => {
    expect(enumerateDates("2026-02-01", "2026-01-01", [0, 1, 2, 3, 4, 5, 6])).toEqual(
      [],
    );
  });

  it("respects the max cap", () => {
    const out = enumerateDates(
      "2026-01-01",
      "2026-12-31",
      [0, 1, 2, 3, 4, 5, 6],
      5,
    );
    expect(out).toHaveLength(5);
    expect(out[0]).toBe("2026-01-01");
  });
});

describe("WEEKDAYS", () => {
  it("is Monday-first for display but keeps getUTCDay() values", () => {
    expect(WEEKDAYS.map((d) => d.short)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(WEEKDAYS[0]).toMatchObject({ value: 1, label: "Monday" });
    expect(WEEKDAYS[6]).toMatchObject({ value: 0, label: "Sunday" });
  });
});
