import { describe, expect, it } from "vitest";
import {
  CORPORATE_MAILTO,
  PROGRAMME_VISIBILITY_OPTIONS,
  isLinkVisible,
  isListedPublicly,
  isSchedulable,
  programmeVisibilityHint,
  programmeVisibilityLabel,
  INCLUSIVE_MAILTO,
  INCLUSIVE_SLUG,
  dayOfWeek,
  formatShiftRange,
  formatShiftTimes,
  nzDateKey,
  nzWeekBucket,
  programHref,
  programmeImageSrc,
  slugify,
} from "@/lib/programs";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Pack Kai Boxes")).toBe("pack-kai-boxes");
  });

  it("strips macrons and accents (NFKD)", () => {
    expect(slugify("Tāmaki Makaurau")).toBe("tamaki-makaurau");
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });

  it("trims leading/trailing separators and punctuation", () => {
    expect(slugify("  --Hello, World!--  ")).toBe("hello-world");
  });

  it("collapses runs of non-alphanumerics into a single hyphen", () => {
    expect(slugify("a   ___ b...c")).toBe("a-b-c");
  });

  it("drops characters that have no ascii equivalent", () => {
    expect(slugify("emoji 🍅 tomato")).toBe("emoji-tomato");
  });

  it("caps the slug at 60 characters", () => {
    const slug = slugify("a".repeat(100));
    expect(slug).toHaveLength(60);
  });

  it("returns an empty string when there is nothing slug-worthy", () => {
    expect(slugify("!!! ✨ !!!")).toBe("");
  });
});

describe("programHref", () => {
  it("builds the public programme path", () => {
    expect(programHref("kai-box")).toBe("/programs/kai-box");
  });
});

describe("programmeImageSrc", () => {
  it("streams uploaded images through the API route when an imageKey exists", () => {
    expect(
      programmeImageSrc({ id: "abc", imageUrl: "/photos/x.webp", imageKey: "k" }),
    ).toBe("/api/programmes/abc/image");
  });

  it("falls back to the static imageUrl when there is no key", () => {
    expect(
      programmeImageSrc({ id: "abc", imageUrl: "/photos/x.webp", imageKey: null }),
    ).toBe("/photos/x.webp");
  });

  it("returns null when neither a key nor a url is set", () => {
    expect(
      programmeImageSrc({ id: "abc", imageUrl: null, imageKey: null }),
    ).toBeNull();
  });
});

describe("formatShiftRange", () => {
  // 2026-01-15 is a Thursday; NZ is in NZDT (UTC+13) in January.
  it("renders a single-day shift with a time range in NZ time", () => {
    const start = new Date("2026-01-15T02:00:00Z"); // 15:00 Thu NZ
    const end = new Date("2026-01-15T05:00:00Z"); // 18:00 Thu NZ
    expect(formatShiftRange(start, end)).toBe("Thu, 15 Jan · 3:00 pm – 6:00 pm");
  });

  it("keeps both times on a shift that runs past NZ midnight", () => {
    // Wed 21 Oct 2026 22:00 NZDT → Thu 22 Oct 01:00 NZDT.
    const start = new Date("2026-10-21T09:00:00Z");
    const end = new Date("2026-10-21T12:00:00Z");
    expect(formatShiftRange(start, end)).toBe(
      "Wed, 21 Oct · 10:00 pm – Thu, 22 Oct · 1:00 am",
    );
  });

  it("treats a shift crossing NZ midnight as multi-day even within one UTC day", () => {
    const start = new Date("2026-01-15T10:00:00Z"); // Thu 15 Jan 23:00 NZDT
    const end = new Date("2026-01-15T11:30:00Z"); // Fri 16 Jan 00:30 NZDT
    expect(formatShiftRange(start, end)).toBe(
      "Thu, 15 Jan · 11:00 pm – Fri, 16 Jan · 12:30 am",
    );
  });

  it("treats a shift that crosses UTC midnight but not NZ midnight as one day", () => {
    const start = new Date("2026-01-14T20:00:00Z"); // Thu 15 Jan 09:00 NZDT
    const end = new Date("2026-01-15T01:00:00Z"); // Thu 15 Jan 14:00 NZDT
    expect(formatShiftRange(start, end)).toBe("Thu, 15 Jan · 9:00 am – 2:00 pm");
  });

  it("reads NZ wall-clock on both sides of the DST switch", () => {
    // NZST (UTC+12) in July, NZDT (UTC+13) in January: 9am is a different
    // UTC hour in each, but renders as 9am either way.
    expect(
      formatShiftRange(
        new Date("2026-07-14T21:00:00Z"),
        new Date("2026-07-15T00:00:00Z"),
      ),
    ).toBe("Wed, 15 Jul · 9:00 am – 12:00 pm");
    expect(
      formatShiftRange(
        new Date("2026-01-13T20:00:00Z"),
        new Date("2026-01-13T23:00:00Z"),
      ),
    ).toBe("Wed, 14 Jan · 9:00 am – 12:00 pm");
  });

  it("handles a shift spanning the spring-forward night", () => {
    // NZ springs forward at 02:00 NZST on Sun 27 Sep 2026 → 03:00 NZDT.
    // Sat 26 Sep 23:00 NZST (11:00Z) → Sun 27 Sep 04:00 NZDT (15:00Z).
    expect(
      formatShiftRange(
        new Date("2026-09-26T11:00:00Z"),
        new Date("2026-09-26T15:00:00Z"),
      ),
      // ICU spells September "Sep" or "Sept" depending on its version.
    ).toMatch(/^Sat, 26 Sept? · 11:00 pm – Sun, 27 Sept? · 4:00 am$/);
  });
});

