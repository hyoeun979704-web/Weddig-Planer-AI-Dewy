import { describe, it, expect } from "vitest";
import { parseKoreanDate } from "@/lib/koreanDate";

// 기준 오늘 = 2026-06-22 (월요일). 결혼식 = 2026-10-10 (토요일).
const today = new Date(2026, 5, 22); // month 5 = June
const weddingDate = "2026-10-10";
const p = (s: string) => parseKoreanDate(s, { today, weddingDate });

describe("parseKoreanDate", () => {
  it("이미 ISO 면 그대로 정규화", () => {
    expect(p("2026-07-01")).toBe("2026-07-01");
    expect(p("2026-7-1")).toBe("2026-07-01");
  });

  it("오늘/내일/모레/글피", () => {
    expect(p("오늘")).toBe("2026-06-22");
    expect(p("내일")).toBe("2026-06-23");
    expect(p("모레")).toBe("2026-06-24");
    expect(p("글피")).toBe("2026-06-25");
  });

  it("N일/주/개월 후·전 (오늘 기준)", () => {
    expect(p("3일 후")).toBe("2026-06-25");
    expect(p("2주 후")).toBe("2026-07-06");
    expect(p("1개월 후")).toBe("2026-07-22");
    expect(p("10일 전")).toBe("2026-06-12");
    expect(p("3일뒤")).toBe("2026-06-25");
  });

  it("주 X요일 — 이번/다음/다다음", () => {
    // today 월(1). 이번 주 토요일 = +5 → 06-27.
    expect(p("이번 주 토요일")).toBe("2026-06-27");
    // 다음 주 토요일 = +12 → 07-04.
    expect(p("다음 주 토요일")).toBe("2026-07-04");
    expect(p("다다음 주 월요일")).toBe("2026-07-06");
  });

  it("단독 요일은 가장 가까운 미래", () => {
    // today 월요일 → 다음 월요일(+7).
    expect(p("월요일")).toBe("2026-06-29");
    // 금요일(+4).
    expect(p("금요일")).toBe("2026-06-26");
  });

  it("이번/다음 달 N일", () => {
    expect(p("이번 달 30일")).toBe("2026-06-30");
    expect(p("다음 달 15일")).toBe("2026-07-15");
  });

  it("M월 D일 — 지났으면 내년", () => {
    expect(p("7월 1일")).toBe("2026-07-01");
    // 6월 1일은 today(6/22) 이전 → 내년.
    expect(p("6월 1일")).toBe("2027-06-01");
  });

  it("결혼/예식 기준 상대 + D-N", () => {
    expect(p("결혼 3개월 전")).toBe("2026-07-10");
    expect(p("예식 2주 전")).toBe("2026-09-26");
    expect(p("D-30")).toBe("2026-09-10");
    expect(p("d+7")).toBe("2026-10-17");
  });

  it("결혼식 미설정이면 식장 기준 표현은 null", () => {
    expect(parseKoreanDate("D-30", { today })).toBeNull();
    expect(parseKoreanDate("결혼 3개월 전", { today })).toBeNull();
  });

  it("인식 불가/빈 입력은 null", () => {
    expect(p("")).toBeNull();
    expect(p("아무거나")).toBeNull();
    expect(p("내년 봄쯤")).toBeNull();
  });
});
