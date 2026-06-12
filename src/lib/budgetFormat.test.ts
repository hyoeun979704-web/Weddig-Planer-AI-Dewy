import { describe, it, expect } from "vitest";
import { formatBudgetAmount, fmt, manwonToWon, wonPreview } from "./budgetFormat";

describe("budgetFormat", () => {
  it("fmt: 천단위 콤마", () => {
    expect(fmt(1234)).toBe("1,234");
    expect(fmt(0)).toBe("0");
    expect(fmt(1000000)).toBe("1,000,000");
  });

  it("manwonToWon: 만원→원 (×10000, 반올림)", () => {
    expect(manwonToWon(1234)).toBe(12_340_000);
    expect(manwonToWon(0)).toBe(0);
    expect(manwonToWon(0.5)).toBe(5000);
  });

  it("wonPreview: 만원→원 콤마 표기", () => {
    expect(wonPreview(1234)).toBe("12,340,000");
    expect(wonPreview(50)).toBe("500,000");
  });
});

describe("formatBudgetAmount — 만원 단위 저장값 표기 (\"1,500원\" 회귀 방지)", () => {
  it("만원 단위 그대로, 천 단위 구분", () => {
    expect(formatBudgetAmount(1500)).toBe("1,500만원");
    expect(formatBudgetAmount(70)).toBe("70만원");
  });
  it("소수 입력(128.5만원) 보존", () => {
    expect(formatBudgetAmount(128.5)).toBe("128.5만원");
  });
  it("1억 이상은 억 표기", () => {
    expect(formatBudgetAmount(12000)).toBe("1억 2,000만원");
    expect(formatBudgetAmount(10000)).toBe("1억원");
  });
  it("1만원 미만은 원 표기, 0은 0만원", () => {
    expect(formatBudgetAmount(0.5)).toBe("5,000원");
    expect(formatBudgetAmount(0)).toBe("0만원");
  });
});
