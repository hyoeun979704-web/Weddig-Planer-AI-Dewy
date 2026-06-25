import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ limit: vi.fn(), rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.ilike = () => builder;
  builder.is = () => builder;
  builder.limit = (...a: unknown[]) => h.limit(...a);
  return { supabase: { from: () => builder, rpc: (...a: unknown[]) => h.rpc(...a) } };
});
vi.mock("@/lib/postgrestEscape", () => ({ escapeLikePattern: (s: string) => s }));

import { searchClaimablePlaces, requestPlaceClaim } from "./businessClaim";

beforeEach(() => {
  h.limit.mockReset();
  h.rpc.mockReset();
});

describe("searchClaimablePlaces", () => {
  it("주인 없는 업체 배열 반환", async () => {
    h.limit.mockResolvedValue({ data: [{ place_id: "p1", name: "A" }], error: null });
    expect(await searchClaimablePlaces("AB")).toEqual([{ place_id: "p1", name: "A" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.limit.mockResolvedValue({ data: null, error: null });
    expect(await searchClaimablePlaces("AB")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.limit.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(searchClaimablePlaces("AB")).rejects.toThrow("boom");
  });
});

describe("requestPlaceClaim", () => {
  it("RPC 결과({ ok }) 를 그대로 반환", async () => {
    h.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    expect(await requestPlaceClaim("p1")).toEqual({ ok: true });
  });
  it("reason 포함 결과 전달", async () => {
    h.rpc.mockResolvedValue({ data: { ok: false, error: "already_owned" }, error: null });
    expect(await requestPlaceClaim("p1")).toEqual({ ok: false, error: "already_owned" });
  });
  it("전송 에러는 { ok:false, error } 로 수렴", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "net" } });
    expect(await requestPlaceClaim("p1")).toEqual({ ok: false, error: "net" });
  });
});
