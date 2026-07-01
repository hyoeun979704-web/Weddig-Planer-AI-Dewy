import { describe, it, expect } from "vitest";
import { quotePersonaContext } from "./quotePersonaContext";

describe("quotePersonaContext", () => {
  it("특성 페르소나는 상황 문구 반환", () => {
    expect(quotePersonaContext("remarriage")).toContain("재혼");
    expect(quotePersonaContext("pregnancy")).toContain("임신");
    expect(quotePersonaContext("budget_analytic")).toContain("견적");
    expect(quotePersonaContext("luxury_hotel")).toContain("호텔");
  });
  it("표준·특성없음·null 은 null(노이즈 방지)", () => {
    expect(quotePersonaContext("standard_bride")).toBeNull();
    expect(quotePersonaContext("standard_groom")).toBeNull();
    expect(quotePersonaContext("first_timer")).toBeNull();
    expect(quotePersonaContext(null)).toBeNull();
    expect(quotePersonaContext(undefined)).toBeNull();
  });
});
