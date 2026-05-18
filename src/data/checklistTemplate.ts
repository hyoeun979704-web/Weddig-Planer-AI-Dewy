// Standard wedding-prep checklist template. Used by WeddingInfoSetupModal
// when the user finishes onboarding — bulk-inserts these into
// user_schedule_items so the Schedule page is populated from day one.
//
// Each task has:
//  - daysBeforeWedding: how many days before D-day the task should land.
//    Used to compute scheduled_date from the user's wedding_date.
//    (When wedding_date is 미정, we virtual-anchor to today + 12 months.)
//  - stage: which planning stage this belongs to. When the user picks a
//    later stage on onboarding, all tasks at earlier stages are marked
//    completed=true automatically.
//  - category: maps to user_schedule_items.category for filtering.

export type PlanningStage =
  | "just_started"        // 이제 막 시작 — D-365 +
  | "researching"         // 정보 알아보는 중 — ~D-300
  | "contracting"         // 일부 업체 계약 — ~D-180
  | "wrapping_up";        // 대부분 진행 완료 — ~D-60

export const PLANNING_STAGE_LABELS: Record<PlanningStage, string> = {
  just_started: "이제 막 시작했어요",
  researching: "정보 알아보는 중이에요",
  contracting: "일부 업체 계약했어요",
  wrapping_up: "대부분 진행 완료했어요",
};

// One-line hint that fires under each stage option in the onboarding modal.
// Helps the user pick — the labels alone are too abstract for someone who
// hasn't done this before.
export const PLANNING_STAGE_HINTS: Record<PlanningStage, string> = {
  just_started: "결혼식 1년 이상 남음 · 비전·예산 합의 단계",
  researching: "6~12개월 전 · 업체 비교·답사 중",
  contracting: "3~6개월 전 · 핵심 업체 계약 완료",
  wrapping_up: "2개월 이내 · 시연·시착·하객 안내 마무리",
};

// Order matters — used to compare stages.
export const STAGE_ORDER: PlanningStage[] = [
  "just_started",
  "researching",
  "contracting",
  "wrapping_up",
];

export interface ChecklistTask {
  title: string;
  daysBeforeWedding: number;
  stage: PlanningStage;
  category: string; // wedding_hall / studio / dress_shop / makeup_shop / hanbok / tailor_shop / honeymoon / appliance / invitation_venue / family_meeting / newlywed_home / wedding_gifts / legal_paperwork / bridal_care / ceremony / general
}

