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
  category: string; // wedding_hall / studio / dress / makeup / hanbok / suit / honeymoon / appliance / invitation / general
}

export const CHECKLIST_TEMPLATE: ChecklistTask[] = [
  // ── just_started — D-365 ~ D-300 ──
  { title: "결혼 비전·예산 합의", daysBeforeWedding: 365, stage: "just_started", category: "general" },
  { title: "양가 인사·상견례 일정 잡기", daysBeforeWedding: 350, stage: "just_started", category: "general" },
  { title: "예산 항목별 배분 (웨딩홀/스드메/혼수)", daysBeforeWedding: 340, stage: "just_started", category: "general" },
  { title: "웨딩홀 후보 3~5곳 답사", daysBeforeWedding: 330, stage: "just_started", category: "wedding_hall" },

  // ── researching — D-300 ~ D-180 ──
  { title: "웨딩홀 계약", daysBeforeWedding: 300, stage: "researching", category: "wedding_hall" },
  { title: "스튜디오 후보 비교", daysBeforeWedding: 280, stage: "researching", category: "studio" },
  { title: "드레스샵 투어 (3~4곳)", daysBeforeWedding: 260, stage: "researching", category: "dress_shop" },
  { title: "메이크업샵 알아보기", daysBeforeWedding: 240, stage: "researching", category: "makeup_shop" },
  { title: "한복 알아보기 (혼주·신부)", daysBeforeWedding: 220, stage: "researching", category: "hanbok" },
  { title: "신혼여행지·항공·숙박 알아보기", daysBeforeWedding: 210, stage: "researching", category: "honeymoon" },
  { title: "신혼집 알아보기·계약", daysBeforeWedding: 200, stage: "researching", category: "general" },

  // ── contracting — D-180 ~ D-90 ──
  { title: "스드메 계약 완료", daysBeforeWedding: 180, stage: "contracting", category: "studio" },
  { title: "예복 알아보기·계약", daysBeforeWedding: 170, stage: "contracting", category: "tailor_shop" },
  { title: "신혼여행 예약 확정", daysBeforeWedding: 160, stage: "contracting", category: "honeymoon" },
  { title: "혼수 가전·가구 결정", daysBeforeWedding: 150, stage: "contracting", category: "appliance" },
  { title: "예단·예물 준비", daysBeforeWedding: 140, stage: "contracting", category: "general" },
  { title: "본식 촬영 일정 확정", daysBeforeWedding: 130, stage: "contracting", category: "studio" },
  { title: "리허설 촬영", daysBeforeWedding: 120, stage: "contracting", category: "studio" },
  { title: "청첩장 디자인 결정", daysBeforeWedding: 100, stage: "contracting", category: "invitation_venue" },
  { title: "주례·사회자 섭외", daysBeforeWedding: 95, stage: "contracting", category: "general" },

  // ── wrapping_up — D-90 ~ D-day ──
  { title: "청첩장 발송 (모바일 + 지류)", daysBeforeWedding: 60, stage: "wrapping_up", category: "invitation_venue" },
  { title: "축의금 계좌·답례품 준비", daysBeforeWedding: 50, stage: "wrapping_up", category: "general" },
  { title: "신부 다이어트·관리", daysBeforeWedding: 45, stage: "wrapping_up", category: "general" },
  { title: "예복 가봉 완료", daysBeforeWedding: 40, stage: "wrapping_up", category: "tailor_shop" },
  { title: "드레스 가봉 (최종)", daysBeforeWedding: 35, stage: "wrapping_up", category: "dress_shop" },
  { title: "음식 시연 참석", daysBeforeWedding: 30, stage: "wrapping_up", category: "wedding_hall" },
  { title: "헤어메이크업 리허설", daysBeforeWedding: 25, stage: "wrapping_up", category: "makeup_shop" },
  { title: "하객 RSVP 최종 집계", daysBeforeWedding: 20, stage: "wrapping_up", category: "general" },
  { title: "좌석 배치 확정", daysBeforeWedding: 14, stage: "wrapping_up", category: "wedding_hall" },
  { title: "혼인신고 서류 준비", daysBeforeWedding: 10, stage: "wrapping_up", category: "general" },
  { title: "예식 당일 동선 점검", daysBeforeWedding: 7, stage: "wrapping_up", category: "wedding_hall" },
  { title: "최종 인원·식대 통보", daysBeforeWedding: 3, stage: "wrapping_up", category: "wedding_hall" },
];

/**
 * Generate scheduled_date strings for each template task, anchored to the
 * given weddingDate. When weddingDate is null, we anchor to (today + 12 months)
 * so the user still gets a usable timeline they can shift later.
 */
export function buildScheduleFromTemplate(
  weddingDate: string | null,
  selectedStage: PlanningStage,
): Array<{ title: string; scheduled_date: string; category: string; completed: boolean }> {
  const anchor = weddingDate ? new Date(weddingDate) : addMonths(new Date(), 12);
  const selectedIdx = STAGE_ORDER.indexOf(selectedStage);

  return CHECKLIST_TEMPLATE.map((task) => {
    const due = new Date(anchor);
    due.setDate(due.getDate() - task.daysBeforeWedding);
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
