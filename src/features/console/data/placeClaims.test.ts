import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => h.rpcImpl(...a) },
}));

import { fetchPlaceClaims, reviewPlaceClaim, placeClaimKeys } from "./placeClaims";

beforeEach(() => h.rpcImpl.mockReset());

describe("placeClaimKeys", () => {
  it("list 키", () => {
    expect(placeClaimKeys.list()).toEqual(["admin", "placeClaims", "list"]);
  });
});

describe("fetchPlaceClaims", () => {
  it("데이터 반환", async () => {
    h.rpcImpl.mockResolvedValue({ data: [{ id: "c1" }], error: null });
    expect(await fetchPlaceClaims()).toEqual([{ id: "c1" }]);
  });
  it("에러 시 throw", async () => {
    h.rpcImpl.mockResolvedValue({ data: null, error: new Error("fail") });
    await expect(fetchPlaceClaims()).rejects.toThrow("fail");
  });
});

describe("reviewPlaceClaim", () => {
  it("ok=true 통과", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await reviewPlaceClaim("c1", true)).toEqual({ ok: true });
  });
  it("res.error 전달", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: false, error: "이미 처리됨" }, error: null });
    expect(await reviewPlaceClaim("c1", false)).toEqual({ ok: false, error: "이미 처리됨" });
  });
  it("전송 에러 → ok:false + message", async () => {
    h.rpcImpl.mockResolvedValue({ data: null, error: { message: "net" } });
    expect(await reviewPlaceClaim("c1", true)).toEqual({ ok: false, error: "net" });
  });
});
