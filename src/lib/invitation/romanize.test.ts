import { describe, expect, it } from "vitest";
import {
  romanizeKoreanName,
  romanizeKoreanGivenName,
  romanizeKoreanText,
} from "@/lib/invitation/romanize";

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

  it("romanizes ㅇ/ㅁ/ㅂ/ㅅ batchim correctly (회귀: JONG 표 off-by-one)", () => {
    // 받침 ㅇ → 'ng' (이름에 매우 흔함). 이전엔 JONG 표가 29개라 't' 로 나왔음.
    expect(romanizeKoreanName("류근창")).toBe("Ryu Geun chang"); // 창: ...ng
    expect(romanizeKoreanName("이서영")).toBe("Lee Seo yeong");
    expect(romanizeKoreanName("김정")).toBe("Kim Jeong");
    expect(romanizeKoreanName("박성")).toBe("Park Seong");
    expect(romanizeKoreanName("강동")).toBe("Kang Dong");
    // ㅂ/ㅅ 받침도 같은 밀림으로 깨졌던 케이스
    expect(romanizeKoreanName("최갑")).toBe("Choi Gap"); // ㅂ → p
    expect(romanizeKoreanName("정못")).toBe("Jung Mot"); // ㅅ → t
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

  it("romanizes given-name only (성 빼고) for photocard front", () => {
    expect(romanizeKoreanGivenName("김충겸")).toBe("Chung gyeom");
    expect(romanizeKoreanGivenName("엄수빈")).toBe("Su bin");
    expect(romanizeKoreanGivenName("이서연")).toBe("Seo yeon");
    // 외자 이름(성+1글자)
    expect(romanizeKoreanGivenName("이준")).toBe("Jun");
    // 한글 없으면 그대로
    expect(romanizeKoreanGivenName("Su bin")).toBe("Su bin");
    expect(romanizeKoreanGivenName("")).toBeUndefined();
  });

  it("romanizes arbitrary Korean text (venue) word-by-word", () => {
    expect(romanizeKoreanText("여의도 더 파티움")).toBe("Yeouido Deo Patium");
    expect(romanizeKoreanText("호텔")).toBe("Hotel");
    // 이미 영문이면 그대로
    expect(romanizeKoreanText("THE PARTIUM")).toBe("THE PARTIUM");
    expect(romanizeKoreanText("")).toBeUndefined();
  });

  it("passes through input that has no Hangul (already English)", () => {
    expect(romanizeKoreanName("Kim Jae hyun")).toBe("Kim Jae hyun");
    expect(romanizeKoreanName("John")).toBe("John");
  });
});
