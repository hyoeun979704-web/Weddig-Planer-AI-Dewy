import { describe, it, expect } from "vitest";
import {
  estimateCateringCost,
  formatManwon,
  deriveSmartSuggestions,
  type SmartSuggestionInput,
} from "./smartSuggestions";

describe("estimateCateringCost", () => {
  it("scales by guest count", () => {
    expect(estimateCateringCost(200)).toEqual({ low: 8000000, mid: 10000000, high: 13000000 });
  });
  it("returns null for 0 / null", () => {
    expect(estimateCateringCost(0)).toBeNull();
    expect(estimateCateringCost(null)).toBeNull();
  });
});

describe("formatManwon", () => {
  it("rounds won to 만원 with separators", () => {
    expect(formatManwon(10000000)).toBe("약 1,000만원");
    expect(formatManwon(8500000)).toBe("약 850만원");
  });
});

const BASE: SmartSuggestionInput = {
  daysUntilWedding: 200,
  hasBudgetSettings: true,
  budgetRemaining: 5000000,
  hasConsulting: true,
  openScheduleCount: 3,
  progressPercent: 80,
  guestCount: 200,
  personaMode: "standard_bride",
};

describe("deriveSmartSuggestions", () => {
  it("returns nothing when there are no gaps", () => {
    expect(deriveSmartSuggestions(BASE)).toEqual([]);
  });

  it("flags over-budget as highest priority", () => {
    const out = deriveSmartSuggestions({ ...BASE, budgetRemaining: -3000000 });
    expect(out[0].id).toBe("over-budget");
    expect(out[0].href).toBe("/budget");
    expect(out[0].reason).toContain("300만원");
  });

  it("suggests budget setup with catering estimate when unset", () => {
    const out = deriveSmartSuggestions({ ...BASE, hasBudgetSettings: false, budgetRemaining: null });
    const s = out.find((x) => x.id === "set-budget");
    expect(s).toBeTruthy();
    expect(s!.reason).toContain("1,000만원"); // 200명 × 5만
  });

  it("suggests consulting when not done, linking to /wedding-consulting", () => {
    const out = deriveSmartSuggestions({ ...BASE, hasConsulting: false });
    const s = out.find((x) => x.id === "consulting");
    expect(s?.href).toBe("/wedding-consulting");
  });

  it("urges checklist when wedding is near and progress is low", () => {
    const out = deriveSmartSuggestions({
      ...BASE,
      daysUntilWedding: 60,
      progressPercent: 40,
    });
    const s = out.find((x) => x.id === "checklist-urgent");
    expect(s).toBeTruthy();
    expect(s!.reason).toContain("D-60");
  });

  it("does NOT urge checklist when far out or progress high", () => {
    expect(
      deriveSmartSuggestions({ ...BASE, daysUntilWedding: 300, progressPercent: 40 }).some(
        (x) => x.id === "checklist-urgent",
      ),
    ).toBe(false);
    expect(
      deriveSmartSuggestions({ ...BASE, daysUntilWedding: 60, progressPercent: 90 }).some(
        (x) => x.id === "checklist-urgent",
      ),
    ).toBe(false);
  });

  it("respects priority ordering and limit", () => {
    const out = deriveSmartSuggestions(
      {
        ...BASE,
        budgetRemaining: -1000000, // over-budget (95)
        daysUntilWedding: 30,
        progressPercent: 20, // checklist (85)
        hasConsulting: false, // consulting (55)
      },
      2,
    );
    expect(out).toHaveLength(2);
    expect(out.map((x) => x.id)).toEqual(["over-budget", "checklist-urgent"]);
  });
});
