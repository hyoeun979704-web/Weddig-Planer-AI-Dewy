import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchSamples, saveSample, setSampleActive, deleteSample, sampleAdminKeys } from "./sampleAdmin";

const builder = (result: unknown, spy?: { used: string }) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    eq: () => b,
    update: () => { if (spy) spy.used = "update"; return b; },
    insert: () => { if (spy) spy.used = "insert"; return b; },
    delete: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("sampleAdminKeys", () => {
  it("테이블별 list 키", () => {
    expect(sampleAdminKeys.list("makeup_samples")).toEqual(["admin", "makeup_samples", "list"]);
    expect(sampleAdminKeys.list("dress_samples")).toEqual(["admin", "dress_samples", "list"]);
  });
});

describe("fetchSamples", () => {
  it("지정 테이블에서 데이터를 반환한다", async () => {
    let table = "";
    h.fromImpl.mockImplementation((t: string) => { table = t; return builder({ data: [{ id: "s1" }], error: null }); });
    const rows = await fetchSamples<{ id: string }>("hair_samples");
    expect(table).toBe("hair_samples");
    expect(rows).toEqual([{ id: "s1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchSamples("makeup_samples")).rejects.toThrow("fail");
  });
});

describe("saveSample", () => {
  it("editingId 있으면 update, 없으면 insert (테이블 전달)", async () => {
    const spy = { used: "" };
    let table = "";
    h.fromImpl.mockImplementation((t: string) => { table = t; return builder({ error: null }, spy); });
    await saveSample("dress_samples", "id-1", { name: "x" });
    expect(table).toBe("dress_samples");
    expect(spy.used).toBe("update");
    await saveSample("dress_samples", null, { name: "x" });
    expect(spy.used).toBe("insert");
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("save fail") }));
    await expect(saveSample("hair_samples", null, {})).rejects.toThrow("save fail");
  });
});

describe("setSampleActive / deleteSample", () => {
  it("setSampleActive 에러 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("toggle fail") }));
    await expect(setSampleActive("makeup_samples", "id", true)).rejects.toThrow("toggle fail");
  });
  it("deleteSample 에러 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("del fail") }));
    await expect(deleteSample("makeup_samples", "id")).rejects.toThrow("del fail");
  });
  it("정상 시 resolve", async () => {
    h.fromImpl.mockReturnValue(builder({ error: null }));
    await expect(deleteSample("hair_samples", "id")).resolves.toBeUndefined();
  });
});
