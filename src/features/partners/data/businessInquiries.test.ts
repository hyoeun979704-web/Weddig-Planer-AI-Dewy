import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  order: vi.fn(),
  updateEq: vi.fn(),
  lastUpdate: { payload: null as unknown },
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder; // select().eq() 체인 지속
  builder.order = (...a: unknown[]) => h.order(...a);
  builder.update = (payload: unknown) => {
    h.lastUpdate.payload = payload;
    return { eq: (...a: unknown[]) => h.updateEq(...a) };
  };
  return { supabase: { from: () => builder } };
});

import { fetchBusinessInquiries, answerInquiry, markInquiryBooked } from "./businessInquiries";

beforeEach(() => {
  h.order.mockReset();
  h.updateEq.mockReset();
  h.lastUpdate.payload = null;
});

describe("fetchBusinessInquiries", () => {
  it("문의 배열 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "q1" }], error: null });
    expect(await fetchBusinessInquiries("pl1")).toEqual([{ id: "q1" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: null });
    expect(await fetchBusinessInquiries("pl1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchBusinessInquiries("pl1")).rejects.toThrow("boom");
  });
});

describe("answerInquiry", () => {
  it("answer/status/answered_at 갱신, status=answered", async () => {
    h.updateEq.mockResolvedValue({ error: null });
    await answerInquiry("q1", "답변 내용");
    const p = h.lastUpdate.payload as Record<string, unknown>;
    expect(p.answer).toBe("답변 내용");
    expect(p.status).toBe("answered");
    expect(typeof p.answered_at).toBe("string");
  });
  it("2000자 초과 답변은 잘라서 저장", async () => {
    h.updateEq.mockResolvedValue({ error: null });
    await answerInquiry("q1", "x".repeat(3000));
    const p = h.lastUpdate.payload as Record<string, unknown>;
    expect((p.answer as string).length).toBe(2000);
  });
  it("에러 시 throw", async () => {
    h.updateEq.mockResolvedValue({ error: new Error("upd") });
    await expect(answerInquiry("q1", "a")).rejects.toThrow("upd");
  });
});

describe("markInquiryBooked", () => {
  it("status=booked 갱신", async () => {
    h.updateEq.mockResolvedValue({ error: null });
    await markInquiryBooked("q1");
    expect((h.lastUpdate.payload as Record<string, unknown>).status).toBe("booked");
  });
  it("에러 시 throw", async () => {
    h.updateEq.mockResolvedValue({ error: new Error("b") });
    await expect(markInquiryBooked("q1")).rejects.toThrow("b");
  });
});
