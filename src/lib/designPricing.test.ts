import { describe, it, expect } from "vitest";
import { computeDesignCharge, MIN_CHARGE } from "./designPricing";

describe("computeDesignCharge", () => {
  it("포인트 없이 = 가격 그대로", () => {
    expect(computeDesignCharge(29000, 0, 5000)).toEqual({ discount: 0, final: 29000, capped: false });
  });

  it("요청 포인트만큼 할인", () => {
    expect(computeDesignCharge(29000, 5000, 10000)).toEqual({ discount: 5000, final: 24000, capped: false });
  });

  it("잔액 한도로 할인 제한(capped)", () => {
    const r = computeDesignCharge(29000, 5000, 3000);
    expect(r.discount).toBe(3000);
    expect(r.final).toBe(26000);
    expect(r.capped).toBe(true);
  });

  it("최소 결제액(100원)은 남긴다 — 0원 결제 금지", () => {
    const r = computeDesignCharge(29000, 999999, 999999);
    expect(r.final).toBe(MIN_CHARGE);
    expect(r.discount).toBe(29000 - MIN_CHARGE);
    expect(r.capped).toBe(true);
  });

  it("가격이 최소액 이하면 할인 불가", () => {
    expect(computeDesignCharge(100, 50, 50)).toEqual({ discount: 0, final: 100, capped: true });
  });

  it("음수/NaN 방어", () => {
    expect(computeDesignCharge(-5, -1, -1)).toEqual({ discount: 0, final: 0, capped: false });
  });
});
