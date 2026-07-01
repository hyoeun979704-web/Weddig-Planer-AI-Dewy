import type { WeddingPersonaMode, CeremonyType } from "@/lib/weddingPersona";
import type { PregnancyTrimester } from "@/lib/pregnancy";
import { WEDDING_EXPO_TASK, type TimelinePhase } from "@/lib/schedule";

// 페르소나별 "추천 계획" 프로파일 — 단일 소스. 표준(standard_bride/groom)의 일정 5단계를
// 기준선으로 두고, 각 페르소나는 **델타(추가/제거)만** 선언한다(표준 변경이 전 페르소나에
// 자동 반영 — DRY). 일부 페르소나는 컨텍스트(임신 차수·예식 형식·하객 규모)로 동적 분기한다.
// 설계·결정: docs/260622_personalization_plan.md (P1).
//
// ⚠️ 적용 범위(사용자 확정): **추천 표시(defaultTasks)에만**. 이미 시드된 user_schedule_items 는
// 절대 건드리지 않는다. 빈 단계의 "추천 할 일" 목록만 페르소나에 맞춰 보여준다(회귀 0).
// 프로파일이 없는 페르소나(undefined)는 표준 그대로 — 명시적 델타만 둔다.
//
// 적용 제외(현재): international / remote_overseas — 해외/국제 일정은 후속으로 분리(요청).

interface ScheduleDelta {
  /** 그 단계 defaultTasks 에서 제거할 항목(정확 일치). */
  remove?: string[];
  /** 그 단계에 덧붙일 추천 할 일(중복은 자동 제거). */
  add?: string[];
}

/** key = phase id("1"~"5"). schedule.ts STANDARD_PHASES 와 동일. */
type ScheduleProfile = Partial<Record<string, ScheduleDelta>>;

/** 동적 프로파일이 참고하는 컨텍스트(없으면 일반 폴백). */
export interface PlanContext {
  /** 본식 시점 임신 차수 — 임신 페르소나 일정 분기. */
  trimester?: PregnancyTrimester | null;
  /** 예식 형식 — 소형 페르소나(식당 대관 vs 소규모 베뉴) 분기. */
  ceremonyType?: CeremonyType | null;
  /** 하객 규모 — 소형 페르소나 좌석·답례품 수량 가이드. */
  guestCount?: number | null;
}

type ScheduleProfileOrFn = ScheduleProfile | ((ctx: PlanContext) => ScheduleProfile);

// ── 정적 프로파일 ────────────────────────────────────────────────────────────

// 식(예식) 없는 페르소나 — 웨딩홀·식순·리허설·본식 영상·하객 식대를 빼고 촬영·혼인신고·신혼 준비를 채운다.
// 혼인신고 행정은 리서치 근거로 구체화(증인 2인·가족관계증명서·평일 시군구청).
const SELF: ScheduleProfile = {
  "1": { remove: ["웨딩홀 리스트업", "웨딩플래너 상담", WEDDING_EXPO_TASK], add: ["셀프 촬영 콘셉트·장소 정하기"] },
  "2": { remove: ["웨딩홀 계약하기", "본식 사진·영상(DVD) 예약"], add: ["셀프 촬영 장비·동선 준비", "혼인신고 서류 준비(증인 2인·가족관계증명서)"] },
  "4": { remove: ["하객 인원 확정(식대·답례품 수량)"] },
  "5": { remove: ["웨딩 리허설", "식순 확인", "답례품 준비"], add: ["혼인신고 접수(평일·시군구청)"] },
};

