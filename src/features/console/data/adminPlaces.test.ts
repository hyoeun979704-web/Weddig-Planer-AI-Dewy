import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchPlacesList, adminPlacesKeys } from "./adminPlaces";

const builder = (result: unknown, spy?: { is?: boolean; or?: string; eqs: [unknown, unknown][] }) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    range: () => b,
    is: () => { if (spy) spy.is = true; return b; },
    or: (s: string) => { if (spy) spy.or = s; return b; },
    eq: (c: unknown, v: unknown) => { spy?.eqs.push([c, v]); return b; },
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

const base = { category: "all", missingImageOnly: false, inactiveOnly: false, search: "", page: 0, pageSize: 50 };

beforeEach(() => h.fromImpl.mockReset());

describe("adminPlacesKeys", () => {
  it("필터 포함 list 키", () => {
    expect(adminPlacesKeys.list(base)[3]).toEqual(base);
  });
});

describe("fetchPlacesList", () => {
  it("rows·total 반환, 기본은 is_active=true 만", async () => {
    const spy = { eqs: [] as [unknown, unknown][] };
    h.fromImpl.mockReturnValue(builder({ data: [{ place_id: "p1" }], count: 9, error: null }, spy));
    const r = await fetchPlacesList(base);
    expect(r.rows).toEqual([{ place_id: "p1" }]);
    expect(r.total).toBe(9);
    expect(spy.eqs).toContainEqual(["is_active", true]);
  });

  it("inactiveOnly 면 is_active=false", async () => {
    const spy = { eqs: [] as [unknown, unknown][] };
    h.fromImpl.mockReturnValue(builder({ data: [], count: 0, error: null }, spy));
    await fetchPlacesList({ ...base, inactiveOnly: true });
    expect(spy.eqs).toContainEqual(["is_active", false]);
  });

  it("missingImageOnly 면 is(null), 검색어 있으면 or 필터", async () => {
    const spy = { eqs: [] as [unknown, unknown][] };
    h.fromImpl.mockReturnValue(builder({ data: [], count: 0, error: null }, spy));
    await fetchPlacesList({ ...base, missingImageOnly: true, search: "강남" });
    expect(spy.is).toBe(true);
    expect(spy.or).toContain("name.ilike.");
    expect(spy.or).toContain("city.ilike.");
  });

  it("category 지정 시 eq 적용", async () => {
    const spy = { eqs: [] as [unknown, unknown][] };
    h.fromImpl.mockReturnValue(builder({ data: [], count: 0, error: null }, spy));
    await fetchPlacesList({ ...base, category: "studio" });
    expect(spy.eqs).toContainEqual(["category", "studio"]);
  });

  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, count: null, error: new Error("fail") }));
    await expect(fetchPlacesList(base)).rejects.toThrow("fail");
  });
});
