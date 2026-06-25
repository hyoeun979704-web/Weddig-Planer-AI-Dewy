import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchAssets, saveAsset, deleteAsset, invitationAssetKeys } from "./invitationAssets";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    eq: () => b,
    update: () => b,
    insert: () => b,
    delete: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("invitationAssetKeys", () => {
  it("list 키", () => {
    expect(invitationAssetKeys.list()).toEqual(["admin", "invitationAssets", "list"]);
  });
});

describe("fetchAssets", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "a1" }], error: null }));
    expect(await fetchAssets()).toEqual([{ id: "a1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchAssets()).rejects.toThrow("fail");
  });
});

describe("saveAsset", () => {
  it("editingId 있으면 update, 없으면 insert", async () => {
    let used = "";
    h.fromImpl.mockReturnValue(
      Object.assign(builder({ error: null }), {
        update: () => { used = "update"; return builder({ error: null }); },
        insert: () => { used = "insert"; return builder({ error: null }); },
      }),
    );
    await saveAsset("id-1", { name: "x" });
    expect(used).toBe("update");
    await saveAsset(null, { name: "x" });
    expect(used).toBe("insert");
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("save fail") }));
    await expect(saveAsset(null, {})).rejects.toThrow("save fail");
  });
});

describe("deleteAsset", () => {
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("del fail") }));
    await expect(deleteAsset("id")).rejects.toThrow("del fail");
  });
});
