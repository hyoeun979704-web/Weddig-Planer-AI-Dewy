import { describe, expect, it } from "vitest";
import { getFollowUpChips } from "./followUpChips";
import { matchIntent } from "./intentRouter";

describe("getFollowUpChips — 응답 intent별 후속 질문 칩", () => {
  it("etiquette(양가 분담) 응답 뒤엔 양가/예단 관련 후속", () => {
    const chips = getFollowUpChips("guide_etiquette");
    expect(chips).toContain("축의금 봉투 어떻게 써?");
    expect(chips.length).toBe(4);
    // 이전 하드코딩 칩이 아님
    expect(chips).not.toContain("다른 옵션은?");
  });

  it("타임라인 응답 뒤엔 타임라인 후속 (체크리스트·식순)", () => {
    const chips = getFollowUpChips("timeline_planning");
    expect(chips).toContain("본식 식순 보여줘");
    expect(chips).toContain("체크리스트 진척률");
  });

  it("dday 응답 뒤엔 일정/체크리스트 후속", () => {
    const chips = getFollowUpChips("dday");
    expect(chips).toContain("오늘 일정 알려줘");
    expect(chips).toContain("이번 주 일정");
  });

  it("LLM 폴백 또는 매핑 없으면 기본 4개", () => {
    expect(getFollowUpChips("llm")).toHaveLength(4);
    expect(getFollowUpChips(null)).toHaveLength(4);
    expect(getFollowUpChips(undefined)).toHaveLength(4);
    expect(getFollowUpChips("unknown_intent_xyz")).toHaveLength(4);
  });

  it("intent별로 칩이 서로 달라야 함 (이전 회귀: 항상 똑같음)", () => {
    const etiquette = getFollowUpChips("guide_etiquette").join("|");
    const timeline = getFollowUpChips("timeline_planning").join("|");
    const budget = getFollowUpChips("budget_summary").join("|");
    expect(etiquette).not.toBe(timeline);
    expect(timeline).not.toBe(budget);
    expect(etiquette).not.toBe(budget);
  });

  // 라우터 매칭 검증 — 칩이 LLM 폴백되면 일일 한도 소진 + 잘못된 답 회귀.
  // 이전 회귀: 65개 매핑 칩 중 32개가 어떤 패턴에도 안 잡혀 LLM 폴백.
  it("모든 매핑 칩 텍스트가 라우터에서 정적 응답으로 잡혀야 함", () => {
    // 매핑된 모든 intent에 대해 칩 4개씩 검증.
    const intents = [
      "guide_etiquette", "guide_gift", "guide_sdme_timing",
      "guide_invitation_timing", "guide_makeup_trial", "guide_honeymoon_timing",
      "guide_contract", "guide_new_home", "guide_ceremony_progress",
      "dday", "budget_summary", "budget_diagnosis",
      "schedule_today", "schedule_upcoming", "schedule_diagnosis",
      "checklist_progress", "favorites", "cart",
      "free_search", "average_price", "popular_places",
      "venue_recommendation", "sdme_guide", "timeline_planning", "budget_planning",
    ];
    const misses: string[] = [];
    for (const intent of intents) {
      for (const chip of getFollowUpChips(intent)) {
        const m = matchIntent(chip);
        if (!m) misses.push(`[${intent}] "${chip}"`);
      }
    }
    expect(misses, `${misses.length}개 칩이 라우터 매칭 실패:\n${misses.join("\n")}`).toHaveLength(0);
  });

  it("DEFAULT_CHIPS도 모두 라우터 매칭", () => {
    const misses: string[] = [];
    for (const chip of getFollowUpChips(null)) {
      if (!matchIntent(chip)) misses.push(chip);
    }
    expect(misses).toHaveLength(0);
  });
});
