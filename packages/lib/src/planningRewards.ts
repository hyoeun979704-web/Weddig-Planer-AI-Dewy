// 준비 진행 리워드(2-B) — check_planning_milestones RPC 결과를 UI 표시용으로 정리.
// 스펜드가 아니라 "준비 행동"(예산·식장·첫견적·체크리스트) 1회 보상으로 유인·리텐션.

export const PLANNING_MILESTONE_AMOUNT = 30;

export type PlanningMilestoneKey = "budget" | "venue" | "quote" | "checklist";

export interface PlanningMilestoneRow {
  budget_done: boolean;
  venue_done: boolean;
  quote_done: boolean;
  checklist_done: boolean;
  budget_rewarded: boolean;
  venue_rewarded: boolean;
  quote_rewarded: boolean;
  checklist_rewarded: boolean;
  granted: number;
}

export interface PlanningMilestoneMeta {
  key: PlanningMilestoneKey;
  label: string;
  desc: string;
  href: string;
}

/** 마일스톤 메타(순서=표시 순서). href 는 그 행동을 하는 화면. */
export const PLANNING_MILESTONES: PlanningMilestoneMeta[] = [
  { key: "budget", label: "예산 설정", desc: "총 예산 정하기", href: "/budget" },
  { key: "venue", label: "예식장 등록", desc: "내 식장 등록하기", href: "/venues" },
  { key: "quote", label: "첫 견적 요청", desc: "업체에 견적 받기", href: "/quote/new" },
  { key: "checklist", label: "체크리스트 5개 완료", desc: "준비 항목 체크", href: "/schedule" },
];

export interface PlanningMilestoneItem extends PlanningMilestoneMeta {
  done: boolean;
  rewarded: boolean;
}

export interface PlanningRewardsSummary {
  items: PlanningMilestoneItem[];
  rewardedCount: number;
  doneCount: number;
  totalCount: number;
  earnedHearts: number;
  allDone: boolean;
  /** 아직 안 한 첫 마일스톤(넛지 대상). 전부 했으면 null. */
  nextPending: PlanningMilestoneItem | null;
}

export function summarizePlanningRewards(
  row: PlanningMilestoneRow | null | undefined,
): PlanningRewardsSummary {
  const r = (row ?? {}) as Record<string, boolean | number | undefined>;
  const items: PlanningMilestoneItem[] = PLANNING_MILESTONES.map((m) => ({
    ...m,
    done: !!r[`${m.key}_done`],
    rewarded: !!r[`${m.key}_rewarded`],
  }));
  const rewardedCount = items.filter((i) => i.rewarded).length;
  const doneCount = items.filter((i) => i.done).length;
  return {
    items,
    rewardedCount,
    doneCount,
    totalCount: items.length,
    earnedHearts: rewardedCount * PLANNING_MILESTONE_AMOUNT,
    allDone: items.every((i) => i.done),
    nextPending: items.find((i) => !i.done) ?? null,
  };
}
