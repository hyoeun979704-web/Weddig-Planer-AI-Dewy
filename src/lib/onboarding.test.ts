import { describe, it, expect } from "vitest";
import { isOnboarded } from "./onboarding";

describe("isOnboarded", () => {
  it("returns false for null/undefined", () => {
    expect(isOnboarded(null)).toBe(false);
    expect(isOnboarded(undefined)).toBe(false);
    expect(isOnboarded({})).toBe(false);
  });

  it("returns true when both date and region are set", () => {
    expect(
      isOnboarded({ wedding_date: "2026-12-25", wedding_region: "서울" }),
    ).toBe(true);
  });

  it("returns true when both tbd flags are set", () => {
    expect(
      isOnboarded({ wedding_date_tbd: true, wedding_region_tbd: true }),
    ).toBe(true);
  });

  it("treats real value and tbd as equivalent for the same axis", () => {
    expect(
      isOnboarded({
        wedding_date: "2026-12-25",
        wedding_region_tbd: true,
      }),
    ).toBe(true);
  });

  it("returns false when only one axis is filled", () => {
    expect(isOnboarded({ wedding_date: "2026-12-25" })).toBe(false);
    expect(isOnboarded({ wedding_region: "서울" })).toBe(false);
    expect(isOnboarded({ wedding_date_tbd: true })).toBe(false);
  });

  it("returns true when planning_stage is set (regardless of date/region)", () => {
    expect(isOnboarded({ planning_stage: "early" })).toBe(true);
  });

  it("treats empty string as 'not set'", () => {
    expect(isOnboarded({ wedding_date: "", wedding_region: "" })).toBe(false);
    expect(isOnboarded({ planning_stage: "" })).toBe(false);
  });
});
