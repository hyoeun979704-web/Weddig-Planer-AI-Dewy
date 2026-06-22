import type { WeddingPersonaMode } from "@/lib/weddingPersona";
import type { TimelinePhase } from "@/lib/schedule";

// 페르소나별 "추천 계획" 프로파일 — 단일 소스. 표준(standard_bride/groom)의 일정 5단계를
// 기준선으로 두고, 각 페르소나는 **델타(추가/제거)만** 선언한다(표준 변경이 전 페르소나에
// 자동 반영 — DRY). 설계·결정: docs/260622_personalization_plan.md (P1).
//
// ⚠️ 적용 범위(사용자 확정): **추천 표시(defaultTasks)에만**. 이미 시드된 user_schedule_items 는
// 절대 건드리지 않는다. 빈 단계의 "추천 할 일" 목록만 페르소나에 맞춰 보여준다(회귀 0).
// 프로파일이 없는 페르소나(undefined)는 표준 그대로 — 명시적 델타만 둔다.

interface ScheduleDelta {
  /** 그 단계 defaultTasks 에서 제거할 항목(정확 일치). */
  remove?: string[];
  /** 그 단계에 덧붙일 추천 할 일(중복은 자동 제거). */
  add?: string[];
}

/** key = phase id("1"~"5"). schedule.ts STANDARD_PHASES 와 동일. */
type ScheduleProfile = Partial<Record<string, ScheduleDelta>>;

// 식(예식) 없는 페르소나 — 웨딩홀·식순·리허설을 빼고 촬영·혼인신고·신혼 준비를 채운다.
const SELF: ScheduleProfile = {
  "1": { remove: ["웨딩홀 리스트업", "웨딩플래너 상담"], add: ["셀프 촬영 콘셉트·장소 정하기"] },
  "2": { remove: ["웨딩홀 계약하기"], add: ["셀프 촬영 장비·동선 준비", "혼인신고 서류 확인"] },
  "5": { remove: ["웨딩 리허설", "식순 확인", "답례품 준비"], add: ["혼인신고 접수"] },
};

const NO_WEDDING: ScheduleProfile = {
  "1": { remove: ["웨딩홀 리스트업", "웨딩플래너 상담", "웨딩 스타일 결정하기"], add: ["신혼집·혼수 우선순위 정하기"] },
  "2": { remove: ["웨딩홀 계약하기", "스튜디오 선정", "드레스샵 예약", "메이크업샵 예약"], add: ["신혼여행 큐레이션 비교"] },
  "4": { remove: ["청첩장 제작", "모바일 청첩장 발송", "하객 리스트 정리"], add: ["허니문 상세 일정 확정"] },
  "5": { remove: ["드레스 최종 피팅", "웨딩 리허설", "식순 확인", "답례품 준비"], add: ["신혼집 셋업 마무리"] },
};

// 재혼(±자녀) — 예물/예단 비중을 낮추고 혼인신고·작은 가족식·자녀 동반을 보강.
const REMARRIAGE: ScheduleProfile = {
  "1": { add: ["작은 가족식 진행 톤·범위 정하기"] },
  "3": { remove: ["예물 선택"], add: ["혼인신고 서류 준비"] },
  "5": { add: ["양가 인사·가족 자리 배치 정리"] },
};
const REMARRIAGE_CHILDREN: ScheduleProfile = {
  "1": { add: ["작은 가족식 진행 톤·범위 정하기"] },
  "3": { remove: ["예물 선택"], add: ["혼인신고 서류 준비"] },
  "5": { add: ["자녀 동반 식순·자리 배치 정하기"] },
};

// 소형/스몰 — 대형 웨딩홀 대신 소규모 베뉴 답사 + 답례품·웰컴키트.
const SMALL_BASE: ScheduleProfile = {
  "2": { add: ["소규모 베뉴(레스토랑·하우스·카페) 답사"] },
  "5": { add: ["답례품·웰컴키트 준비"] },
};
const SMALL_BUDGET: ScheduleProfile = {
  "1": { add: ["공공시설(구민회관 등) 예약 조건 확인"] },
  "2": { add: ["DIY 가능 항목 정리(부케·소품)"] },
  "5": { add: ["답례품·웰컴키트 준비"] },
};
const SMALL_OUTDOOR: ScheduleProfile = {
  "2": { add: ["야외 베뉴 답사(우천 대비·음향 확인)"] },
  "5": { add: ["우천 플랜·의자 배치 최종 점검", "답례품·웰컴키트 준비"] },
};

