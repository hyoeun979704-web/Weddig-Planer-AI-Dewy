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

  it("임신: 차수별로 추천이 달라짐", () => {
    const first = applyPersonaSchedule(phases(), "pregnancy", { trimester: "first" });
    expect(first.find((p) => p.id === "1")!.defaultTasks).toContain("초기 안정·입덧 관리 — 무리한 일정 줄이기");
    // 초기엔 당일 동선 추천이 아직 안 나옴.
    expect(first.find((p) => p.id === "5")!.defaultTasks).not.toContain("본식 당일 동선·의자·간식·낮은 굽 준비");

    const third = applyPersonaSchedule(phases(), "pregnancy", { trimester: "third" });
    expect(third.find((p) => p.id === "5")!.defaultTasks).toContain("본식 당일 동선·의자·간식·낮은 굽 준비");

    // 차수 미상이면 전 차수 핵심을 합쳐 노출.
    const unknown = applyPersonaSchedule(phases(), "pregnancy");
    expect(unknown.find((p) => p.id === "1")!.defaultTasks).toContain("산부인과에 본식 컨디션·일정 상의");
    expect(unknown.find((p) => p.id === "5")!.defaultTasks).toContain("본식 당일 동선·의자·간식·낮은 굽 준비");
  });

  it("가족 스몰: 식당 대관 vs 소규모 베뉴를 형식으로 분기 + 하객 규모 가이드", () => {
    const restaurant = applyPersonaSchedule(phases(), "small_intimate", { ceremonyType: "restaurant" });
    expect(restaurant.find((p) => p.id === "2")!.defaultTasks).toContain("식당 대관 — 단독홀 여부·최소 보증인원 확인");

    const venue = applyPersonaSchedule(phases(), "small_intimate", { ceremonyType: "small_real" });
    expect(venue.find((p) => p.id === "2")!.defaultTasks).toContain("소규모 베뉴(레스토랑·하우스·카페) 답사");

    const scale = applyPersonaSchedule(phases(), "small_intimate", { guestCount: 40 });
    expect(scale.find((p) => p.id === "4")!.defaultTasks).toContain("하객 40명 — 식당 보증인원·답례품 수량 확정");
  });

  it("표준 보강(리서치): 상견례·본식 영상·하객 인원 확정이 기본에 포함", () => {
    const base = phases();
    expect(base.find((p) => p.id === "1")!.defaultTasks).toContain("상견례 — 양가 첫 인사·방향 합의");
    expect(base.find((p) => p.id === "2")!.defaultTasks).toContain("본식 사진·영상(DVD) 예약");
    expect(base.find((p) => p.id === "4")!.defaultTasks).toContain("하객 인원 확정(식대·답례품 수량)");
  });

  it("식 없는 페르소나는 본식 영상·하객 식대 추천을 제거", () => {
    const self = applyPersonaSchedule(phases(), "self_no_ceremony");
    expect(self.find((p) => p.id === "2")!.defaultTasks).not.toContain("본식 사진·영상(DVD) 예약");
    expect(self.find((p) => p.id === "4")!.defaultTasks).not.toContain("하객 인원 확정(식대·답례품 수량)");
    const noWed = applyPersonaSchedule(phases(), "no_wedding_travel");
    expect(noWed.find((p) => p.id === "2")!.defaultTasks).not.toContain("본식 사진·영상(DVD) 예약");
  });

  it("해외/국제는 일정 개인화에서 제외(표준 그대로)", () => {
    const base = phases();
    expect(applyPersonaSchedule(base, "international")).toBe(base);
    expect(applyPersonaSchedule(base, "remote_overseas")).toBe(base);
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

  // 정적/함수 프로파일 모두를 대표 컨텍스트들로 펼쳐 검사(함수는 분기 전부 커버).
  const SAMPLE_CTXS = [
    {},
    { trimester: "first" as const },
    { trimester: "second" as const },
    { trimester: "third" as const },
    { ceremonyType: "restaurant" as const },
    { ceremonyType: "small_real" as const },
    { guestCount: 40 },
  ];
  const resolvedProfiles = () =>
    Object.values(PERSONA_SCHEDULE_PROFILES).flatMap((entry) =>
      typeof entry === "function" ? SAMPLE_CTXS.map((c) => entry(c)) : [entry!],
    );

  it("모든 프로파일 키는 유효한 phase id('1'~'5')만 사용", () => {
    const valid = new Set(phases().map((p) => p.id));
    for (const profile of resolvedProfiles()) {
      for (const phaseId of Object.keys(profile)) {
        expect(valid.has(phaseId)).toBe(true);
      }
    }
  });

  it("remove 대상이 실제 표준 defaultTasks 에 존재(드리프트 방지)", () => {
    const all = new Set(phases().flatMap((p) => p.defaultTasks));
    for (const profile of resolvedProfiles()) {
      for (const delta of Object.values(profile)) {
        for (const r of delta?.remove ?? []) expect(all.has(r)).toBe(true);
      }
    }
  });
});
