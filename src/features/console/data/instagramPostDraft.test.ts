import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchDraft, updateDraft, deleteDraft, instagramPostDraftKeys } from "./instagramPostDraft";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    eq: () => b,
    update: () => b,
    delete: () => b,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("instagramPostDraftKeys", () => {
  it("detail 키", () => {
    expect(instagramPostDraftKeys.detail("d1")).toEqual(["admin", "instagramPostDraft", "d1"]);
  });
});

describe("fetchDraft", () => {
  it("행 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: { id: "d1" }, error: null }));
    expect(await fetchDraft("d1")).toEqual({ id: "d1" });
  });
  it("없으면 null", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: null }));
    expect(await fetchDraft("d1")).toBeNull();
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchDraft("d1")).rejects.toThrow("fail");
  });
});

describe("updateDraft", () => {
  it("갱신 행 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: { id: "d1", status: "approved" }, error: null }));
    expect(await updateDraft("d1", { status: "approved" })).toEqual({ id: "d1", status: "approved" });
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("save fail") }));
    await expect(updateDraft("d1", {})).rejects.toThrow("save fail");
  });
});

describe("deleteDraft", () => {
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("del fail") }));
    await expect(deleteDraft("d1")).rejects.toThrow("del fail");
  });
});
