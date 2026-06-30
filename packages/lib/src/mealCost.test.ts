import { describe, it, expect } from "vitest";
import { normalizeMealPriceManwon, computeMealCost } from "./mealCost";

describe("normalizeMealPriceManwon", () => {
  it("원 단위(>=1000)를 만원으로 변환", () => {
    expect(normalizeMealPriceManwon(70000)).toBe(7);
    expect(normalizeMealPriceManwon(116552)).toBe(11.7);
  });
  it("만원 단위(<1000)는 그대로", () => {
    expect(normalizeMealPriceManwon(7.5)).toBe(7.5);
    expect(normalizeMealPriceManwon(20)).toBe(20);
  });
  it("현실범위 밖(오입력)은 폐기 → null", () => {
    expect(normalizeMealPriceManwon(2450000)).toBeNull(); // 245만원 → 폐기
    expect(normalizeMealPriceManwon(1)).toBeNull(); // 1만원 미만 가정 너무 낮음
    expect(normalizeMealPriceManwon(500)).toBeNull(); // 500(만원 간주) → 범위 밖
  });
  it("null/0/음수/NaN 가드", () => {
    expect(normalizeMealPriceManwon(null)).toBeNull();
    expect(normalizeMealPriceManwon(0)).toBeNull();
    expect(normalizeMealPriceManwon(-5)).toBeNull();
    expect(normalizeMealPriceManwon(NaN)).toBeNull();
  });
});

describe("computeMealCost", () => {
  const base = {
    expectedHeads: 180,
    headsSource: "guestlist" as const,
    unitPriceManwon: 7,
    priceSource: "venue" as const,
    minGuarantee: null,
    maxCapacity: null,
    budgetedManwon: null,
  };

  it("기본: 총액 = 식수 × 단가", () => {
    const r = computeMealCost(base);
    expect(r.billedHeads).toBe(180);
    expect(r.totalManwon).toBe(1260);
    expect(r.guaranteeShortfall).toBe(0);
  });

  it("보증인원 미달: 청구 식수는 보증인원으로 올라가고 미달분 경고", () => {
    const r = computeMealCost({ ...base, expectedHeads: 150, minGuarantee: 200 });
    expect(r.billedHeads).toBe(200); // max(150, 200)
    expect(r.totalManwon).toBe(1400); // 200 × 7
    expect(r.guaranteeShortfall).toBe(50);
    expect(r.shortfallCostManwon).toBe(350); // 50 × 7 헛돈
  });

  it("보증인원 초과: 청구는 실참석, 미달 0", () => {
    const r = computeMealCost({ ...base, expectedHeads: 250, minGuarantee: 200 });
    expect(r.billedHeads).toBe(250);
    expect(r.guaranteeShortfall).toBe(0);
  });

  it("최대 수용 초과 인원 계산", () => {
    const r = computeMealCost({ ...base, expectedHeads: 320, maxCapacity: 300 });
    expect(r.overCapacity).toBe(20);
  });

  it("예산 대비 차액(초과 양수)", () => {
    const r = computeMealCost({ ...base, budgetedManwon: 1000 });
    expect(r.budgetDeltaManwon).toBe(260); // 1260 - 1000
  });

  it("예산 없으면 null", () => {
    expect(computeMealCost(base).budgetDeltaManwon).toBeNull();
  });

  it("빈/0 입력 우아하게 처리", () => {
    const r = computeMealCost({ ...base, expectedHeads: 0, unitPriceManwon: 0 });
    expect(r.totalManwon).toBe(0);
    expect(r.billedHeads).toBe(0);
  });
});
