import { describe, it, expect } from "vitest";
import { summarizePlanningRewards, PLANNING_MILESTONE_AMOUNT, type PlanningMilestoneRow } from "./planningRewards";

const row = (over: Partial<PlanningMilestoneRow>): PlanningMilestoneRow => ({
  budget_done: false, venue_done: false, quote_done: false, checklist_done: false,
  budget_rewarded: false, venue_rewarded: false, quote_rewarded: false, checklist_rewarded: false,
  granted: 0, ...over,
});

describe("summarizePlanningRewards", () => {
  it("null → 전부 미완료·미보상, nextPending=첫 항목", () => {
    const s = summarizePlanningRewards(null);
    expect(s.doneCount).toBe(0);
    expect(s.rewardedCount).toBe(0);
    expect(s.earnedHearts).toBe(0);
    expect(s.allDone).toBe(false);
    expect(s.nextPending?.key).toBe("budget");
  });

  it("일부 완료·보상 집계 + 하트 환산", () => {
    const s = summarizePlanningRewards(row({
      budget_done: true, budget_rewarded: true,
      venue_done: true, venue_rewarded: true,
      checklist_done: true, checklist_rewarded: true,
    }));
    expect(s.doneCount).toBe(3);
    expect(s.rewardedCount).toBe(3);
    expect(s.earnedHearts).toBe(3 * PLANNING_MILESTONE_AMOUNT);
    expect(s.nextPending?.key).toBe("quote"); // 유일한 미완료
  });

  it("전부 완료 → allDone·nextPending null", () => {
    const s = summarizePlanningRewards(row({
      budget_done: true, venue_done: true, quote_done: true, checklist_done: true,
    }));
    expect(s.allDone).toBe(true);
    expect(s.nextPending).toBeNull();
  });

  it("완료했지만 미보상(경계) — done>rewarded 반영", () => {
    const s = summarizePlanningRewards(row({ budget_done: true, budget_rewarded: false }));
    expect(s.doneCount).toBe(1);
    expect(s.rewardedCount).toBe(0);
    expect(s.items[0].done).toBe(true);
    expect(s.items[0].rewarded).toBe(false);
  });
});
