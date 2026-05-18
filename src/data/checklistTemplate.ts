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
// 본식 시점 임신 주수가 늘어날수록 컨디션·일정 압박이 커지므로 영향 큰
// 태스크들을 앞당겨 잡는다.
//
// 1) 기존 태스크의 daysBeforeWedding 을 더 앞쪽으로 시프트 (값이 클수록
//    더 일찍). Title 정확히 일치하는 항목만 override.
const PREGNANCY_DAYS_SHIFT: Record<string, number> = {
  "신혼여행지·항공·숙박 알아보기": 270,   // 210 → 270 (임신 후기 항공 제약 사전 대비)
  "신혼여행 예약 확정": 220,              // 160 → 220
  "본식 촬영 일정 확정": 170,             // 130 → 170 (체력·동선 부담 줄이려 일찍 잡기)
  "리허설 촬영": 160,                    // 120 → 160
  "음식 시연 참석": 60,                  // 30 → 60 (비살균 메뉴·알코올 옵션 사전 협의)
  "헤어메이크업 리허설": 45,             // 25 → 45 (시술 시간 짧게 효율적으로)
  "드레스 가봉 (최종)": 60,              // 35 → 60 (본식 2~3주 전 추가 가봉 + 사이즈 여유)
};

// 2) 임신 케이스에만 들어가는 신규 태스크. bridal_care 우선.
const PREGNANCY_ADDON_TASKS: ChecklistTask[] = [
  { title: "산부인과 본식 컨디션 상담", daysBeforeWedding: 90, stage: "contracting", category: "bridal_care" },
  { title: "임산부 가능 메이크업샵 확인", daysBeforeWedding: 100, stage: "contracting", category: "makeup_shop" },
  { title: "본식 식음 알코올·비살균 옵션 협의", daysBeforeWedding: 40, stage: "wrapping_up", category: "wedding_hall" },
  { title: "신부 대기실 의자·간식·편한 신발 준비", daysBeforeWedding: 14, stage: "wrapping_up", category: "bridal_care" },
];

/**
 * Generate scheduled_date strings for each template task, anchored to the
 * given weddingDate. When weddingDate is null, we anchor to (today + 12 months)
 * so the user still gets a usable timeline they can shift later.
 *
 * `excludedCategories` lets the caller skip seeding tasks the user opted out
 * of (e.g. self-wedding skips studio/dress_shop/makeup_shop).
 * `weddingStyle` layers style-specific add-on tasks on top (셀프웨딩의 DIY
 * 일정 등).
 * `pregnant=true` shifts dress·photo·honeymoon items earlier per
 * PREGNANCY_DAYS_SHIFT + adds PREGNANCY_ADDON_TASKS.
 */
export function buildScheduleFromTemplate(
  weddingDate: string | null,
  selectedStage: PlanningStage,
  excludedCategories: readonly string[] = [],
  weddingStyle?: string | null,
  pregnant: boolean = false,
): Array<{ title: string; scheduled_date: string; category: string; completed: boolean }> {
  const anchor = weddingDate ? new Date(weddingDate) : addMonths(new Date(), 12);
  const selectedIdx = STAGE_ORDER.indexOf(selectedStage);
  const excludedSet = new Set(excludedCategories);

  const baseTasks = CHECKLIST_TEMPLATE.filter((task) => !excludedSet.has(task.category));
  const addons = (weddingStyle && STYLE_ADDON_TASKS[weddingStyle]) || [];
  const pregnancyAddons = pregnant
    ? PREGNANCY_ADDON_TASKS.filter((task) => !excludedSet.has(task.category))
    : [];
  const allTasks = [...baseTasks, ...addons, ...pregnancyAddons];

  return allTasks.map((task) => {
    // 임신 가중치: 매핑된 title 이면 더 앞으로 시프트.
    const effectiveDays = pregnant
      ? PREGNANCY_DAYS_SHIFT[task.title] ?? task.daysBeforeWedding
      : task.daysBeforeWedding;
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
