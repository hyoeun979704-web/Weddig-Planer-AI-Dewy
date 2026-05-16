import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { buildUserContextPrompt } from "./userContext";

describe("buildUserContextPrompt — LLM 시스템 컨텍스트 빌더", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-16T00:00:00Z"));
  });
  afterAll(() => vi.useRealTimers());

  it("모든 입력 비어있으면 null", () => {
    expect(buildUserContextPrompt({})).toBeNull();
    expect(buildUserContextPrompt({ weddingSettings: null, budgetSettings: null })).toBeNull();
  });

  it("결혼 정보만 있으면 결혼 섹션만 포함", () => {
    const out = buildUserContextPrompt({
      weddingSettings: {
        wedding_date: "2026-08-15",
        wedding_region: "서울 강남",
        wedding_style: "general",
      },
    });
    expect(out).toContain("[사용자 결혼 정보]");
    expect(out).toContain("결혼식: 2026년 8월 15일 (D-91)");
    expect(out).toContain("지역: 서울 강남");
    expect(out).toContain("스타일: 일반 결혼식");
    expect(out).not.toContain("[예산 현황]");
    expect(out).not.toContain("[진행 상황]");
  });

  it("스타일별 라벨 한국어 매핑", () => {
    expect(buildUserContextPrompt({ weddingSettings: { wedding_style: "small" } }))
      .toContain("스타일: 스몰웨딩");
    expect(buildUserContextPrompt({ weddingSettings: { wedding_style: "self" } }))
      .toContain("스타일: 셀프웨딩");
    expect(buildUserContextPrompt({ weddingSettings: { wedding_style: "custom" } }))
      .toContain("스타일: 맞춤형 결혼식");
  });

  it("D-day 계산 (오늘·과거·미래)", () => {
    expect(buildUserContextPrompt({ weddingSettings: { wedding_date: "2026-05-16" } }))
      .toContain("(오늘)");
    expect(buildUserContextPrompt({ weddingSettings: { wedding_date: "2026-05-10" } }))
      .toContain("(D+6)");
    expect(buildUserContextPrompt({ weddingSettings: { wedding_date: "2026-12-25" } }))
      .toContain("(D-223)");
  });

  it("예산 현황: 사용 비율·잔액 표시", () => {
    const out = buildUserContextPrompt({
      budgetSettings: { total_budget: 50000000, guest_count: 200 },
      budgetSummary: { totalSpent: 28000000, remaining: 22000000 },
    });
    expect(out).toContain("[예산 현황]");
    expect(out).toContain("총 예산: 5,000만원");
    expect(out).toContain("예상 하객: 200명");
    expect(out).toContain("사용: 2,800만원 (56%) · 남은: 2,200만원");
  });

  it("진행 상황: 체크리스트 진척률 + 다음 임박 일정", () => {
    const out = buildUserContextPrompt({
      scheduleSummary: {
        completed: 14,
        total: 30,
        nextUpcoming: { title: "청첩장 발송", daysAway: 30 },
      },
    });
    expect(out).toContain("[진행 상황]");
    expect(out).toContain("체크리스트: 14/30개 완료 (47%)");
    expect(out).toContain('다음 일정: "청첩장 발송" (D-30)');
  });

  it("제외 카테고리 노출 — 셀프/스몰 사용자가 일반 답 받지 않게", () => {
    const out = buildUserContextPrompt({
      weddingSettings: {
        wedding_style: "self",
        excluded_categories: ["예식장", "스튜디오"],
      },
    });
    expect(out).toContain("제외 카테고리: 예식장, 스튜디오");
  });

  it("전체 정보 통합 — LLM 가이드 라인 + 3개 섹션 모두 포함", () => {
    const out = buildUserContextPrompt({
      weddingSettings: {
        wedding_date: "2026-08-15",
        wedding_region: "서울 강남",
        wedding_style: "general",
        planning_stage: "partly_done",
        partner_name: "김철수",
      },
      budgetSettings: { total_budget: 50000000, guest_count: 200 },
      budgetSummary: { totalSpent: 28000000, remaining: 22000000 },
      scheduleSummary: {
        completed: 14,
        total: 30,
        nextUpcoming: { title: "청첩장 발송", daysAway: 30 },
      },
    });
    expect(out).toContain("[사용자 컨텍스트");
    expect(out).toContain("자연스럽게 활용");
    expect(out).toContain("[사용자 결혼 정보]");
    expect(out).toContain("준비 단계: 절반 정도");
    expect(out).toContain("파트너: 김철수님");
    expect(out).toContain("[예산 현황]");
    expect(out).toContain("[진행 상황]");
  });

  it("budgetSummary가 있어도 total_budget이 없으면 사용 비율 라인 생략", () => {
    const out = buildUserContextPrompt({
      budgetSummary: { totalSpent: 5000000, remaining: 0 },
    });
    expect(out).toBeNull(); // 다른 필드도 없으니 전체 null
  });
});
