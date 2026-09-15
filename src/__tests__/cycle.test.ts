import { describe, expect, it } from "vitest";
import { getCycleRange, getCycleProgress } from "@/lib/cycle";

describe("getCycleRange", () => {
  it("returns correct range when ref is after start day", () => {
    const ref = new Date(2026, 7, 20); // Aug 20
    const range = getCycleRange(15, ref);
    expect(range.start).toEqual(new Date(2026, 7, 15)); // Aug 15
    expect(range.end).toEqual(new Date(2026, 8, 15)); // Sep 15
  });

  it("returns previous cycle when ref is before start day", () => {
    const ref = new Date(2026, 7, 10); // Aug 10
    const range = getCycleRange(15, ref);
    expect(range.start).toEqual(new Date(2026, 6, 15)); // Jul 15
    expect(range.end).toEqual(new Date(2026, 7, 15)); // Aug 15
  });

  it("clamps day to 28", () => {
    const ref = new Date(2026, 1, 15);
    const range = getCycleRange(31, ref);
    expect(range.start.getDate()).toBe(28);
  });

  it("handles day=1", () => {
    const ref = new Date(2026, 0, 15);
    const range = getCycleRange(1, ref);
    expect(range.start).toEqual(new Date(2026, 0, 1));
    expect(range.end).toEqual(new Date(2026, 1, 1));
  });
});

describe("getCycleProgress", () => {
  it("calculates progress mid-cycle", () => {
    const ref = new Date(2026, 7, 20); // Aug 20
    const progress = getCycleProgress(15, ref);
    expect(progress.daysElapsed).toBeGreaterThanOrEqual(5);
    expect(progress.daysTotal).toBeGreaterThanOrEqual(30);
    expect(progress.daysElapsed).toBeLessThanOrEqual(progress.daysTotal);
  });

  it("returns at least 1 day elapsed", () => {
    const ref = new Date(2026, 7, 15); // exactly on start day
    const progress = getCycleProgress(15, ref);
    expect(progress.daysElapsed).toBeGreaterThanOrEqual(1);
  });
});
