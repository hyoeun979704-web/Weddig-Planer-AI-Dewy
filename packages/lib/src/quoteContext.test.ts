import { describe, it, expect } from "vitest";
import { formatBudgetRange, QUOTE_STYLE_LABEL } from "./quoteContext";

describe("formatBudgetRange", () => {
  it("min&max → 범위", () => {
    expect(formatBudgetRange(100, 300)).toBe("100~300만원");
    expect(formatBudgetRange(1000, 2000)).toBe("1,000~2,000만원");
  });
  it("한쪽만 → 이상/이하", () => {
    expect(formatBudgetRange(100, null)).toBe("100만원 이상");
    expect(formatBudgetRange(null, 300)).toBe("300만원 이하");
  });
  it("없거나 0 → null", () => {
    expect(formatBudgetRange(null, null)).toBeNull();
    expect(formatBudgetRange(0, 0)).toBeNull();
  });
});

describe("QUOTE_STYLE_LABEL", () => {
  it("4개 스타일 라벨", () => {
    expect(QUOTE_STYLE_LABEL.small).toBe("스몰웨딩");
    expect(QUOTE_STYLE_LABEL.self).toBe("셀프웨딩");
    expect(Object.keys(QUOTE_STYLE_LABEL)).toHaveLength(4);
  });
});
