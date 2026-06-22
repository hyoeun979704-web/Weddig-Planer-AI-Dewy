import { describe, it, expect } from "vitest";
import { applyPersonaSchedule, PERSONA_SCHEDULE_PROFILES } from "./personaPlanProfile";
import { buildTimelinePhases } from "./schedule";

const phases = () => buildTimelinePhases(365);

describe("personaPlanProfile/applyPersonaSchedule", () => {
  it("프로파일 없는 페르소나는 표준 그대로(참조 동일)", () => {
    const base = phases();
    expect(applyPersonaSchedule(base, "standard_bride")).toBe(base);
    expect(applyPersonaSchedule(base, null)).toBe(base);
  });

  it("노웨딩: 식장·식순 task 제거 + 허니문/혼수 추가", () => {
    const out = applyPersonaSchedule(phases(), "no_wedding_travel");
    const p2 = out.find((p) => p.id === "2")!.defaultTasks;
    expect(p2).not.toContain("웨딩홀 계약하기");
    expect(p2).not.toContain("스튜디오 선정");
    const p5 = out.find((p) => p.id === "5")!.defaultTasks;
    expect(p5).not.toContain("웨딩 리허설");
    expect(p5).toContain("신혼집 셋업 마무리");
  });

  it("임신: 단계별 의료/컨디션 추천이 추가됨", () => {
    const out = applyPersonaSchedule(phases(), "pregnancy");
    expect(out.find((p) => p.id === "1")!.defaultTasks).toContain("산부인과에 본식 컨디션·일정 상의");
    expect(out.find((p) => p.id === "5")!.defaultTasks).toContain("본식 당일 동선·의자·간식·낮은 굽 준비");
  });

  it("재혼: 예물 제거 + 혼인신고 추가", () => {
    const p3 = applyPersonaSchedule(phases(), "remarriage").find((p) => p.id === "3")!.defaultTasks;
    expect(p3).not.toContain("예물 선택");
    expect(p3).toContain("혼인신고 서류 준비");
  });

  it("원본 phases 를 변형하지 않는다(불변)", () => {
    const base = phases();
    const before = base.find((p) => p.id === "2")!.defaultTasks.slice();
    applyPersonaSchedule(base, "no_wedding_travel");
    expect(base.find((p) => p.id === "2")!.defaultTasks).toEqual(before);
  });

  it("모든 프로파일 키는 유효한 phase id('1'~'5')만 사용", () => {
    const valid = new Set(phases().map((p) => p.id));
    for (const profile of Object.values(PERSONA_SCHEDULE_PROFILES)) {
      for (const phaseId of Object.keys(profile!)) {
        expect(valid.has(phaseId)).toBe(true);
      }
    }
  });

  it("remove 대상이 실제 표준 defaultTasks 에 존재(드리프트 방지)", () => {
    const all = new Set(phases().flatMap((p) => p.defaultTasks));
    for (const profile of Object.values(PERSONA_SCHEDULE_PROFILES)) {
      for (const delta of Object.values(profile!)) {
        for (const r of delta?.remove ?? []) expect(all.has(r)).toBe(true);
      }
    }
  });
});
