import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  limit: vi.fn(),
  updateEq: vi.fn(),
  lastUpdate: { payload: null as unknown },
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.limit = (...a: unknown[]) => h.limit(...a);
  builder.update = (payload: unknown) => {
    h.lastUpdate.payload = payload;
    return { eq: (...a: unknown[]) => h.updateEq(...a) };
  };
  return { supabase: { from: () => builder } };
});

import { fetchBusinessReviews, saveReviewReply } from "./businessReviews";

beforeEach(() => {
  h.limit.mockReset();
  h.updateEq.mockReset();
  h.lastUpdate.payload = null;
});

describe("fetchBusinessReviews", () => {
  it("후기 배열 반환", async () => {
    h.limit.mockResolvedValue({ data: [{ review_id: "r1" }], error: null });
    expect(await fetchBusinessReviews("pl1")).toEqual([{ review_id: "r1" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.limit.mockResolvedValue({ data: null, error: null });
    expect(await fetchBusinessReviews("pl1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.limit.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchBusinessReviews("pl1")).rejects.toThrow("boom");
  });
});

describe("saveReviewReply", () => {
  it("owner_response/owner_response_at 갱신", async () => {
    h.updateEq.mockResolvedValue({ error: null });
    await saveReviewReply("r1", "감사합니다");
    const p = h.lastUpdate.payload as Record<string, unknown>;
    expect(p.owner_response).toBe("감사합니다");
    expect(typeof p.owner_response_at).toBe("string");
  });
  it("1000자 초과 답글은 잘라서 저장", async () => {
    h.updateEq.mockResolvedValue({ error: null });
    await saveReviewReply("r1", "x".repeat(1500));
    expect(((h.lastUpdate.payload as Record<string, unknown>).owner_response as string).length).toBe(1000);
  });
  it("에러 시 throw", async () => {
    h.updateEq.mockResolvedValue({ error: new Error("upd") });
    await expect(saveReviewReply("r1", "a")).rejects.toThrow("upd");
  });
});
