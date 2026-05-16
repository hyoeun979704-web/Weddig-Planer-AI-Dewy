import { describe, it, expect } from "vitest";
import {
  clearHiddenBudgetValues,
  visibleBudgetCategories,
  isBudgetCategoryHidden,
  type BudgetCategoryKey,
} from "./weddingStyle";

describe("clearHiddenBudgetValues", () => {
  const ALL: BudgetCategoryKey[] = [
    "venue", "meal", "sdm", "suit", "hanbok", "ring",
    "meetup", "house", "honeymoon", "etc",
  ];

  it("preserves values for visible keys, zeros hidden ones", () => {
    // A small-wedding user (hanbok hidden) re-saves their budget. The
    // residual hanbok=200만 from before should not survive the save.
    const input = { venue: 1000, hanbok: 200, ring: 100 };
    const visible = ALL.filter((k) => k !== "hanbok");
    const out = clearHiddenBudgetValues(input, visible);
    expect(out.venue).toBe(1000);
    expect(out.ring).toBe(100);
    expect(out.hanbok).toBe(0);
  });

  it("returns a record with every BudgetCategoryKey present", () => {
    const out = clearHiddenBudgetValues({}, ALL);
    expect(Object.keys(out).sort()).toEqual([...ALL].sort());
  });

  it("zeros every key when none are visible", () => {
    const input = { venue: 1000, ring: 500 };
    const out = clearHiddenBudgetValues(input, []);
    for (const k of ALL) expect(out[k]).toBe(0);
  });

  it("composes with visibleBudgetCategories for the real exclusion path", () => {
    // Self-wedding skips studio/dress/makeup → sdm budget row is hidden
    // (every composing schedule category excluded).
    const excluded = ["studio", "dress_shop", "makeup_shop"];
    expect(isBudgetCategoryHidden("sdm", excluded)).toBe(true);
    const visible = visibleBudgetCategories(excluded);
    const out = clearHiddenBudgetValues(
      { venue: 1000, sdm: 500, ring: 100 },
      visible
    );
    expect(out.sdm).toBe(0);
    expect(out.venue).toBe(1000);
    expect(out.ring).toBe(100);
  });

  it("treats undefined input values as 0 (stable shape)", () => {
    const out = clearHiddenBudgetValues({ venue: 1000 }, ALL);
    expect(out.venue).toBe(1000);
    expect(out.ring).toBe(0); // not in input → 0, not undefined
    expect(out.hanbok).toBe(0);
  });

  it("does not mutate its input", () => {
    const input = { venue: 1000, hanbok: 200 };
    const visible = ALL.filter((k) => k !== "hanbok");
    clearHiddenBudgetValues(input, visible);
    expect(input.hanbok).toBe(200);
  });
});
