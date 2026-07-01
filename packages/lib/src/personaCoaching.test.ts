import { describe, it, expect } from "vitest";
import { priceBandFromDelta, pricePersonaCoaching, mealShortfallCoaching } from "./personaCoaching";

describe("priceBandFromDelta", () => {
  it("±10% 경계로 low/mid/high", () => {
    expect(priceBandFromDelta(-11)).toBe("low");
    expect(priceBandFromDelta(-10)).toBe("low");
    expect(priceBandFromDelta(-9)).toBe("mid");
    expect(priceBandFromDelta(9)).toBe("mid");
    expect(priceBandFromDelta(10)).toBe("high");
    expect(priceBandFromDelta(null)).toBeNull();
  });
});

describe("pricePersonaCoaching", () => {
  it("band 없으면 null", () => {
    expect(pricePersonaCoaching("budget_analytic", null)).toBeNull();
  });
  it("성향별로 다른 코칭(예산형·디자이너·초보 구분)", () => {
    const b = pricePersonaCoaching("budget_analytic", "high");
    const d = pricePersonaCoaching("designer", "high");
    const beg = pricePersonaCoaching("beginner", "mid");
    expect(b).not.toBe(d);
    expect(b).toContain("추가금");
    expect(d).toContain("포트폴리오");
    expect(beg).toContain("비교");
  });
  it("초보는 밴드 무관 항상 비교 견적 코칭", () => {
    expect(pricePersonaCoaching("beginner", "low")).toBe(pricePersonaCoaching("beginner", "high"));
  });
  it("표준은 mid 에서 중립(null), 양끝만 코칭", () => {
    expect(pricePersonaCoaching("standard", "mid")).toBeNull();
    expect(pricePersonaCoaching("standard", "high")).toContain("우선순위");
    expect(pricePersonaCoaching(null, "mid")).toBeNull();
  });
});

describe("mealShortfallCoaching", () => {
  it("성향별 상이, 예산형은 보증인원 낮추기 강조", () => {
    expect(mealShortfallCoaching("budget_analytic")).toContain("낮출");
    expect(mealShortfallCoaching("beginner")).toContain("계약 전");
    expect(mealShortfallCoaching("standard")).toContain("문의");
    expect(mealShortfallCoaching(null)).toContain("문의");
  });
});
