import { describe, it, expect } from "vitest";
import { fmt, manwonToWon, wonPreview } from "./budgetFormat";

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
