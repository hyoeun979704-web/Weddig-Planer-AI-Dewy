import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchPlace, fetchPlaceContentSummary, updatePlace, placeEditKeys } from "./placeEdit";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    eq: () => b,
    order: () => b,
    update: () => b,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("placeEditKeys", () => {
  it("detail·summary 키", () => {
    expect(placeEditKeys.detail("p1")).toEqual(["admin", "placeEdit", "p1"]);
    expect(placeEditKeys.summary("p1")).toEqual(["admin", "placeEdit", "p1", "summary"]);
  });
});

describe("fetchPlace", () => {
  it("행 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: { place_id: "p1", name: "A" }, error: null }));
    expect(await fetchPlace("p1")).toEqual({ place_id: "p1", name: "A" });
  });
  it("없으면 null", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: null }));
    expect(await fetchPlace("p1")).toBeNull();
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchPlace("p1")).rejects.toThrow("fail");
  });
});

describe("fetchPlaceContentSummary", () => {
  it("상품 목록 + 이벤트/사진 수를 합친다", async () => {
    h.fromImpl.mockImplementation((t: string) => {
      if (t === "business_products") return builder({ data: [{ name: "x", price: 1000 }], error: null });
      if (t === "business_events") return builder({ count: 3, error: null });
      if (t === "place_media") return builder({ count: 7, error: null });
      return builder({ data: [], error: null });
    });
    const s = await fetchPlaceContentSummary("p1");
    expect(s.products).toEqual([{ name: "x", price: 1000 }]);
    expect(s.events).toBe(3);
    expect(s.media).toBe(7);
  });
  it("count null → 0", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [], count: null, error: null }));
    const s = await fetchPlaceContentSummary("p1");
    expect(s.events).toBe(0);
    expect(s.media).toBe(0);
  });
});

describe("updatePlace", () => {
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("save fail") }));
    await expect(updatePlace("p1", { name: "x" })).rejects.toThrow("save fail");
  });
});
