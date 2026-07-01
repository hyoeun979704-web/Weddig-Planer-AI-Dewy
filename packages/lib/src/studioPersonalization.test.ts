import { describe, it, expect } from "vitest";
import { rankStudioCardIds, studioPersonaHint } from "./studioPersonalization";

const IDS = [
  "wedding-consulting",
  "sdm-preview",
  "dress-tour",
  "makeup-finder",
  "hair-room",
];

describe("rankStudioCardIds", () => {
  it("신호 없으면 원래 순서 유지(안정)", () => {
    expect(rankStudioCardIds(IDS, {})).toEqual(IDS);
  });

  it("신랑: 드레스·메이크업은 아래로, 헤어·컨설팅은 위로", () => {
    const out = rankStudioCardIds(IDS, { role: "groom" });
    expect(out.indexOf("hair-room")).toBeLessThan(out.indexOf("dress-tour"));
    expect(out.indexOf("wedding-consulting")).toBeLessThan(out.indexOf("makeup-finder"));
    // 신부 중심 카드가 맨 뒤로.
    expect(out.slice(-2)).toEqual(expect.arrayContaining(["dress-tour", "makeup-finder"]));
  });

  it("신부: 드레스·메이크업 우선", () => {
    const out = rankStudioCardIds(IDS, { role: "bride" });
    expect(out[0]).toBe("dress-tour");
  });

  it("예산형/초보: 컨설팅이 최상단", () => {
    expect(rankStudioCardIds(IDS, { personaMode: "budget_analytic" })[0]).toBe("wedding-consulting");
    expect(rankStudioCardIds(IDS, { personaMode: "first_timer" })[0]).toBe("wedding-consulting");
  });

  it("원본 배열 불변", () => {
    const copy = [...IDS];
    rankStudioCardIds(IDS, { role: "groom" });
    expect(IDS).toEqual(copy);
  });
});

describe("studioPersonaHint", () => {
  it("임신은 편한 스타일 힌트", () => {
    expect(studioPersonaHint({ personaMode: "pregnancy" })).toContain("편한");
  });
  it("신랑 힌트", () => {
    expect(studioPersonaHint({ role: "groom" })).toContain("신랑");
  });
  it("일반은 null(노이즈 방지)", () => {
    expect(studioPersonaHint({ personaMode: "standard_bride", role: "bride" })).toBeNull();
    expect(studioPersonaHint({})).toBeNull();
  });
});