export const CHECKLIST_TEMPLATE: ChecklistTask[] = [
  // ── just_started — D-365 ~ D-300 ──
  { title: "결혼 비전·예산 합의", daysBeforeWedding: 365, stage: "just_started", category: "general" },
  { title: "양가 인사·상견례 일정 잡기", daysBeforeWedding: 350, stage: "just_started", category: "family_meeting" },
  { title: "예산 항목별 배분 (웨딩홀/스드메/혼수)", daysBeforeWedding: 340, stage: "just_started", category: "general" },
  { title: "웨딩홀 후보 3~5곳 답사", daysBeforeWedding: 330, stage: "just_started", category: "wedding_hall" },

  // ── researching — D-300 ~ D-180 ──
  { title: "웨딩홀 계약", daysBeforeWedding: 300, stage: "researching", category: "wedding_hall" },
  { title: "스튜디오 후보 비교", daysBeforeWedding: 280, stage: "researching", category: "studio" },
  { title: "드레스샵 투어 (3~4곳)", daysBeforeWedding: 260, stage: "researching", category: "dress_shop" },
  { title: "메이크업샵 알아보기", daysBeforeWedding: 240, stage: "researching", category: "makeup_shop" },
  { title: "한복 알아보기 (혼주·신부)", daysBeforeWedding: 220, stage: "researching", category: "hanbok" },
  { title: "신혼여행지·항공·숙박 알아보기", daysBeforeWedding: 210, stage: "researching", category: "honeymoon" },
  { title: "신혼집 알아보기·계약", daysBeforeWedding: 200, stage: "researching", category: "newlywed_home" },

  // ── contracting — D-180 ~ D-90 ──
  { title: "스드메 계약 완료", daysBeforeWedding: 180, stage: "contracting", category: "studio" },
  { title: "예복 알아보기·계약", daysBeforeWedding: 170, stage: "contracting", category: "tailor_shop" },
  { title: "신혼여행 예약 확정", daysBeforeWedding: 160, stage: "contracting", category: "honeymoon" },
  { title: "혼수 가전·가구 결정", daysBeforeWedding: 150, stage: "contracting", category: "appliance" },
  { title: "예단·예물 준비", daysBeforeWedding: 140, stage: "contracting", category: "wedding_gifts" },
  { title: "본식 촬영 일정 확정", daysBeforeWedding: 130, stage: "contracting", category: "studio" },
  { title: "리허설 촬영", daysBeforeWedding: 120, stage: "contracting", category: "studio" },
  { title: "청첩장 디자인 결정", daysBeforeWedding: 100, stage: "contracting", category: "invitation_venue" },
  { title: "주례·사회자 섭외", daysBeforeWedding: 95, stage: "contracting", category: "ceremony" },

  // ── wrapping_up — D-90 ~ D-day ──
  { title: "청첩장 발송 (모바일 + 지류)", daysBeforeWedding: 60, stage: "wrapping_up", category: "invitation_venue" },
  { title: "축의금 계좌·답례품 준비", daysBeforeWedding: 50, stage: "wrapping_up", category: "ceremony" },
  { title: "신부 다이어트·관리", daysBeforeWedding: 45, stage: "wrapping_up", category: "bridal_care" },
  { title: "예복 가봉 완료", daysBeforeWedding: 40, stage: "wrapping_up", category: "tailor_shop" },
  { title: "드레스 가봉 (최종)", daysBeforeWedding: 35, stage: "wrapping_up", category: "dress_shop" },
  { title: "음식 시연 참석", daysBeforeWedding: 30, stage: "wrapping_up", category: "wedding_hall" },
  { title: "헤어메이크업 리허설", daysBeforeWedding: 25, stage: "wrapping_up", category: "makeup_shop" },
  { title: "하객 RSVP 최종 집계", daysBeforeWedding: 20, stage: "wrapping_up", category: "ceremony" },
  { title: "좌석 배치 확정", daysBeforeWedding: 14, stage: "wrapping_up", category: "wedding_hall" },
  { title: "혼인신고 서류 준비", daysBeforeWedding: 10, stage: "wrapping_up", category: "legal_paperwork" },
  { title: "예식 당일 동선 점검", daysBeforeWedding: 7, stage: "wrapping_up", category: "ceremony" },
  { title: "최종 인원·식대 통보", daysBeforeWedding: 3, stage: "wrapping_up", category: "ceremony" },
];

// Style-specific add-on tasks layered ON TOP of CHECKLIST_TEMPLATE. For
// example, self-wedding users need their own prep tasks (셀프 촬영 컨셉 회의,
// DIY 부케 제작 등) that aren't in the standard template.
//
// Keyed by the same wedding_style values used in user_wedding_settings.
// Returned tasks share the same shape as CHECKLIST_TEMPLATE entries.
export const STYLE_ADDON_TASKS: Record<string, ChecklistTask[]> = {
  self: [
    { title: "셀프 촬영 컨셉·로케이션 회의", daysBeforeWedding: 200, stage: "researching", category: "general" },
    { title: "촬영 친구·장비 일정 조율", daysBeforeWedding: 150, stage: "contracting", category: "general" },
    { title: "DIY 청첩장 디자인 시안", daysBeforeWedding: 110, stage: "contracting", category: "general" },
    { title: "DIY 부케·소품 제작", daysBeforeWedding: 40, stage: "wrapping_up", category: "general" },
    { title: "셀프 메이크업 리허설", daysBeforeWedding: 21, stage: "wrapping_up", category: "general" },
  ],
  small: [
    { title: "소규모 식순·진행자 정하기", daysBeforeWedding: 60, stage: "wrapping_up", category: "general" },
    { title: "직접 만드는 답례품·웰컴 키트", daysBeforeWedding: 45, stage: "wrapping_up", category: "general" },
  ],
  general: [],
  custom: [],
};

