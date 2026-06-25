import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  order: vi.fn(),
  insert: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder; // select().eq() 는 체인 지속
  builder.order = (...a: unknown[]) => h.order(...a);
  builder.insert = (...a: unknown[]) => h.insert(...a);
  builder.delete = () => ({ eq: (...a: unknown[]) => h.del(...a) });
  return { supabase: { from: () => builder } };
});

import { fetchBusinessProducts, addBusinessProduct, deleteBusinessProduct } from "./businessProducts";

beforeEach(() => {
  h.order.mockReset();
  h.insert.mockReset();
  h.del.mockReset();
});

describe("fetchBusinessProducts", () => {
  it("행 배열을 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "p1", name: "A" }], error: null });
    expect(await fetchBusinessProducts("pl1")).toEqual([{ id: "p1", name: "A" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: null });
    expect(await fetchBusinessProducts("pl1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchBusinessProducts("pl1")).rejects.toThrow("boom");
  });
});

describe("addBusinessProduct", () => {
  const payload = {
    place_id: "pl1", owner_user_id: "u1", name: "상품", price: 1000,
    description: null, image_url: null, detail_images: [],
  };
  it("성공 시 resolve", async () => {
    h.insert.mockResolvedValue({ error: null });
    await expect(addBusinessProduct(payload)).resolves.toBeUndefined();
    expect(h.insert).toHaveBeenCalledWith(payload);
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("ins") });
    await expect(addBusinessProduct(payload)).rejects.toThrow("ins");
  });
});

describe("deleteBusinessProduct", () => {
  it("성공 시 resolve", async () => {
    h.del.mockResolvedValue({ error: null });
    await expect(deleteBusinessProduct("p1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.del.mockResolvedValue({ error: new Error("del") });
    await expect(deleteBusinessProduct("p1")).rejects.toThrow("del");
  });
});
