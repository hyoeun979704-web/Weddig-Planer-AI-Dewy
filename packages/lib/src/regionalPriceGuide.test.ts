import { describe, it, expect } from "vitest";
import { priceDeltaPct, pricePositionLabel, BUDGET_GUIDE_LABEL } from "./regionalPriceGuide";

describe("priceDeltaPct", () => {
  it("평균 대비 % 차이(반올림)", () => {
    expect(priceDeltaPct(250, 280)).toBe(-11); // (250-280)/280 = -10.7 → -11
    expect(priceDeltaPct(330, 280)).toBe(18);
    expect(priceDeltaPct(280, 280)).toBe(0);
  });
  it("입력 부족/0/음수 → null", () => {
    expect(priceDeltaPct(null, 280)).toBeNull();
    expect(priceDeltaPct(250, null)).toBeNull();
    expect(priceDeltaPct(0, 280)).toBeNull();
    expect(priceDeltaPct(250, 0)).toBeNull();
  });
});

describe("pricePositionLabel", () => {
  it("±10% 이내는 평균 수준(mid)", () => {
    expect(pricePositionLabel(0)?.tone).toBe("mid");
    expect(pricePositionLabel(9)?.tone).toBe("mid");
    expect(pricePositionLabel(-9)?.tone).toBe("mid");
  });
  it("낮으면 low, 높으면 high", () => {
    expect(pricePositionLabel(-11)?.tone).toBe("low");
    expect(pricePositionLabel(25)?.tone).toBe("high");
    expect(pricePositionLabel(-30)?.text).toContain("30% 낮은");
  });
  it("null → null", () => {
    expect(pricePositionLabel(null)).toBeNull();
  });
});

describe("BUDGET_GUIDE_LABEL", () => {
  it("sdm 은 번들 표기(정직)", () => {
    expect(BUDGET_GUIDE_LABEL.sdm.bundle).toBe(true);
    expect(BUDGET_GUIDE_LABEL.sdm.note).toContain("합산");
  });
  it("단일 카테고리는 번들 아님", () => {
    expect(BUDGET_GUIDE_LABEL.venue.bundle).toBeUndefined();
    expect(BUDGET_GUIDE_LABEL.suit.label).toBe("예복");
  });
});
