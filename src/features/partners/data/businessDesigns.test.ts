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

import { fetchBusinessDesigns, addBusinessDesign, deleteBusinessDesign } from "./businessDesigns";

beforeEach(() => {
  h.order.mockReset();
  h.insert.mockReset();
  h.del.mockReset();
});

describe("fetchBusinessDesigns", () => {
  it("디자인 배열 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "d1" }], error: null });
    expect(await fetchBusinessDesigns("pl1")).toEqual([{ id: "d1" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: null });
    expect(await fetchBusinessDesigns("pl1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchBusinessDesigns("pl1")).rejects.toThrow("boom");
  });
});

describe("addBusinessDesign", () => {
  const payload = {
    designer_user_id: "u1", place_id: "pl1", title: "디자인", description: null,
    price: 29000, preview_urls: ["u"], style_tags: ["미니멀"], sellable: ["design"],
  };
  it("status=pending 을 붙여 insert", async () => {
    h.insert.mockResolvedValue({ error: null });
    await addBusinessDesign(payload);
    expect(h.insert).toHaveBeenCalledWith({ ...payload, status: "pending" });
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("ins") });
    await expect(addBusinessDesign(payload)).rejects.toThrow("ins");
  });
});

describe("deleteBusinessDesign", () => {
  it("성공 시 resolve", async () => {
    h.del.mockResolvedValue({ error: null });
    await expect(deleteBusinessDesign("d1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.del.mockResolvedValue({ error: new Error("del") });
    await expect(deleteBusinessDesign("d1")).rejects.toThrow("del");
  });
});
