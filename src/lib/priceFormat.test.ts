import { describe, it, expect } from "vitest";
import { formatManwon, formatManwonRange } from "./priceFormat";

describe("formatManwon", () => {
  it("1만원 미만은 원 단위 + 천단위 콤마", () => {
    expect(formatManwon(5000)).toBe("5,000원");
    expect(formatManwon(9999)).toBe("9,999원");
    expect(formatManwon(0)).toBe("0원");
  });

  it("1만원 이상 1억 미만은 만원 단위(정수 반올림)", () => {
    expect(formatManwon(10_000)).toBe("1만원");
    expect(formatManwon(1_200_000)).toBe("120만원");
    expect(formatManwon(99_990_000)).toBe("9999만원");
  });

  it("1억 이상은 억 단위(소수1자리, .0 제거)", () => {
    expect(formatManwon(120_000_000)).toBe("1.2억원");
    expect(formatManwon(100_000_000)).toBe("1억원"); // 1.0 → 1
    expect(formatManwon(250_000_000)).toBe("2.5억원");
  });

  it("경계값", () => {
    expect(formatManwon(9_999)).toBe("9,999원");
    expect(formatManwon(99_999_999)).toBe("10000만원"); // 1억 직전(반올림)
  });

  it("range 표기는 ~ 접미사", () => {
    expect(formatManwonRange(1_200_000)).toBe("120만원~");
    expect(formatManwonRange(120_000_000)).toBe("1.2억원~");
  });
});
