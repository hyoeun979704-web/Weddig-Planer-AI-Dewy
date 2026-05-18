import { describe, expect, it, vi } from "vitest";

// Supabase 클라이언트를 빈 결과로 모킹 — venue/sdme 핸들러도 폴백 경로 검증 가능.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: function () { return this; },
        in: function () { return this; },
        not: function () { return this; },
        or: function () { return this; },
        order: function () { return this; },
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

// ChecklistTemplate 로딩 우회 — handleBudgetPlanning이 이걸 import하지만 사용 안 함.
vi.mock("@/data/checklistTemplate", () => ({ CHECKLIST_TEMPLATE: [] }));

import {
  handleBudgetPlanning,
  handleTimelinePlanning,
  handleVenueRecommendation,
  handleSdmeGuide,
} from "./quickQuestionHandlers";

describe("handleTimelinePlanning (모달 #3 타임라인)", () => {
  it("예식 시간으로부터 본식 타임라인 계산", async () => {
    const result = await handleTimelinePlanning({
      ceremonyTime: "13:00",
      duration: "60분",
      venueType: "호텔",
      brideStartTime: "09:00",
    });
    expect(result).toContain("13:00");
    expect(result).toContain("신부 메이크업 시작");
    expect(result).toContain("예식 시작");
    expect(result).toContain("폐백");
  });

  it("피로연 '있음' 선택 시 피로연 라인이 출력됨 (이전 버그: '예'만 체크해서 누락)", async () => {
    const result = await handleTimelinePlanning({
      ceremonyTime: "13:00",
      duration: "60분",
      reception: "있음",
    });
    expect(result).toContain("피로연 시작");
  });

  it("피로연 '없음' 선택 시 피로연 라인이 안 나옴", async () => {
    const result = await handleTimelinePlanning({
      ceremonyTime: "13:00",
      duration: "60분",
      reception: "없음",
    });
    expect(result).not.toContain("피로연 시작");
  });

  it("duration이 '1시간' 라벨이면 60분으로 처리 (이전 버그: 1분으로 잘림)", async () => {
    const result = await handleTimelinePlanning({
      ceremonyTime: "12:30",
      duration: "1시간",
    });
    expect(result).toContain("(60분 진행)");
    // 12:30 + 60분 = 13:30 예식 종료
    expect(result).toContain("13:30 예식 종료");
    // 12:30 + 60 + 45 = 14:15 폐백 종료 (이전엔 12:31 / 13:16으로 박살)
    expect(result).toContain("14:15 폐백·단체사진 종료");
  });

  it("duration이 '1시간 30분' 라벨이면 90분으로 처리", async () => {
    const result = await handleTimelinePlanning({
      ceremonyTime: "12:00",
      duration: "1시간 30분",
    });
    expect(result).toContain("(90분 진행)");
    expect(result).toContain("13:30 예식 종료");
  });

  it("사용자 입력 피로연 시간이 폐백 종료보다 빨라도 라인이 시간순 정렬", async () => {
    // 예식 12:30 + 60분 = 13:30 종료, 폐백 종료 14:15.
    // 그런데 사용자가 피로연 13:00을 입력하면 폐백(14:15)·피로연(13:00) 역순.
    // 시간순 정렬로 피로연이 폐백 앞에 와야 함.
    const result = await handleTimelinePlanning({
      ceremonyTime: "12:30",
      duration: "1시간",
      reception: "있음",
      receptionTime: "13:00",
    });
    const recIdx = result.indexOf("13:00 피로연");
    const pbIdx = result.indexOf("14:15 폐백");
    expect(recIdx).toBeGreaterThan(-1);
    expect(pbIdx).toBeGreaterThan(-1);
    expect(recIdx).toBeLessThan(pbIdx);
  });

  it("한복 환복 '있음' 선택 시 환복 라인 출력", async () => {
    const result = await handleTimelinePlanning({
      ceremonyTime: "13:00",
      duration: "60분",
      hanbok: "있음",
    });
    expect(result).toContain("한복 환복");
  });

  it("예식 시간 누락 시 안내 메시지", async () => {
    const result = await handleTimelinePlanning({});
    expect(result).toContain("예식 시작 시간");
  });
});

describe("handleBudgetPlanning (모달 #4 예산)", () => {
  it("총 예산만 입력해도 항목별 분배 출력", async () => {
    const result = await handleBudgetPlanning({ totalBudget: "5000" });
    expect(result).toContain("총 예산");
    expect(result).toContain("웨딩홀+식대");
    expect(result).toContain("스드메");
    expect(result).toContain("신혼여행");
  });

  it("우선순위 선택 시 해당 항목에 +5% 가중", async () => {
    const result = await handleBudgetPlanning({
      totalBudget: "5000",
      priorities: ["웨딩홀", "스드메"],
    });
    expect(result).toContain("⭐");
  });

  it("양가 지원금 입력 시 실 부담 예산 표시", async () => {
    const result = await handleBudgetPlanning({
      totalBudget: "5000",
      supportAmount: "2000",
    });
    expect(result).toContain("양가 지원금");
    expect(result).toContain("실 부담 예산");
  });

  it("regionLabel을 표시용으로 사용 (region searchKey 아닌)", async () => {
    const result = await handleBudgetPlanning({
      totalBudget: "5000",
      region: "강남", // searchKey
      regionLabel: "서울 강남/서초",
    });
    expect(result).toContain("서울 강남/서초");
    expect(result).not.toMatch(/총 예산.*\(강남\)/); // searchKey가 본문에 안 보임
  });

  it("총 예산 미입력 시 안내", async () => {
    const result = await handleBudgetPlanning({});
    expect(result).toContain("총 예산을 입력");
  });
});

describe("handleVenueRecommendation (모달 #1 웨딩홀) — 빈 결과 폴백", () => {
  it("등록 식장이 없으면 폴백 안내 (regionLabel 사용)", async () => {
    const result = await handleVenueRecommendation({
      region: "강남",
      regionLabel: "서울 강남/서초",
      guests: 150,
      budget: 2000, // 만원 — BUDGET_OPTIONS_VENUE의 max
      budgetLabel: "1,000만~2,000만원",
      styles: ["호텔 웨딩"],
    });
    expect(result).toContain("서울 강남/서초"); // regionLabel 표시
    expect(result).toContain("웨딩홀 페이지");
  });

  it("budget이 number 타입으로 와도 정상 처리 (이전 버그: 라벨 문자열 파싱 시 1,000만 → 1)", async () => {
    // BUDGET_OPTIONS의 라벨 "1,000만~2,000만원"을 그대로 받던 시절엔
    // parseNumber가 "10002000"으로 잘못 해석되던 버그.
    // 이제는 max(2000)을 number로 받음.
    const result = await handleVenueRecommendation({
      region: "경기",
      regionLabel: "경기 (수원/성남/...)",
      guests: 100,
      budget: 2000,
      budgetLabel: "1,000만~2,000만원",
    });
    expect(result).toBeTruthy();
    expect(result).toContain("경기 (수원/성남/...)");
  });
});

describe("handleSdmeGuide (모달 #2 스드메) — 빈 결과 폴백", () => {
  it("price stats 없어도 폴백 가이드 표시", async () => {
    const result = await handleSdmeGuide({
      region: "강남",
      regionLabel: "서울 강남/서초",
      budget: 500,
      budgetLabel: "350~500만원",
    });
    expect(result).toContain("스드메 가이드");
    expect(result).toContain("서울 강남/서초");
    expect(result).toContain("스튜디오"); // 폴백 가이드 라인
    expect(result).toContain("숨은 추가금");
  });
});