// 임신 신부 가중치 — domain-capsules.ts PREGNANCY_CAPSULE 와 정합.
// 본식 시점 임신 차수 (1st/2nd/3rd) 별로 시프트 강도와 추가 태스크가 다름.
//
// 원칙:
//   1st (1~13주): 입덧·초기 안정기, 본식 컨디션 영향 작음. 가봉 사이즈만
//     약간 보수적으로. 신혼여행 일정 그대로.
//   2nd (14~27주): "Sweet spot" — 가장 안정적. 표준 30일 시프트 적용
//     (직전 PR 값과 동일).
//   3rd (28+주): 항공 제약·컨디션 부담 큰 시기. 신혼여행을 본식 이후로
//     미루는 게 안전하지만, 일정상 그대로면 단거리 권장. 가봉·시연·
//     리허설을 더 앞당기고 막달 일정은 최소화.

import type { PregnancyTrimester } from "@/lib/pregnancy";

type DaysShift = Record<string, number>;

const SHIFT_FIRST: DaysShift = {
  "드레스 가봉 (최종)": 45,              // 35 → 45 (사이즈 여유만)
  "신혼여행 예약 확정": 180,              // 160 → 180 (입덧 시기 회피)
};

const SHIFT_SECOND: DaysShift = {
  "신혼여행지·항공·숙박 알아보기": 270,   // 210 → 270 (장거리 제약 사전 대비)
  "신혼여행 예약 확정": 220,              // 160 → 220
  "본식 촬영 일정 확정": 170,             // 130 → 170
  "리허설 촬영": 160,                    // 120 → 160
  "음식 시연 참석": 60,                  // 30 → 60
  "헤어메이크업 리허설": 45,             // 25 → 45
  "드레스 가봉 (최종)": 60,              // 35 → 60
};

const SHIFT_THIRD: DaysShift = {
  "신혼여행지·항공·숙박 알아보기": 320,   // 210 → 320 (단거리 옵션 위주)
  "신혼여행 예약 확정": 280,              // 160 → 280 (본식 후 늦춤 권장도)
  "본식 촬영 일정 확정": 200,             // 130 → 200
  "리허설 촬영": 200,                    // 120 → 200 (본식 4~5주 전 마무리)
  "음식 시연 참석": 90,                  // 30 → 90 (충분한 협의 시간)
  "헤어메이크업 리허설": 60,             // 25 → 60
  "드레스 가봉 (최종)": 75,              // 35 → 75 (배 크기 변화 대응 + 본식 직전 가봉 추가)
  "신부 다이어트·관리": 90,              // 45 → 90 (임신 후기는 다이어트보단 컨디션 관리)
};

const SHIFT_BY_TRIMESTER: Record<PregnancyTrimester, DaysShift> = {
  first: SHIFT_FIRST,
  second: SHIFT_SECOND,
  third: SHIFT_THIRD,
};

// 차수별 신규 태스크. NULL trimester (예: pregnant=true 인데 dueDate 없음)
// 는 SECOND 의 보수적 기본값 사용.
const ADDON_FIRST: ChecklistTask[] = [
  { title: "산부인과 본식 컨디션 상담", daysBeforeWedding: 60, stage: "contracting", category: "bridal_care" },
  { title: "임산부 가능 메이크업샵 확인", daysBeforeWedding: 80, stage: "contracting", category: "makeup_shop" },
];

const ADDON_SECOND: ChecklistTask[] = [
  { title: "산부인과 본식 컨디션 상담", daysBeforeWedding: 90, stage: "contracting", category: "bridal_care" },
  { title: "임산부 가능 메이크업샵 확인", daysBeforeWedding: 100, stage: "contracting", category: "makeup_shop" },
  { title: "본식 식음 알코올·비살균 옵션 협의", daysBeforeWedding: 40, stage: "wrapping_up", category: "wedding_hall" },
  { title: "신부 대기실 의자·간식·편한 신발 준비", daysBeforeWedding: 14, stage: "wrapping_up", category: "bridal_care" },
];

