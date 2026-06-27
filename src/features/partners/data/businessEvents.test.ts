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

import { fetchBusinessEvents, addBusinessEvent, deleteBusinessEvent } from "./businessEvents";

beforeEach(() => {
  h.order.mockReset();
  h.insert.mockReset();
  h.del.mockReset();
});

describe("fetchBusinessEvents", () => {
  it("이벤트 배열 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "e1" }], error: null });
    expect(await fetchBusinessEvents("pl1")).toEqual([{ id: "e1" }]);
  });
  it("data 가 null 이면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: null });
    expect(await fetchBusinessEvents("pl1")).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchBusinessEvents("pl1")).rejects.toThrow("boom");
  });
});

describe("addBusinessEvent", () => {
  const payload = {
    place_id: "pl1", owner_user_id: "u1", title: "이벤트", description: null,
    starts_at: null, ends_at: null, banner_image_url: "u", detail_images: [],
  };
  it("성공 시 resolve", async () => {
    h.insert.mockResolvedValue({ error: null });
    await expect(addBusinessEvent(payload)).resolves.toBeUndefined();
    expect(h.insert).toHaveBeenCalledWith(payload);
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("ins") });
    await expect(addBusinessEvent(payload)).rejects.toThrow("ins");
  });
});

describe("deleteBusinessEvent", () => {
  it("성공 시 resolve", async () => {
    h.del.mockResolvedValue({ error: null });
    await expect(deleteBusinessEvent("e1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.del.mockResolvedValue({ error: new Error("del") });
    await expect(deleteBusinessEvent("e1")).rejects.toThrow("del");
  });
});
