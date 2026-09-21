import { describe, expect, it } from "vitest";
import { hasEnglishName, isEnglishName, isFirstTimer } from "@/lib/users";

describe("isEnglishName", () => {
  it.each([
    "Aroha",
    "Mary-Jane",
    "O'Neil",
    "O’Neil",
    "Jr.",
    "Van der Merwe",
    "Tāmaki",
    "Hēmi",
    "José",
    "Zoë",
    "Łukasz",
    "  Aroha  ",
    // Decomposed diacritic (e + combining macron).
    "Hēmi",
  ])("accepts %j", (name) => {
    expect(isEnglishName(name)).toBe(true);
  });

  it.each([
    "振莹",
    "Aroha 振莹",
    "Анна",
    "Γιώργος",
    "محمد",
    "प्रिया",
    "김민준",
    "",
    "   ",
    "-",
    "'.",
    "john99",
    "Aroha😀",
    "Aroha\nWilliams",
  ])("rejects %j", (name) => {
    expect(isEnglishName(name)).toBe(false);
  });
});

describe("hasEnglishName", () => {
  it("accepts a mononym", () => {
    expect(hasEnglishName({ firstName: "Aroha", lastName: null })).toBe(true);
  });

  it("checks both parts", () => {
    expect(hasEnglishName({ firstName: "Aroha", lastName: "Williams" })).toBe(true);
    expect(hasEnglishName({ firstName: "振莹", lastName: "Williams" })).toBe(false);
    expect(hasEnglishName({ firstName: "Aroha", lastName: "王" })).toBe(false);
  });
});

describe("isFirstTimer", () => {
  it("flags a volunteer who said they've never been here and has no attended shift", () => {
    expect(isFirstTimer({ volunteeredBefore: false, attendedCount: 0 })).toBe(true);
  });

  it("retires the flag once a shift has been marked attended", () => {
    expect(isFirstTimer({ volunteeredBefore: false, attendedCount: 1 })).toBe(false);
  });

  it("never flags someone who told us they've volunteered before", () => {
    expect(isFirstTimer({ volunteeredBefore: true, attendedCount: 0 })).toBe(false);
  });

  it("treats an unanswered question as unknown, not as new", () => {
    expect(isFirstTimer({ volunteeredBefore: null, attendedCount: 0 })).toBe(false);
  });
});
