import { ddayLabel, buildWidgetPayload } from "./widgetData";

describe("ddayLabel", () => {
  it("formats future/today/past", () => {
    expect(ddayLabel(100)).toBe("D-100");
    expect(ddayLabel(0)).toBe("D-DAY");
    expect(ddayLabel(-3)).toBe("D+3");
    expect(ddayLabel(null)).toBeNull();
  });
});

describe("buildWidgetPayload", () => {
  const now = new Date(2026, 0, 1, 12, 0, 0);

  it("builds dday + next schedule + budget", () => {
    const payload = buildWidgetPayload(
      "2026-06-06",
      [
        { title: "past", scheduled_date: "2025-12-01", completed: false },
        { title: "done", scheduled_date: "2026-02-01", completed: true },
        { title: "soon", scheduled_date: "2026-01-08", completed: false },
        { title: "next", scheduled_date: "2026-02-01", completed: false },
      ],
      { spent: 1000, total: 5000, remaining: 4000 },
      now,
    );
    expect(payload.dday?.label).toMatch(/^D-\d+$/);
    expect(payload.dday?.dateText).toBe("2026년 6월 6일");
    // past+completed excluded, sorted by proximity, capped at 3
    expect(payload.schedule.map((s) => s.title)).toEqual(["soon", "next"]);
    expect(payload.budget).toEqual({ spent: 1000, total: 5000, remaining: 4000 });
  });

  it("nulls dday when no date and budget when total 0", () => {
    const payload = buildWidgetPayload(null, [], { spent: 0, total: 0, remaining: 0 }, now);
    expect(payload.dday).toBeNull();
    expect(payload.budget).toBeNull();
    expect(payload.schedule).toEqual([]);
  });
});
