import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatCompact,
  formatDate,
  formatDayMonth,
  currentMonth,
  monthLabel,
  shiftMonth,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0,00");
  });

  it("formats positive values with comma decimal", () => {
    expect(formatCurrency(1234.5)).toContain("1.234,50");
  });

  it("formats negative values", () => {
    expect(formatCurrency(-50)).toContain("50,00");
  });
});

describe("formatCompact", () => {
  it("returns full currency for small values", () => {
    expect(formatCompact(50)).toBe("$50,00");
  });

  it("returns compact notation for large values", () => {
    const result = formatCompact(1500);
    expect(result).toMatch(/1,5/);
  });
});

describe("formatDate", () => {
  it("formats ISO string to day month year", () => {
    const result = formatDate("2026-03-15T00:00:00.000Z");
    expect(result).toContain("2026");
    expect(result).toMatch(/\d{1,2}/);
  });

  it("formats Date object", () => {
    const result = formatDate(new Date(2026, 0, 1));
    expect(result).toContain("2026");
  });
});

describe("formatDayMonth", () => {
  it("returns day and month", () => {
    const result = formatDayMonth("2026-08-20T00:00:00.000Z");
    expect(result).toMatch(/\d{1,2}/);
  });
});

describe("currentMonth", () => {
  it("returns YYYY-MM format", () => {
    const result = currentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("monthLabel", () => {
  it("formats valid month string", () => {
    const result = monthLabel("2026-08");
    expect(result).toContain("2026");
  });

  it("returns raw string for invalid input", () => {
    expect(monthLabel("invalid")).toBe("invalid");
  });
});

describe("shiftMonth", () => {
  it("shifts forward", () => {
    expect(shiftMonth("2026-01", 1)).toBe("2026-02");
  });

  it("shifts backward", () => {
    expect(shiftMonth("2026-03", -1)).toBe("2026-02");
  });

  it("wraps year boundary forward", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("wraps year boundary backward", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("returns raw string for invalid input", () => {
    expect(shiftMonth("bad", 1)).toBe("bad");
  });
});
