import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => h.rpcImpl(...a) },
}));

import {
  fetchPendingModeration,
  reviewProduct,
  reviewPartnership,
  setBusinessTier,
  businessReviewKeys,
} from "./businessReview";

beforeEach(() => h.rpcImpl.mockReset());

// rpc 이름 → {data,error} 매핑 목.
const rpcMap = (map: Record<string, { data?: unknown; error?: unknown }>) =>
  h.rpcImpl.mockImplementation((name: string) =>
    Promise.resolve(map[name] ?? { data: [], error: null }),
  );

describe("businessReviewKeys", () => {
  it("pending·tiers 키를 만든다", () => {
    expect(businessReviewKeys.pending()).toEqual(["admin", "businessReview", "pending"]);
    expect(businessReviewKeys.tiers()).toEqual(["admin", "businessReview", "tiers"]);
  });
});

describe("fetchPendingModeration", () => {
  it("6개 목록을 모으고 필드를 매핑한다", async () => {
    rpcMap({
      admin_list_pending_businesses: { data: [{ id: "b1", business_name: "A" }], error: null },
      admin_list_pending_listings: { data: [{ place_id: "p1", name: "L", city: "서울", category: "studio", extra: "x" }], error: null },
      admin_list_pending_events: { data: [{ id: "e1", title: "E", description: "d" }], error: null },
      admin_list_pending_products: { data: [{ id: "pr1", name: "P", price: 100 }], error: null },
      admin_list_partnership_applications: { data: [{ id: "a1" }], error: null },
      admin_list_business_tiers: { data: [{ id: "t1" }], error: null },
    });
    const m = await fetchPendingModeration();
    expect(m.partialError).toBe(false);
    expect(m.businesses).toHaveLength(1);
    // 리스팅은 4개 필드만 매핑(extra 제거)
    expect(m.listings[0]).toEqual({ place_id: "p1", name: "L", city: "서울", category: "studio" });
    expect(m.products[0]).toEqual({ id: "pr1", name: "P", price: 100 });
  });

  it("핵심 목록 실패는 빈 배열로 격리하고 partialError=true", async () => {
    rpcMap({
      admin_list_pending_businesses: { data: null, error: new Error("forbidden") },
      // 나머지는 기본 {data:[],error:null}
    });
    const m = await fetchPendingModeration();
    expect(m.businesses).toEqual([]);
    expect(m.partialError).toBe(true);
  });

  it("제휴/등급 목록만 실패해도 partialError 는 false(핵심 4개만 본다)", async () => {
    rpcMap({
      admin_list_partnership_applications: { data: null, error: new Error("x") },
      admin_list_business_tiers: { data: null, error: new Error("y") },
    });
    const m = await fetchPendingModeration();
    expect(m.partialError).toBe(false);
    expect(m.applications).toEqual([]);
    expect(m.tiers).toEqual([]);
  });
});

describe("review RPC 래퍼", () => {
  it("reviewProduct: ok=true 통과", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await reviewProduct("id", true)).toEqual({ ok: true });
  });

  it("reviewProduct: res.error 를 ReviewResult.error 로 전달(forbidden 진단)", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: false, error: "forbidden" }, error: null });
    expect(await reviewProduct("id", false)).toEqual({ ok: false, error: "forbidden" });
  });

  it("reviewProduct: 전송 에러 시 error 메시지 전달", async () => {
    h.rpcImpl.mockResolvedValue({ data: null, error: { message: "PGRST202" } });
    expect(await reviewProduct("id", true)).toEqual({ ok: false, error: "PGRST202" });
  });

  it("reviewPartnership/setBusinessTier: ok boolean", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await reviewPartnership("id", "approved")).toBe(true);
    h.rpcImpl.mockResolvedValue({ data: { ok: false }, error: null });
    expect(await setBusinessTier("pid", "bff")).toBe(false);
  });
});
