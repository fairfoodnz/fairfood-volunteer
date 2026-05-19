import { describe, expect, it } from "vitest";
import { shiftAvailability, sumBlocks } from "@/lib/shifts";

describe("sumBlocks", () => {
  it("sums slot holds across blocks", () => {
    expect(sumBlocks([{ slots: 3 }, { slots: 5 }, { slots: 1 }])).toBe(9);
  });

  it("is zero with no blocks", () => {
    expect(sumBlocks([])).toBe(0);
  });
});

describe("shiftAvailability", () => {
  it("subtracts confirmed bookings and blocked slots from capacity", () => {
    expect(shiftAvailability(12, 4, 3)).toEqual({
      taken: 7,
      free: 5,
      blocked: 3,
      isFull: false,
    });
  });

  it("flags a shift as full when nothing is free", () => {
    const a = shiftAvailability(10, 7, 3);
    expect(a.free).toBe(0);
    expect(a.isFull).toBe(true);
  });

  it("clamps free at 0 when a coordinator over-holds", () => {
    const a = shiftAvailability(10, 4, 20);
    expect(a.free).toBe(0);
    expect(a.taken).toBe(24);
    expect(a.isFull).toBe(true);
  });

  it("is fully open with no bookings or blocks", () => {
    expect(shiftAvailability(8, 0, 0)).toEqual({
      taken: 0,
      free: 8,
      blocked: 0,
      isFull: false,
    });
  });
});
