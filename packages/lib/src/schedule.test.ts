import { describe, it, expect } from "vitest";
import { getTaskUrgency } from "./schedule";

const TODAY = new Date(2026, 4, 16); // 2026-05-16

describe("getTaskUrgency", () => {
  it("flags dates earlier than today as past_due", () => {
    expect(getTaskUrgency("2026-05-15", TODAY)).toBe("past_due");
    expect(getTaskUrgency("2026-01-01", TODAY)).toBe("past_due");
  });

  it("treats today as urgent (≤7 days)", () => {
    expect(getTaskUrgency("2026-05-16", TODAY)).toBe("urgent");
  });

  it("classifies within next 7 days as urgent", () => {
    expect(getTaskUrgency("2026-05-23", TODAY)).toBe("urgent");
  });

  it("classifies 8–30 days out as this_month", () => {
    expect(getTaskUrgency("2026-05-24", TODAY)).toBe("this_month");
    expect(getTaskUrgency("2026-06-15", TODAY)).toBe("this_month");
  });

  it("classifies 31+ days out as later", () => {
    expect(getTaskUrgency("2026-06-16", TODAY)).toBe("later");
    expect(getTaskUrgency("2027-01-01", TODAY)).toBe("later");
  });
});
