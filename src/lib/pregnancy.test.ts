import { describe, expect, it } from "vitest";
import { computePregnancyContext, trimesterFromWeek } from "./pregnancy";

// 기준일: 2026-05-18 (Mon). 임신 40주차 ≈ 280일.

describe("trimesterFromWeek", () => {
  it("1~13주 → first", () => {
    expect(trimesterFromWeek(1)).toBe("first");
    expect(trimesterFromWeek(13)).toBe("first");
  });
  it("14~27주 → second", () => {
    expect(trimesterFromWeek(14)).toBe("second");
    expect(trimesterFromWeek(27)).toBe("second");
  });
  it("28~40주 → third", () => {
    expect(trimesterFromWeek(28)).toBe("third");
    expect(trimesterFromWeek(40)).toBe("third");
  });
  it("null → null", () => {
    expect(trimesterFromWeek(null)).toBeNull();
  });
});

describe("computePregnancyContext", () => {
  const now = new Date("2026-05-18T00:00:00Z");

  it("pregnant=false 면 모든 필드 null", () => {
    const ctx = computePregnancyContext(false, "2026-11-01", "2026-08-15", now);
    expect(ctx.currentWeek).toBeNull();
    expect(ctx.weeksAtWedding).toBeNull();
    expect(ctx.trimesterAtWedding).toBeNull();
  });

  it("dueDate=null 이면 모든 필드 null", () => {
    const ctx = computePregnancyContext(true, null, "2026-08-15", now);
    expect(ctx.currentWeek).toBeNull();
  });

  it("출산예정일 24주 후 → 현재 16주차 (second)", () => {
    // 24주 후 = 168일 후 = 2026-11-02
    const ctx = computePregnancyContext(true, "2026-11-02", null, now);
    expect(ctx.currentWeek).toBe(16);
  });

  it("본식이 출산예정일 12주 전 → 본식 시점 28주 (third)", () => {
    // 출산예정일 2026-11-02, 본식 12주 전 = 2026-08-10
    const ctx = computePregnancyContext(true, "2026-11-02", "2026-08-10", now);
    expect(ctx.weeksAtWedding).toBe(28);
    expect(ctx.trimesterAtWedding).toBe("third");
  });

  it("본식이 출산예정일 26주 전 → 본식 시점 14주 (second)", () => {
    // 26주 전 = 182일 전
    const ctx = computePregnancyContext(true, "2026-11-02", "2026-05-03", now);
    expect(ctx.weeksAtWedding).toBe(14);
    expect(ctx.trimesterAtWedding).toBe("second");
  });

  it("본식이 출산예정일 이후면 weeksAtWedding null", () => {
    const ctx = computePregnancyContext(true, "2026-08-01", "2026-12-25", now);
    expect(ctx.weeksAtWedding).toBeNull();
    expect(ctx.trimesterAtWedding).toBeNull();
  });

  it("출산예정일이 과거(이미 출산)면 currentWeek null", () => {
    const ctx = computePregnancyContext(true, "2026-01-01", null, now);
    expect(ctx.currentWeek).toBeNull();
  });
});