// 해외/국제 — 한국 방문 압축·위임·이중식·영문 자료.
const REMOTE_OVERSEAS: ScheduleProfile = {
  "1": { add: ["한국 방문 일정(2~3회) 큰 틀 잡기"] },
  "2": { add: ["방문 회차에 업체 미팅 압축 배치", "양가 부모께 위임할 항목 정리"] },
  "4": { add: ["체류·비자 동선 확인"] },
};
const INTERNATIONAL: ScheduleProfile = {
  "1": { add: ["한국·해외 이중식 여부·일정 큰 틀 잡기"] },
  "4": { add: ["영문 청첩장·안내문 준비", "하객 비자·체류 동선 확인"] },
};

const SINGLE_HOUSEHOLD: ScheduleProfile = {
  "1": { remove: ["웨딩플래너 상담"], add: ["1인 진행 체크리스트 확인(부모 역할 부재 대안)"] },
};

const STANDARD_GROOM: ScheduleProfile = {
  "1": { add: ["신랑 예복 후보 좁히기(맞춤·기성·렌탈)"] },
  "3": { add: ["예복 가봉 일정 잡기"] },
};

const BUDGET_ANALYTIC: ScheduleProfile = {
  "1": { add: ["업체별 견적 비교표 만들기"] },
  "2": { add: ["계약 전 추가금·숨은비용 확인"] },
};

const FIRST_TIMER: ScheduleProfile = {
  "1": { add: ["결혼 준비 용어·순서 익히기(스드메가 뭐예요?)"] },
};

const PREGNANCY: ScheduleProfile = {
  "1": { add: ["산부인과에 본식 컨디션·일정 상의"] },
  "2": { add: ["임신 주수 고려해 가봉 일정·여유 사이즈 확인"] },
  "4": { add: ["신혼여행 단거리·시기 검토(후기 항공 제약)"] },
  "5": { add: ["본식 당일 동선·의자·간식·낮은 굽 준비"] },
};

// 페르소나 → 일정 프로파일. 명시 안 한 모드는 표준(델타 없음).
export const PERSONA_SCHEDULE_PROFILES: Partial<Record<WeddingPersonaMode, ScheduleProfile>> = {
  pregnancy: PREGNANCY,
  international: INTERNATIONAL,
  remarriage: REMARRIAGE,
  remarriage_with_children: REMARRIAGE_CHILDREN,
  self_no_ceremony: SELF,
  no_wedding_travel: NO_WEDDING,
  small_intimate: SMALL_BASE,
  small_luxury: SMALL_BASE,
  small_budget: SMALL_BUDGET,
  small_outdoor: SMALL_OUTDOOR,
  remote_overseas: REMOTE_OVERSEAS,
  single_household: SINGLE_HOUSEHOLD,
  standard_groom: STANDARD_GROOM,
  budget_analytic: BUDGET_ANALYTIC,
  first_timer: FIRST_TIMER,
};

/**
 * 페르소나 델타를 timeline phases 의 추천 할 일(defaultTasks)에 적용해 새 배열 반환.
 * 원본 불변(map+spread). 프로파일 없으면 그대로 반환. **표시 전용** — 시드된 일정 무관.
 */
export function applyPersonaSchedule(
  phases: TimelinePhase[],
  mode: WeddingPersonaMode | null | undefined,
): TimelinePhase[] {
  const profile = mode ? PERSONA_SCHEDULE_PROFILES[mode] : undefined;
  if (!profile) return phases;
  return phases.map((p) => {
    const delta = profile[p.id];
    if (!delta) return p;
    let tasks = p.defaultTasks;
    if (delta.remove?.length) tasks = tasks.filter((t) => !delta.remove!.includes(t));
    if (delta.add?.length) tasks = [...tasks, ...delta.add.filter((t) => !tasks.includes(t))];
    return tasks === p.defaultTasks ? p : { ...p, defaultTasks: tasks };
  });
}
