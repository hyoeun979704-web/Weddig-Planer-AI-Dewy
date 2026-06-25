import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchInquiries, answerInquiry, inquiryKeys } from "./inquiries";

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

beforeEach(() => h.fromImpl.mockReset());

describe("inquiryKeys", () => {
  it("all 키", () => {
    expect(inquiryKeys.all).toEqual(["admin-inquiries"]);
  });
});

describe("fetchInquiries", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "i1" }], error: null }));
    expect(await fetchInquiries()).toEqual([{ id: "i1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchInquiries()).rejects.toThrow("fail");
  });
});

describe("answerInquiry", () => {
  it("답변·answered 상태·시각을 기록", async () => {
    const spy: { update?: Record<string, unknown> } = {};
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await answerInquiry("i1", "답변");
    expect(spy.update?.answer).toBe("답변");
    expect(spy.update?.status).toBe("answered");
    expect(typeof spy.update?.answered_at).toBe("string");
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("ans fail") }));
    await expect(answerInquiry("i1", "x")).rejects.toThrow("ans fail");
  });
});
