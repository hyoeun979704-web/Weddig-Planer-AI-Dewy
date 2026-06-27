import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => h.rpcImpl(...a) },
}));

import { fetchListingRow, saveListing, requestPlaceClaim } from "./vendorEdit";

beforeEach(() => h.rpcImpl.mockReset());

describe("fetchListingRow", () => {
  it("branchParam 없으면 get_my_listing 의 첫 행", async () => {
    h.rpcImpl.mockResolvedValue({ data: [{ place_id: "p1" }], error: null });
    expect(await fetchListingRow(null)).toEqual({ place_id: "p1" });
  });
  it("branchParam 있으면 get_my_listings 에서 해당 지점", async () => {
    h.rpcImpl.mockResolvedValue({ data: [{ place_id: "p1" }, { place_id: "p2" }], error: null });
    expect(await fetchListingRow("p2")).toEqual({ place_id: "p2" });
  });
  it("에러 시 throw", async () => {
    h.rpcImpl.mockResolvedValue({ data: null, error: new Error("fail") });
    await expect(fetchListingRow(null)).rejects.toThrow("fail");
  });
});

describe("saveListing", () => {
  it("new=create_my_branch, branch=update_my_branch, single=upsert_my_listing 라우팅", async () => {
    const names: string[] = [];
    h.rpcImpl.mockImplementation((name: string) => {
      names.push(name);
      return Promise.resolve({ data: { ok: true }, error: null });
    });
    await saveListing("new", null, {}, {});
    await saveListing("branch", "p1", {}, {});
    await saveListing("single", null, {}, {});
    expect(names).toEqual(["create_my_branch", "update_my_branch", "upsert_my_listing"]);
  });
  it("전송 에러는 {ok:false,error} 로 수렴", async () => {
    h.rpcImpl.mockResolvedValue({ data: null, error: { message: "net" } });
    expect(await saveListing("single", null, {}, {})).toEqual({ ok: false, error: "net" });
  });
  it("RPC 결과(reason 포함)를 그대로 전달", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: false, reason: "claimable", place_id: "p9", name: "A" }, error: null });
    expect(await saveListing("single", null, {}, {})).toEqual({ ok: false, reason: "claimable", place_id: "p9", name: "A" });
  });
});

describe("requestPlaceClaim", () => {
  it("에러 없으면 true", async () => {
    h.rpcImpl.mockResolvedValue({ error: null });
    expect(await requestPlaceClaim("p1")).toBe(true);
  });
  it("에러면 false", async () => {
    h.rpcImpl.mockResolvedValue({ error: new Error("x") });
    expect(await requestPlaceClaim("p1")).toBe(false);
  });
});
