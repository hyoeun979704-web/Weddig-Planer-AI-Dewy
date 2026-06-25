import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ order: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = (...a: unknown[]) => h.order(...a);
  return { supabase: { from: () => builder } };
});

import { fetchDeliveryInquiries } from "./businessDeliveries";

beforeEach(() => h.order.mockReset());

describe("fetchDeliveryInquiries", () => {
  it("문의 배열 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "i1", user_id: "u1" }], error: null });
    expect(await fetchDeliveryInquiries("pl1")).toEqual([{ id: "i1", user_id: "u1" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: null });
    expect(await fetchDeliveryInquiries("pl1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchDeliveryInquiries("pl1")).rejects.toThrow("boom");
  });
});
