import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  flaggedStats,
  groupFlagged,
  nzDaysBetween,
  resolveFlaggedQuery,
  viewCounts,
  type FlaggedPerson,
} from "@/app/admin/flagged/query";

const person = (over: Partial<FlaggedPerson> & { id: string }): FlaggedPerson => ({
  firstName: "Aroha",
  lastName: "Walker",
  email: `${over.id}@example.test`,
  arrest: false,
  health: true,
  flaggedAt: new Date("2026-08-01T00:00:00Z"),
  reviewedAt: null,
  firstTimer: false,
  nextShift: null,
  ...over,
});

const shift = (iso: string) => ({
  id: `shift-${iso}`,
  startsAt: new Date(iso),
  programme: "Kai Sorting",
});

const PEOPLE: FlaggedPerson[] = [
  person({ id: "late", nextShift: shift("2026-09-30T21:00:00Z") }),
  person({ id: "soon", arrest: true, health: false, nextShift: shift("2026-09-22T21:00:00Z") }),
  person({ id: "old-flag", flaggedAt: new Date("2026-05-01T00:00:00Z") }),
  person({ id: "new-flag", flaggedAt: new Date("2026-09-10T00:00:00Z") }),
  person({
    id: "done-early",
    firstName: "Hemi",
    lastName: "Ngata",
    reviewedAt: new Date("2026-09-01T00:00:00Z"),
  }),
  person({
    id: "done-late",
    arrest: true,
    reviewedAt: new Date("2026-09-15T00:00:00Z"),
    nextShift: shift("2026-09-21T21:00:00Z"),
  }),
];

describe("resolveFlaggedQuery", () => {
  it("defaults to the unreviewed view with no filters", () => {
    expect(resolveFlaggedQuery({})).toEqual({ view: "todo", type: "all", search: "" });
  });

  it("ignores unknown values and trims the search", () => {
    expect(resolveFlaggedQuery({ view: "nope", type: "x", q: "  hemi " })).toEqual({
      view: "todo",
      type: "all",
      search: "hemi",
    });
  });
});

describe("flaggedStats", () => {
  it("counts only unreviewed people towards the shift deadline", () => {
    expect(flaggedStats(PEOPLE)).toEqual({
      total: 6,
      todo: 4,
      reviewed: 2,
      todoBooked: 2,
      // done-late has the earliest shift but is already reviewed.
      nextDeadline: new Date("2026-09-22T21:00:00Z"),
    });
  });

  it("has no deadline when nobody unreviewed is booked", () => {
    expect(flaggedStats([person({ id: "a" })]).nextDeadline).toBeNull();
  });
});

describe("groupFlagged", () => {
  const ids = (view: string, extra: { type?: string; q?: string } = {}) =>
    groupFlagged(PEOPLE, resolveFlaggedQuery({ view, ...extra })).map((g) => [
      g.key,
      g.people.map((p) => p.id),
    ]);

  it("leads with soonest shift, then newest flag", () => {
    expect(ids("todo")).toEqual([
      ["booked", ["soon", "late"]],
      ["unbooked", ["new-flag", "old-flag"]],
    ]);
  });

  it("orders reviewed people by most recent review", () => {
    expect(ids("reviewed")).toEqual([["reviewed", ["done-late", "done-early"]]]);
  });

  it("keeps reviewed people out of the booked group in the everyone view", () => {
    expect(ids("all").map(([key]) => key)).toEqual(["booked", "unbooked", "reviewed"]);
    expect(ids("all")[0][1]).toEqual(["soon", "late"]);
  });

  it("lists someone flagged for both under either type", () => {
    expect(ids("reviewed", { type: "arrest" })).toEqual([["reviewed", ["done-late"]]]);
    expect(ids("reviewed", { type: "health" })).toEqual([
      ["reviewed", ["done-late", "done-early"]],
    ]);
  });

  it("matches every search token across name and email", () => {
    expect(ids("reviewed", { q: "hemi nga" })).toEqual([["reviewed", ["done-early"]]]);
    expect(ids("todo", { q: "SOON@example" })).toEqual([["booked", ["soon"]]]);
    expect(ids("todo", { q: "hemi walker" })).toEqual([]);
  });
});

describe("viewCounts", () => {
  it("reflects the type and search filters, not the active view", () => {
    expect(viewCounts(PEOPLE, { type: "all", search: "" })).toEqual({
      todo: 4,
      reviewed: 2,
      all: 6,
    });
    expect(viewCounts(PEOPLE, { type: "arrest", search: "" })).toEqual({
      todo: 1,
      reviewed: 1,
      all: 2,
    });
  });
});

describe("nzDaysBetween", () => {
  it("counts NZ calendar days, not 24-hour blocks", () => {
    // 11:30pm NZST Mon → 12:30am NZST Tue is one hour but the next day.
    const from = new Date("2026-06-01T11:30:00Z");
    const to = new Date("2026-06-01T12:30:00Z");
    expect(nzDaysBetween(from, to)).toBe(1);
  });

  it("is zero later the same NZ day", () => {
    expect(
      nzDaysBetween(new Date("2026-06-01T20:00:00Z"), new Date("2026-06-02T08:00:00Z")),
    ).toBe(0);
  });

  it("is unaffected by the daylight-saving changeover", () => {
    // NZDT begins 27 Sep 2026.
    expect(
      nzDaysBetween(new Date("2026-09-25T00:00:00Z"), new Date("2026-09-29T00:00:00Z")),
    ).toBe(4);
  });
});

describe("countdownLabel", () => {
  it.each([
    [0, "Today"],
    [1, "Tomorrow"],
    [5, "In 5 days"],
  ])("%i → %s", (days, label) => {
    expect(countdownLabel(days)).toBe(label);
  });
});
