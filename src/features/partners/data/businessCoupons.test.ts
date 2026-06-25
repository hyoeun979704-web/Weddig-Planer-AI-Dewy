import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ order: vi.fn(), insert: vi.fn(), del: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = (...a: unknown[]) => h.order(...a);
  builder.insert = (...a: unknown[]) => h.insert(...a);
  builder.delete = () => ({ eq: (...a: unknown[]) => h.del(...a) });
  return { supabase: { from: () => builder } };
});

import { fetchBusinessCoupons, addBusinessCoupon, deleteBusinessCoupon } from "./businessCoupons";

beforeEach(() => {
  h.order.mockReset();
  h.insert.mockReset();
  h.del.mockReset();
});

describe("fetchBusinessCoupons", () => {
  it("쿠폰 배열 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "c1" }], error: null });
    expect(await fetchBusinessCoupons("pl1")).toEqual([{ id: "c1" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: null });
    expect(await fetchBusinessCoupons("pl1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchBusinessCoupons("pl1")).rejects.toThrow("boom");
  });
});

describe("addBusinessCoupon", () => {
  const payload = {
    place_id: "pl1", owner_user_id: "u1", title: "쿠폰", discount_text: "10%",
    min_order_won: null, expires_at: null,
  };
  it("성공 시 resolve", async () => {
    h.insert.mockResolvedValue({ error: null });
    await expect(addBusinessCoupon(payload)).resolves.toBeUndefined();
    expect(h.insert).toHaveBeenCalledWith(payload);
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("ins") });
    await expect(addBusinessCoupon(payload)).rejects.toThrow("ins");
  });
});

describe("deleteBusinessCoupon", () => {
  it("성공 시 resolve", async () => {
    h.del.mockResolvedValue({ error: null });
    await expect(deleteBusinessCoupon("c1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.del.mockResolvedValue({ error: new Error("del") });
    await expect(deleteBusinessCoupon("c1")).rejects.toThrow("del");
  });
});