const ADDON_THIRD: ChecklistTask[] = [
  { title: "산부인과 본식 컨디션 상담 (월 1회)", daysBeforeWedding: 120, stage: "contracting", category: "bridal_care" },
  { title: "임산부 가능 메이크업샵 확인", daysBeforeWedding: 120, stage: "contracting", category: "makeup_shop" },
  { title: "본식 식음 알코올·비살균 옵션 협의", daysBeforeWedding: 60, stage: "wrapping_up", category: "wedding_hall" },
  { title: "단거리 신혼여행·산후조리원 동시 검토", daysBeforeWedding: 100, stage: "contracting", category: "honeymoon" },
  { title: "본식 동선·휠체어 대안 시뮬레이션", daysBeforeWedding: 30, stage: "wrapping_up", category: "ceremony" },
  { title: "신부 대기실 의자·간식·편한 신발 준비", daysBeforeWedding: 21, stage: "wrapping_up", category: "bridal_care" },
];

const ADDON_BY_TRIMESTER: Record<PregnancyTrimester, ChecklistTask[]> = {
  first: ADDON_FIRST,
  second: ADDON_SECOND,
  third: ADDON_THIRD,
};

/**
 * Generate scheduled_date strings for each template task, anchored to the
 * given weddingDate. When weddingDate is null, we anchor to (today + 12 months)
 * so the user still gets a usable timeline they can shift later.
 *
 * `excludedCategories` lets the caller skip seeding tasks the user opted out
 * of (e.g. self-wedding skips studio/dress_shop/makeup_shop).
 * `weddingStyle` layers style-specific add-on tasks on top (셀프웨딩의 DIY
 * 일정 등).
 * `pregnant=true` 일 때 본식 시점 임신 차수에 따라 SHIFT_BY_TRIMESTER /
 * ADDON_BY_TRIMESTER 적용. trimester=null 이면 보수적으로 second 사용
 * (예: 출산예정일 미입력).
 */
export function buildScheduleFromTemplate(
  weddingDate: string | null,
  selectedStage: PlanningStage,
  excludedCategories: readonly string[] = [],
  weddingStyle?: string | null,
  pregnant: boolean = false,
  pregnancyTrimester: PregnancyTrimester | null = null,
): Array<{ title: string; scheduled_date: string; category: string; completed: boolean }> {
  const anchor = weddingDate ? new Date(weddingDate) : addMonths(new Date(), 12);
  const selectedIdx = STAGE_ORDER.indexOf(selectedStage);
  const excludedSet = new Set(excludedCategories);

  // 출산예정일 미입력 시 보수적으로 second 적용 (직전 버전과 호환).
  const trimester: PregnancyTrimester | null = pregnant
    ? pregnancyTrimester ?? "second"
    : null;

  const shifts: DaysShift = trimester ? SHIFT_BY_TRIMESTER[trimester] : {};
  const pregnancyAddons = trimester
    ? ADDON_BY_TRIMESTER[trimester].filter((task) => !excludedSet.has(task.category))
    : [];

  const baseTasks = CHECKLIST_TEMPLATE.filter((task) => !excludedSet.has(task.category));
  const addons = (weddingStyle && STYLE_ADDON_TASKS[weddingStyle]) || [];
  const allTasks = [...baseTasks, ...addons, ...pregnancyAddons];

  return allTasks.map((task) => {
    const effectiveDays = shifts[task.title] ?? task.daysBeforeWedding;
    const due = new Date(anchor);
    due.setDate(due.getDate() - effectiveDays);
    const taskStageIdx = STAGE_ORDER.indexOf(task.stage);
    return {
      title: task.title,
      scheduled_date: due.toISOString().slice(0, 10), // YYYY-MM-DD
      category: task.category,
      // Anything from a stage strictly before the user's current stage is
      // assumed already done. Same-stage tasks stay open.
      completed: taskStageIdx < selectedIdx,
    };
  });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
