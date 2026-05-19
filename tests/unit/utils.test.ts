import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("flattens arrays and objects (clsx semantics)", () => {
    expect(cn("a", ["b", "c"], { d: true, e: false })).toBe("a b c d");
  });

  it("dedupes conflicting tailwind utilities, last wins (tailwind-merge)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("keeps non-conflicting tailwind utilities", () => {
    expect(cn("px-2", "py-4", "text-sm")).toBe("px-2 py-4 text-sm");
  });

  it("returns an empty string with no input", () => {
    expect(cn()).toBe("");
  });
});
