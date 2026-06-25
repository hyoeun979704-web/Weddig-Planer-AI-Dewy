import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchFeaturedProducts, updateFeaturedProduct, featuredProductKeys } from "./featuredProducts";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    eq: () => b,
    order: () => b,
    range: () => b,
    contains: () => b,
    ilike: () => b,
    update: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

const baseFilters = { page: 0, pageSize: 20, filterCategory: "all", filterStatus: "all" as const, keyword: "" };

beforeEach(() => h.fromImpl.mockReset());

describe("featuredProductKeys", () => {
  it("필터 포함 list 키", () => {
    const k = featuredProductKeys.list(baseFilters);
    expect(k.slice(0, 3)).toEqual(["admin", "featuredProducts", "list"]);
    expect(k[3]).toEqual(baseFilters);
  });
});

describe("fetchFeaturedProducts", () => {
  it("rows 와 total 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "p1" }], count: 5, error: null }));
    const r = await fetchFeaturedProducts(baseFilters);
    expect(r.rows).toEqual([{ id: "p1" }]);
    expect(r.total).toBe(5);
  });
  it("count null → 0", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [], count: null, error: null }));
    expect((await fetchFeaturedProducts(baseFilters)).total).toBe(0);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, count: null, error: new Error("fail") }));
    await expect(fetchFeaturedProducts(baseFilters)).rejects.toThrow("fail");
  });
});

describe("updateFeaturedProduct", () => {
  it("정상 시 resolve", async () => {
    h.fromImpl.mockReturnValue(builder({ error: null }));
    await expect(updateFeaturedProduct("p1", { is_featured: true })).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("update fail") }));
    await expect(updateFeaturedProduct("p1", { featured_personas: [] })).rejects.toThrow("update fail");
  });
});