describe("formatShiftTimes", () => {
  it("renders times only for a same-day shift", () => {
    expect(
      formatShiftTimes(
        new Date("2026-01-15T02:00:00Z"),
        new Date("2026-01-15T05:00:00Z"),
      ),
    ).toBe("3:00 pm – 6:00 pm");
  });

  it("names the end day when the shift crosses NZ midnight", () => {
    expect(
      formatShiftTimes(
        new Date("2026-10-21T09:00:00Z"),
        new Date("2026-10-21T12:00:00Z"),
      ),
    ).toBe("10:00 pm – 1:00 am Thu, 22 Oct");
  });
});

describe("nzDateKey", () => {
  it("returns the NZ calendar date, not the UTC one", () => {
    // 2026-01-15T12:00Z is 2026-01-16 01:00 NZDT.
    expect(nzDateKey(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01-16");
    expect(nzDateKey(new Date("2026-01-15T10:00:00Z"))).toBe("2026-01-15");
  });
});

describe("nzWeekBucket", () => {
  // 2026-10-21 is a Wednesday; its week starts Mon 19 Oct.
  const today = "2026-10-21";

  it("groups the rest of the current Monday-start week as this week", () => {
    expect(nzWeekBucket("2026-10-21", today)).toEqual({
      key: "2026-10-19",
      label: "This week",
    });
    expect(nzWeekBucket("2026-10-25", today).label).toBe("This week"); // Sun
  });

  it("starts next week on the following Monday", () => {
    expect(nzWeekBucket("2026-10-26", today)).toEqual({
      key: "2026-10-26",
      label: "Next week",
    });
  });

  it("labels later weeks by their Monday", () => {
    expect(nzWeekBucket("2026-11-05", today)).toEqual({
      key: "2026-11-02",
      label: "Week of 2 Nov",
    });
  });

  it("is stable across the DST switch", () => {
    // NZ springs forward on Sun 27 Sep 2026.
    expect(nzWeekBucket("2026-09-28", "2026-09-24")).toEqual({
      key: "2026-09-28",
      label: "Next week",
    });
  });
});

describe("dayOfWeek", () => {
  it("names the NZ weekday for an instant", () => {
    expect(dayOfWeek(new Date("2026-01-15T02:00:00Z"))).toBe("Thursday");
  });

  it("reflects the NZ day even when UTC has rolled over", () => {
    // 2026-01-15T12:00Z is 2026-01-16 01:00 NZDT — a Friday in NZ.
    expect(dayOfWeek(new Date("2026-01-15T12:00:00Z"))).toBe("Friday");
  });
});

describe("constants", () => {
  it("exposes the stable inclusive slug and mailtos", () => {
    expect(INCLUSIVE_SLUG).toBe("inclusive");
    expect(CORPORATE_MAILTO).toContain("mailto:volunteering@fairfood.org.nz");
    expect(INCLUSIVE_MAILTO).toContain("mailto:volunteering@fairfood.org.nz");
  });
});

describe("programme visibility", () => {
  const all = ["PUBLIC", "UNLISTED", "PRIVATE", "ARCHIVED"] as const;

  it("only lists public programmes in browsable surfaces", () => {
    expect(all.filter(isListedPublicly)).toEqual(["PUBLIC"]);
  });

  it("lets public and unlisted programmes be reached by link", () => {
    expect(all.filter(isLinkVisible)).toEqual(["PUBLIC", "UNLISTED"]);
  });

  it("keeps every state except archived schedulable", () => {
    expect(all.filter(isSchedulable)).toEqual(["PUBLIC", "UNLISTED", "PRIVATE"]);
  });

  it("anything listed publicly is also reachable by link", () => {
    for (const v of all) {
      if (isListedPublicly(v)) expect(isLinkVisible(v)).toBe(true);
    }
  });

  it("offers one labelled option per state, most visible first", () => {
    expect(PROGRAMME_VISIBILITY_OPTIONS.map((o) => o.value)).toEqual([...all]);
    for (const option of PROGRAMME_VISIBILITY_OPTIONS) {
      expect(programmeVisibilityLabel(option.value)).toBe(option.label);
      expect(programmeVisibilityHint(option.value)).toBe(option.hint);
    }
  });
});
