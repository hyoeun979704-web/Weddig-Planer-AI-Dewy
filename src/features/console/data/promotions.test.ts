import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a), rpc: (...a: unknown[]) => h.rpcImpl(...a) },
}));

import { fetchPromotions, upsertPromotion, promotionKeys } from "./promotions";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.rpcImpl.mockReset();
});

describe("promotionKeys", () => {
  it("list 키", () => {
    expect(promotionKeys.list()).toEqual(["admin", "promotions", "list"]);
  });
});

describe("fetchPromotions", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "p1" }], error: null }));
    expect(await fetchPromotions()).toEqual([{ id: "p1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchPromotions()).rejects.toThrow("fail");
  });
});

describe("upsertPromotion", () => {
  it("ok=true 통과", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await upsertPromotion("slug", {})).toEqual({ ok: true });
  });
  it("forbidden 등 res.error 를 전달", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: false, error: "forbidden" }, error: null });
    expect(await upsertPromotion("slug", {})).toEqual({ ok: false, error: "forbidden" });
  });
  it("전송 에러 → ok:false + message", async () => {
    h.rpcImpl.mockResolvedValue({ data: null, error: { message: "net" } });
    expect(await upsertPromotion("slug", {})).toEqual({ ok: false, error: "net" });
  });
});
