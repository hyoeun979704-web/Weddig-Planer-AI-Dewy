import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a), rpc: (...a: unknown[]) => h.rpcImpl(...a) },
}));

import { fetchPendingContent, reviewEvent, setCouponModeration, contentReviewKeys } from "./contentReview";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    eq: () => b,
    update: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.rpcImpl.mockReset();
});

describe("contentReviewKeys", () => {
  it("filter 별 pending 키", () => {
    expect(contentReviewKeys.pending("pending")).toEqual(["admin", "contentReview", "pending"]);
    expect(contentReviewKeys.pending("all")).toEqual(["admin", "contentReview", "all"]);
  });
});

describe("fetchPendingContent", () => {
  it("이벤트·쿠폰을 병렬로 반환한다", async () => {
    h.fromImpl.mockImplementation((t: string) =>
      t === "business_events"
        ? builder({ data: [{ id: "e1" }], error: null })
        : builder({ data: [{ id: "c1" }], error: null }),
    );
    const r = await fetchPendingContent("pending");
    expect(r.events).toEqual([{ id: "e1" }]);
    expect(r.coupons).toEqual([{ id: "c1" }]);
  });
});

describe("reviewEvent", () => {
  it("RPC ok=true → {ok:true}", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await reviewEvent("id", true, null)).toEqual({ ok: true });
  });
  it("data.ok===false → {ok:false, error}", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: false, error: "forbidden" }, error: null });
    expect(await reviewEvent("id", false, "사유")).toEqual({ ok: false, error: "forbidden" });
  });
  it("전송 에러 → {ok:false, error: message}", async () => {
    h.rpcImpl.mockResolvedValue({ data: null, error: { message: "PGRST" } });
    expect(await reviewEvent("id", true, null)).toEqual({ ok: false, error: "PGRST" });
  });
});

describe("setCouponModeration", () => {
  it("정상 시 resolve", async () => {
    h.fromImpl.mockReturnValue(builder({ error: null }));
    await expect(setCouponModeration("id", "approved", null)).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("update fail") }));
    await expect(setCouponModeration("id", "rejected", "사유")).rejects.toThrow("update fail");
  });
});
