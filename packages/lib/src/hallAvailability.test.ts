import { describe, it, expect } from "vitest";
import { buildMonthGrid, nextStatus, shiftMonth, isoDate, statusForDate } from "./hallAvailability";

describe("isoDate", () => {
  it("월/일 0패딩, 타임존 무관", () => {
    expect(isoDate(2026, 0, 5)).toBe("2026-01-05");
    expect(isoDate(2026, 8, 20)).toBe("2026-09-20");
    expect(isoDate(2026, 11, 31)).toBe("2026-12-31");
  });
});

describe("buildMonthGrid", () => {
  it("2026-09(9월)은 1일이 화요일(dow=2) — 앞 패딩 2칸, 30일", () => {
    const g = buildMonthGrid(2026, 8);
    expect(g.length % 7).toBe(0);
    expect(g[0]).toBeNull();
    expect(g[1]).toBeNull();
    expect(g[2]).toBe("2026-09-01");
    expect(g.filter((c) => c !== null)).toHaveLength(30);
    expect(g[g.indexOf("2026-09-30")]).toBe("2026-09-30");
  });
  it("2월 윤년 아님 28일", () => {
    expect(buildMonthGrid(2026, 1).filter(Boolean)).toHaveLength(28);
  });
});

describe("nextStatus 순환", () => {
  it("available→booked→limited→null→available", () => {
    expect(nextStatus(null)).toBe("available");
    expect(nextStatus("available")).toBe("booked");
    expect(nextStatus("booked")).toBe("limited");
    expect(nextStatus("limited")).toBeNull();
  });
});

describe("shiftMonth", () => {
  it("12월+1 → 다음해 1월", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
  });
  it("1월-1 → 전해 12월", () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 });
  });
});

describe("statusForDate", () => {
  const map = { "2026-09-20": "available" as const, "2026-09-21": "booked" as const };
  it("있으면 상태, 없으면/빈값이면 null", () => {
    expect(statusForDate(map, "2026-09-20")).toBe("available");
    expect(statusForDate(map, "2026-09-22")).toBeNull();
    expect(statusForDate(map, null)).toBeNull();
  });
});
