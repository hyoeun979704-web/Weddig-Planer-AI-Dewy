import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), getUserImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    auth: { getUser: (...a: unknown[]) => h.getUserImpl(...a) },
  },
}));

import { fetchPrompts, updatePromptContent, setPromptActive, aiPromptKeys } from "./aiPrompts";

const builder = (result: unknown, spy?: { update?: Record<string, unknown> }) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    eq: () => b,
    update: (u: Record<string, unknown>) => { if (spy) spy.update = u; return b; },
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.getUserImpl.mockReset();
});

describe("aiPromptKeys", () => {
  it("list 키", () => {
    expect(aiPromptKeys.list()).toEqual(["admin", "aiPrompts", "list"]);
  });
});

describe("fetchPrompts", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ key: "k1" }], error: null }));
    expect(await fetchPrompts()).toEqual([{ key: "k1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchPrompts()).rejects.toThrow("fail");
  });
});

describe("updatePromptContent", () => {
  it("content 와 수정자(updated_by)를 함께 기록", async () => {
    h.getUserImpl.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const spy: { update?: Record<string, unknown> } = {};
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await updatePromptContent("k1", "새 내용");
    expect(spy.update).toEqual({ content: "새 내용", updated_by: "admin-1" });
  });
  it("에러 시 throw", async () => {
    h.getUserImpl.mockResolvedValue({ data: { user: null } });
    h.fromImpl.mockReturnValue(builder({ error: new Error("save fail") }));
    await expect(updatePromptContent("k1", "x")).rejects.toThrow("save fail");
  });
});

describe("setPromptActive", () => {
  it("is_active 업데이트", async () => {
    const spy: { update?: Record<string, unknown> } = {};
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await setPromptActive("k1", false);
    expect(spy.update).toEqual({ is_active: false });
  });
});
