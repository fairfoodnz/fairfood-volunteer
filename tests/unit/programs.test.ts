import { describe, expect, it } from "vitest";
import {
  CORPORATE_MAILTO,
  INCLUSIVE_MAILTO,
  INCLUSIVE_SLUG,
  dayOfWeek,
  formatShiftRange,
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
    const out = formatShiftRange(start, end);
    expect(out).toContain("Thu");
    expect(out).toContain("15 Jan");
    expect(out).toContain("3:00");
    expect(out).toContain("6:00");
    expect(out).toContain("·");
  });

  it("renders a multi-day range as two dates without times", () => {
    const start = new Date("2026-01-15T02:00:00Z"); // Thu 15 Jan NZ
    const end = new Date("2026-01-16T05:00:00Z"); // Fri 16 Jan NZ
    const out = formatShiftRange(start, end);
    expect(out).toContain("15 Jan");
    expect(out).toContain("16 Jan");
    expect(out).toContain("–");
    expect(out).not.toContain("·");
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
