import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), getUserImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    auth: { getUser: (...a: unknown[]) => h.getUserImpl(...a) },
  },
}));

import { fetchAgentOutputs, reviewAgentOutput, agentOutputKeys } from "./agentOutputs";

const builder = (result: unknown, spy?: { eq?: [unknown, unknown]; update?: Record<string, unknown> }) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    limit: () => b,
    eq: (c: unknown, v: unknown) => { if (spy) spy.eq = [c, v]; return b; },
    update: (u: Record<string, unknown>) => { if (spy) spy.update = u; return b; },
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.getUserImpl.mockReset();
});

describe("agentOutputKeys", () => {
  it("status 별 list 키", () => {
    expect(agentOutputKeys.list("pending")).toEqual(["admin", "agentOutputs", "list", "pending"]);
  });
});

describe("fetchAgentOutputs", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "a1" }], error: null }));
    expect(await fetchAgentOutputs("all")).toEqual([{ id: "a1" }]);
  });
  it("status 필터 적용", async () => {
    const spy: { eq?: [unknown, unknown] } = {};
    h.fromImpl.mockReturnValue(builder({ data: [], error: null }, spy));
    await fetchAgentOutputs("pending");
    expect(spy.eq).toEqual(["status", "pending"]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchAgentOutputs("all")).rejects.toThrow("fail");
  });
});

describe("reviewAgentOutput", () => {
  it("status·처리자·처리시각을 기록", async () => {
    h.getUserImpl.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const spy: { update?: Record<string, unknown> } = {};
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await reviewAgentOutput("a1", "approved");
    expect(spy.update?.status).toBe("approved");
    expect(spy.update?.reviewed_by).toBe("admin-1");
    expect(typeof spy.update?.reviewed_at).toBe("string");
  });
  it("에러 시 throw", async () => {
    h.getUserImpl.mockResolvedValue({ data: { user: null } });
    h.fromImpl.mockReturnValue(builder({ error: new Error("rev fail") }));
    await expect(reviewAgentOutput("a1", "rejected")).rejects.toThrow("rev fail");
  });
});
