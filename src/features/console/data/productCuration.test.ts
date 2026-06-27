import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), rpcImpl: vi.fn(), invokeImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    rpc: (...a: unknown[]) => h.rpcImpl(...a),
    functions: { invoke: (...a: unknown[]) => h.invokeImpl(...a) },
  },
}));

import {
  fetchProductPool,
  searchProducts,
  insertProduct,
  bulkUpsertProducts,
  productCurationKeys,
} from "./productCuration";

// 모든 체인 메서드가 자기 자신을 반환하고 await 시 result 로 resolve 하는 thenable 빌더.
const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    range: () => b,
    eq: () => b,
    contains: () => b,
    ilike: () => b,
    insert: () => b,
    upsert: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

const baseFilters = {
  page: 0,
  pageSize: 30,
  filterSource: "all",
  filterActive: "all" as const,
  filterCategory: "all",
  keyword: "",
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.rpcImpl.mockReset();
  h.invokeImpl.mockReset();
});

describe("productCurationKeys", () => {
  it("필터를 포함한 pool 키와 seeds 키를 만든다", () => {
    expect(productCurationKeys.seeds()).toEqual(["admin", "productCuration", "seeds"]);
    const k = productCurationKeys.pool(baseFilters);
    expect(k.slice(0, 3)).toEqual(["admin", "productCuration", "pool"]);
    expect(k[3]).toEqual(baseFilters);
  });
});

describe("fetchProductPool", () => {
  it("상품에 최근 클릭수를 enrich 하고 total 을 반환한다", async () => {
    h.fromImpl.mockReturnValue(
      builder({
        data: [
          { id: "p1", name: "A", categories: [] },
          { id: "p2", name: "B", categories: [] },
        ],
        count: 42,
        error: null,
      }),
    );
    h.rpcImpl.mockResolvedValue({
      data: [
        { product_id: "p1", click_count: 5 },
        { product_id: "p2", click_count: 0 },
      ],
      error: null,
    });

    const { products, total } = await fetchProductPool(baseFilters);
    expect(total).toBe(42);
    expect(products.find((p) => p.id === "p1")?.click_count).toBe(5);
    expect(products.find((p) => p.id === "p2")?.click_count).toBe(0);
  });

  it("클릭 데이터가 없는 상품은 0 으로 채운다", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "p9", name: "Z", categories: [] }], count: 1, error: null }));
    h.rpcImpl.mockResolvedValue({ data: [], error: null });
    const { products } = await fetchProductPool(baseFilters);
    expect(products[0].click_count).toBe(0);
  });

  it("쿼리 에러 시 throw 한다", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, count: null, error: new Error("query fail") }));
    h.rpcImpl.mockResolvedValue({ data: [], error: null });
    await expect(fetchProductPool(baseFilters)).rejects.toThrow("query fail");
  });
});

describe("searchProducts", () => {
  it("invoke 결과의 items 를 반환한다", async () => {
    h.invokeImpl.mockResolvedValue({ data: { items: [{ name: "x" }] }, error: null });
    const items = await searchProducts("naver", "드레스");
    expect(items).toEqual([{ name: "x" }]);
  });

  it("items 가 없으면 빈 배열을 반환한다", async () => {
    h.invokeImpl.mockResolvedValue({ data: {}, error: null });
    expect(await searchProducts("coupang", "q")).toEqual([]);
  });

  it("invoke 에러 시 throw 한다", async () => {
    h.invokeImpl.mockResolvedValue({ data: null, error: new Error("invoke fail") });
    await expect(searchProducts("naver", "q")).rejects.toThrow("invoke fail");
  });
});

describe("insertProduct / bulkUpsertProducts", () => {
  it("insert 에러 시 throw(코드 보존)한다", async () => {
    const err = Object.assign(new Error("dup"), { code: "23505" });
    h.fromImpl.mockReturnValue(builder({ error: err }));
    await expect(insertProduct({ name: "x" })).rejects.toMatchObject({ code: "23505" });
  });

  it("bulkUpsert 는 count 를 반환하고, 없으면 rows 길이로 폴백한다", async () => {
    h.fromImpl.mockReturnValue(builder({ error: null, count: 3 }));
    expect(await bulkUpsertProducts([{}, {}, {}, {}, {}])).toBe(3);
    h.fromImpl.mockReturnValue(builder({ error: null, count: null }));
    expect(await bulkUpsertProducts([{}, {}])).toBe(2);
  });
});
