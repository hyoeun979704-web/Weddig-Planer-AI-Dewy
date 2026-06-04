import {
  applyQuietHours,
  buildDdayPlan,
  buildSchedulePlan,
  buildBudgetPlan,
  isInRange,
  DDAY_MILESTONES,
} from "./schedulePlan";

describe("applyQuietHours", () => {
  it("keeps day-time fire times unchanged", () => {
    const d = new Date(2026, 0, 10, 9, 0, 0); // 09:00
    expect(applyQuietHours(d).getHours()).toBe(9);
    expect(applyQuietHours(d).getDate()).toBe(10);
  });

  it("shifts late-night (>=21:00) to next morning 09:00", () => {
    const d = new Date(2026, 0, 10, 22, 30, 0);
    const out = applyQuietHours(d);
    expect(out.getDate()).toBe(11);
    expect(out.getHours()).toBe(9);
    expect(out.getMinutes()).toBe(0);
  });

  it("shifts early-morning (<08:00) to same day 09:00", () => {
    const d = new Date(2026, 0, 10, 3, 0, 0);
    const out = applyQuietHours(d);
    expect(out.getDate()).toBe(10);
    expect(out.getHours()).toBe(9);
  });
});

describe("buildDdayPlan", () => {
  it("returns empty for missing date", () => {
    expect(buildDdayPlan(null)).toEqual([]);
    expect(buildDdayPlan(undefined)).toEqual([]);
  });

  it("schedules only future milestones at 09:00", () => {
    const now = new Date(2026, 0, 1, 12, 0, 0);
    // wedding 100 days out → D-180/D-90 in past relative to milestone date?
    // wedding = 2026-04-11; D-90 = 2026-01-11 (future), D-180 = 2025-10-13 (past).
    const plan = buildDdayPlan("2026-04-11", now);
    const ns = plan.map((p) => p.title);
    // D-180 milestone date already passed → excluded.
    expect(ns.some((t) => t.includes("D-180"))).toBe(false);
    expect(ns.some((t) => t.includes("D-90"))).toBe(true);
    // all fire at 09:00 local
    expect(plan.every((p) => p.at.getHours() === 9)).toBe(true);
    // all in dday id range
    expect(plan.every((p) => isInRange(p.id, "dday"))).toBe(true);
  });

  it("includes the wedding-day (D-0) message when in the future", () => {
    const now = new Date(2026, 0, 1, 12, 0, 0);
    const plan = buildDdayPlan("2026-06-06", now);
    expect(plan.some((p) => p.title.includes("결혼식 날"))).toBe(true);
    expect(DDAY_MILESTONES).toContain(0);
  });

  it("assigns unique ids", () => {
    const plan = buildDdayPlan("2027-01-01", new Date(2026, 0, 1));
    const ids = plan.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildSchedulePlan", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0);

  it("excludes completed and past items, sorts by date, caps count", () => {
    const items = [
      { id: "a", title: "past", scheduled_date: "2025-12-01", completed: false },
      { id: "b", title: "done", scheduled_date: "2026-03-01", completed: true },
      { id: "c", title: "soon", scheduled_date: "2026-02-01", completed: false },
      { id: "d", title: "later", scheduled_date: "2026-05-01", completed: false },
    ];
    const plan = buildSchedulePlan(items, now);
    expect(plan.map((p) => p.body)).toEqual(["soon", "later"]);
    expect(plan.every((p) => isInRange(p.id, "schedule"))).toBe(true);
    expect(plan.every((p) => p.at.getHours() === 9)).toBe(true);
  });

  it("respects maxItems cap", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      title: `t${i}`,
      scheduled_date: `2026-0${(i % 9) + 1}-15`,
      completed: false,
    }));
    expect(buildSchedulePlan(items, now, 10)).toHaveLength(10);
  });
});

describe("buildBudgetPlan", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0); // Thursday

  it("always schedules a weekly reminder", () => {
    const plan = buildBudgetPlan({}, now);
    const weekly = plan.find((p) => p.repeatEvery === "week");
    expect(weekly).toBeTruthy();
    expect(weekly!.at.getDay()).toBe(0); // Sunday
    expect(isInRange(weekly!.id, "budget")).toBe(true);
  });

  it("adds an over-budget alert when remaining < 0", () => {
    const plan = buildBudgetPlan({ remaining: -50000 }, now);
    expect(plan.some((p) => p.title.includes("초과"))).toBe(true);
  });

  it("omits the over-budget alert when within budget", () => {
    const plan = buildBudgetPlan({ remaining: 1000 }, now);
    expect(plan.some((p) => p.title.includes("초과"))).toBe(false);
  });
});
