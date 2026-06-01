import { describe, expect, it } from "vitest";
import { romanizeKoreanName } from "@/lib/invitation/romanize";

describe("romanizeKoreanName", () => {
  it("uses the standard surname spelling, not pure RR", () => {
    expect(romanizeKoreanName("김재현")).toBe("Kim Jae hyeon");
    expect(romanizeKoreanName("이서연")).toBe("Lee Seo yeon");
    expect(romanizeKoreanName("박지민")).toBe("Park Ji min");
    expect(romanizeKoreanName("최유진")).toBe("Choi Yu jin");
  });

  it("handles single-syllable given names", () => {
    expect(romanizeKoreanName("이준")).toBe("Lee Jun");
    expect(romanizeKoreanName("강민")).toBe("Kang Min");
  });

  it("handles compound surnames", () => {
    expect(romanizeKoreanName("남궁민수")).toBe("Namgung Min su");
    expect(romanizeKoreanName("선우은")).toBe("Sunwoo Eun");
  });

  it("falls back to rule-based romanization for unknown surnames", () => {
    // 빈(Bin) 은 사전에 없음 → 규칙 변환 'bin' → 'Bin', 이름 첫 음절 대문자
    expect(romanizeKoreanName("빈센트")).toBe("Bin Sen teu");
  });

  it("returns undefined for empty input so the slot can hide", () => {
    expect(romanizeKoreanName("")).toBeUndefined();
    expect(romanizeKoreanName("   ")).toBeUndefined();
    expect(romanizeKoreanName(undefined)).toBeUndefined();
    expect(romanizeKoreanName(null)).toBeUndefined();
  });

  it("passes through input that has no Hangul (already English)", () => {
    expect(romanizeKoreanName("Kim Jae hyun")).toBe("Kim Jae hyun");
    expect(romanizeKoreanName("John")).toBe("John");
  });
});