const NO_WEDDING: ScheduleProfile = {
  "1": { remove: ["웨딩홀 리스트업", "웨딩플래너 상담", "웨딩 스타일 결정하기", WEDDING_EXPO_TASK], add: ["신혼집·혼수 우선순위 정하기"] },
  "2": { remove: ["웨딩홀 계약하기", "스튜디오 선정", "드레스샵 예약", "메이크업샵 예약", "본식 사진·영상(DVD) 예약"], add: ["신혼여행 큐레이션 비교"] },
  "4": { remove: ["청첩장 제작", "모바일 청첩장 발송", "하객 리스트 정리", "하객 인원 확정(식대·답례품 수량)"], add: ["허니문 상세 일정 확정"] },
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

// 소형 변형 — 공공시설/야외/호텔스몰.
const SMALL_BUDGET: ScheduleProfile = {
  "1": { add: ["공공시설(구민회관 등) 예약 조건 확인"] },
  "2": { add: ["DIY 가능 항목 정리(부케·소품)"] },
  "5": { add: ["답례품·웰컴키트 준비"] },
};
const SMALL_OUTDOOR: ScheduleProfile = {
  "2": { add: ["야외 베뉴 답사(우천 대비·음향 확인)"] },
  "5": { add: ["우천 플랜·의자 배치 최종 점검", "답례품·웰컴키트 준비"] },
};
const SMALL_LUXURY: ScheduleProfile = {
  "2": { add: ["호텔 스몰 패키지 비교(프라이빗·컨시어지)"] },
  "5": { add: ["답례품·웰컴키트 준비"] },
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

// ── 동적 프로파일 ────────────────────────────────────────────────────────────

// 임신 — 본식 시점 차수별로 우선순위가 다르다. 산부인과 상담은 공통, 나머지는 차수별.
function pregnancyProfile(ctx: PlanContext): ScheduleProfile {
  const consult = "산부인과에 본식 컨디션·일정 상의";
  switch (ctx.trimester) {
    case "first": // 초기 — 입덧·안정. 무리한 일정 줄이고 사전 조사 위주.
      return { "1": { add: [consult, "초기 안정·입덧 관리 — 무리한 일정 줄이기", "임산부 가능 메이크업·시술 미리 알아보기"] } };
    case "second": // 중기 — 안정기. 촬영·가봉을 본격 집중 배치.
      return {
        "1": { add: [consult] },
        "2": { add: ["안정기에 본식 촬영·가봉 집중 배치", "임신 주수 고려해 가봉 일정·여유 사이즈 확인"] },
      };
    case "third": // 후기 — 컨디션·동선·항공 제약. 착용감·식순 간소화·휴식 공간(리서치).
      return {
        "1": { add: [consult] },
        "4": { add: ["신혼여행 단거리·시기 검토(후기 항공 제약)"] },
        "5": { add: ["드레스는 디자인보다 착용감 우선", "본식 당일 동선·의자·간식·낮은 굽 준비", "본식 당일 휴식 공간 미리 확보", "식순 최대한 간소화"] },
      };
    default: // 차수 미상(출산예정일 미입력) — 전 차수 핵심을 합쳐 노출.
      return {
        "1": { add: [consult] },
        "2": { add: ["임신 주수 고려해 가봉 일정·여유 사이즈 확인"] },
        "4": { add: ["신혼여행 단거리·시기 검토(후기 항공 제약)"] },
        "5": { add: ["본식 당일 동선·의자·간식·낮은 굽 준비", "본식 당일 휴식 공간 미리 확보"] },
      };
  }
}

// 가족 스몰(40~80명) — 형식(식당 대관 vs 소규모 베뉴)·규모로 분기.
function smallIntimateProfile(ctx: PlanContext): ScheduleProfile {
  const isRestaurant = ctx.ceremonyType === "restaurant";
  const phase2 = isRestaurant
    ? ["식당 대관 — 단독홀 여부·최소 보증인원 확인", "식당 메뉴·주류 패키지 비교"]
    : ["소규모 베뉴(레스토랑·하우스·카페) 답사"];
  const profile: ScheduleProfile = {
    "2": { add: phase2 },
    "5": { add: ["답례품·웰컴키트 준비"] },
  };
  // 친인척+친구 30~50명대 — 식대는 보증인원 기준이라 인원 파악이 핵심(리서치). 식순 간소화.
  const g = ctx.guestCount;
  if (g != null && g >= 25 && g <= 60) {
    profile["4"] = { add: [`하객 ${g}명 — 식당 보증인원·답례품 수량 확정`] };
    profile["5"] = { add: ["답례품·웰컴키트 준비", "사회·식순 간소화 정리"] };
  }
  return profile;
}

// 페르소나 → 일정 프로파일(정적 또는 ctx 함수). 명시 안 한 모드는 표준(델타 없음).
export const PERSONA_SCHEDULE_PROFILES: Partial<Record<WeddingPersonaMode, ScheduleProfileOrFn>> = {
  pregnancy: pregnancyProfile,
  remarriage: REMARRIAGE,
  remarriage_with_children: REMARRIAGE_CHILDREN,
  self_no_ceremony: SELF,
  no_wedding_travel: NO_WEDDING,
  small_intimate: smallIntimateProfile,
  small_luxury: SMALL_LUXURY,
  small_budget: SMALL_BUDGET,
  small_outdoor: SMALL_OUTDOOR,
  single_household: SINGLE_HOUSEHOLD,
  standard_groom: STANDARD_GROOM,
  budget_analytic: BUDGET_ANALYTIC,
  first_timer: FIRST_TIMER,
  // international / remote_overseas: 후속(해외/국제 일정 분리).
};

/**
 * 페르소나 델타를 timeline phases 의 추천 할 일(defaultTasks)에 적용해 새 배열 반환.
 * 원본 불변(map+spread). 프로파일 없으면 그대로 반환. **표시 전용** — 시드된 일정 무관.
 */
export function applyPersonaSchedule(
  phases: TimelinePhase[],
  mode: WeddingPersonaMode | null | undefined,
  ctx: PlanContext = {},
): TimelinePhase[] {
  const entry = mode ? PERSONA_SCHEDULE_PROFILES[mode] : undefined;
  if (!entry) return phases;
  const profile = typeof entry === "function" ? entry(ctx) : entry;
  return phases.map((p) => {
    const delta = profile[p.id];
    if (!delta) return p;
    let tasks = p.defaultTasks;
    if (delta.remove?.length) tasks = tasks.filter((t) => !delta.remove!.includes(t));
    if (delta.add?.length) tasks = [...tasks, ...delta.add.filter((t) => !tasks.includes(t))];
    return tasks === p.defaultTasks ? p : { ...p, defaultTasks: tasks };
  });
}
