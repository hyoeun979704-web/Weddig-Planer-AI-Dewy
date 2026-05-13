import { describe, it, expect } from "vitest";
import {
  resolveRegionKey,
  scheduleCategoryToBudget,
  getRegionalAvgWithMeal,
  regions,
  FULL_MAPPED_SCHEDULE_CATEGORIES,
  PARTIAL_MAPPED_SCHEDULE_CATEGORIES,
} from "./budgetData";

describe("resolveRegionKey", () => {
  it("returns key when given the budget key directly", () => {
    expect(resolveRegionKey("seoul")).toBe("seoul");
    expect(resolveRegionKey("jeju")).toBe("jeju");
  });

  it("returns key when given the short Korean label", () => {
    expect(resolveRegionKey("서울")).toBe("seoul");
    expect(resolveRegionKey("충남")).toBe("chungnam");
  });

  it("returns key when given the official long Korean label", () => {
    expect(resolveRegionKey("서울특별시")).toBe("seoul");
    expect(resolveRegionKey("충청남도")).toBe("chungnam");
    expect(resolveRegionKey("강원특별자치도")).toBe("gangwon");
  });

  it("returns undefined for null/empty/unknown", () => {
    expect(resolveRegionKey(null)).toBeUndefined();
    expect(resolveRegionKey("")).toBeUndefined();
    expect(resolveRegionKey(undefined)).toBeUndefined();
    expect(resolveRegionKey("Tokyo")).toBeUndefined();
  });

  it("every defined region has unique short and long labels resolvable both ways", () => {
    for (const [key, r] of Object.entries(regions)) {
      expect(resolveRegionKey(r.label)).toBe(key);
      expect(resolveRegionKey(r.officialLabel)).toBe(key);
    }
  });
});

describe("scheduleCategoryToBudget", () => {
  it("maps full-mapped schedule categories to their budget keys", () => {
    expect(scheduleCategoryToBudget("wedding_hall")).toBe("venue");
    expect(scheduleCategoryToBudget("studio")).toBe("sdm");
    expect(scheduleCategoryToBudget("dress_shop")).toBe("sdm");
    expect(scheduleCategoryToBudget("makeup_shop")).toBe("sdm");
    expect(scheduleCategoryToBudget("appliance")).toBe("house");
    expect(scheduleCategoryToBudget("honeymoon")).toBe("honeymoon");
  });

  it("returns null for unmapped / general", () => {
    expect(scheduleCategoryToBudget("general")).toBeNull();
    expect(scheduleCategoryToBudget(null)).toBeNull();
    expect(scheduleCategoryToBudget(undefined)).toBeNull();
    expect(scheduleCategoryToBudget("unknown_shop")).toBeNull();
  });

  it("every FULL_MAPPED_SCHEDULE_CATEGORIES entry resolves to a budget key", () => {
    for (const c of FULL_MAPPED_SCHEDULE_CATEGORIES) {
      expect(scheduleCategoryToBudget(c)).not.toBeNull();
    }
  });

  it("every PARTIAL_MAPPED_SCHEDULE_CATEGORIES entry also resolves (partial != null)", () => {
    for (const c of PARTIAL_MAPPED_SCHEDULE_CATEGORIES) {
      expect(scheduleCategoryToBudget(c)).not.toBeNull();
    }
  });
});

describe("getRegionalAvgWithMeal", () => {
  it("returns null for unknown region", () => {
    expect(getRegionalAvgWithMeal("atlantis", 200)).toBeNull();
  });

  it("computes meal = per_guest_meal × guestCount and folds into total", () => {
    const avg = getRegionalAvgWithMeal("seoul", 200);
    expect(avg).not.toBeNull();
    expect(avg!.meal).toBe(Math.round(8.5 * 200)); // 1700
    expect(avg!.total).toBe(3200 + 1700); // base total + meal
  });

  it("scales meal linearly with guest count", () => {
    const a = getRegionalAvgWithMeal("seoul", 100);
    const b = getRegionalAvgWithMeal("seoul", 300);
    expect(b!.meal).toBe(a!.meal * 3);
  });

  it("preserves the base venue value (not folded with meal)", () => {
    const avg = getRegionalAvgWithMeal("seoul", 200);
    expect(avg!.venue).toBe(500); // dry venue, no meal absorbed
  });
});
