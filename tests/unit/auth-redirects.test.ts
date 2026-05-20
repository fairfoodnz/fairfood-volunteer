import { describe, expect, it } from "vitest";
import { postAuthDestination, safeNextPath } from "@/lib/auth";

describe("safeNextPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeNextPath("/me/profile")).toBe("/me/profile");
    expect(safeNextPath("/shifts/abc123")).toBe("/shifts/abc123");
    expect(safeNextPath("/shifts?programme=kai-box")).toBe(
      "/shifts?programme=kai-box",
    );
  });

  it("falls back when next is missing or empty", () => {
    expect(safeNextPath(null)).toBe("/me");
    expect(safeNextPath(undefined)).toBe("/me");
    expect(safeNextPath("")).toBe("/me");
  });

  it("rejects absolute and non-relative targets", () => {
    expect(safeNextPath("https://evil.com")).toBe("/me");
    expect(safeNextPath("http://evil.com/path")).toBe("/me");
    expect(safeNextPath("relative/path")).toBe("/me");
  });

  it("rejects protocol-relative and backslash open-redirect smuggling", () => {
    expect(safeNextPath("//evil.com")).toBe("/me");
    expect(safeNextPath("/\\evil.com")).toBe("/me");
    expect(safeNextPath("/\\/evil.com")).toBe("/me");
    // Percent-encoded equivalents: some browsers decode Location and then
    // normalise "\"→"/", so reject after a decode pass too.
    expect(safeNextPath("/%2Fevil.com")).toBe("/me");
    expect(safeNextPath("/%5Cevil.com")).toBe("/me");
    expect(safeNextPath("/%2F%2Fevil.com")).toBe("/me");
  });

  it("falls back when next has malformed percent escapes", () => {
    expect(safeNextPath("/%E0%A4%A")).toBe("/me");
    expect(safeNextPath("/%ZZ")).toBe("/me");
  });

  it("honours a custom fallback", () => {
    expect(safeNextPath(null, "/admin")).toBe("/admin");
    expect(safeNextPath("//evil", "/admin")).toBe("/admin");
  });
});

describe("postAuthDestination", () => {
  const complete = { profileCompletedAt: new Date("2026-01-01T00:00:00Z") };
  const incomplete = { profileCompletedAt: null };

  it("sends a profile-complete user to the validated next path", () => {
    expect(postAuthDestination(complete, "/shifts/abc")).toBe("/shifts/abc");
  });

  it("sends a profile-complete user to /me by default", () => {
    expect(postAuthDestination(complete)).toBe("/me");
    expect(postAuthDestination(complete, null)).toBe("/me");
  });

  it("routes an incomplete profile through the questionnaire", () => {
    expect(postAuthDestination(incomplete)).toBe("/me/profile/complete");
  });

  it("preserves and encodes the intended destination through the questionnaire", () => {
    expect(postAuthDestination(incomplete, "/shifts/abc")).toBe(
      "/me/profile/complete?next=%2Fshifts%2Fabc",
    );
  });

  it("does not forward an unsafe next through the questionnaire", () => {
    expect(postAuthDestination(incomplete, "//evil.com")).toBe(
      "/me/profile/complete",
    );
  });
});
