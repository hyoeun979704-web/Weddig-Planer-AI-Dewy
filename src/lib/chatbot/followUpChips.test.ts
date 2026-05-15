import { describe, expect, it } from "vitest";
import { getFollowUpChips } from "./followUpChips";

describe("getFollowUpChips — 응답 intent별 후속 질문 칩", () => {
  it("etiquette(양가 분담) 응답 뒤엔 양가/예단 관련 후속", () => {
    const chips = getFollowUpChips("guide_etiquette");
    expect(chips).toContain("축의금 봉투는 어떻게 써?");
    expect(chips.length).toBe(4);
    // 이전 하드코딩 칩이 아님
    expect(chips).not.toContain("다른 옵션은?");
  });

  it("타임라인 응답 뒤엔 타임라인 후속 (체크리스트·식순)", () => {
    const chips = getFollowUpChips("timeline_planning");
    expect(chips).toContain("시기별 체크리스트 만들어줘");
    expect(chips).toContain("본식 식순 보여줘");
  });

  it("dday 응답 뒤엔 일정/체크리스트 후속", () => {
    const chips = getFollowUpChips("dday");
    expect(chips).toContain("오늘 일정 알려줘");
    expect(chips).toContain("지금 뭐 해야 해?");
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
});
