import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  limit: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.not = () => builder;
  builder.order = () => builder;
  builder.limit = (...a: unknown[]) => h.limit(...a);
  return { supabase: { from: () => builder } };
});

import { fetchGalleryPlaces } from "./gallery";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
});

describe("fetchGalleryPlaces", () => {
  it("이미지 있는 행만 반환", async () => {
    h.limit.mockResolvedValue({
      data: [
        { place_id: "p1", name: "A", category: "hall", main_image_url: "u1" },
        { place_id: "p2", name: "B", category: "hall", main_image_url: null },
      ],
      error: null,
    });
    const res = await fetchGalleryPlaces();
    expect(res).toEqual([{ place_id: "p1", name: "A", category: "hall", main_image_url: "u1" }]);
  });
  it("데이터 null 이면 빈 배열", async () => {
    h.limit.mockResolvedValue({ data: null, error: null });
    expect(await fetchGalleryPlaces()).toEqual([]);
  });
  it("에러 시 throw", async () => {
    h.limit.mockResolvedValue({ data: null, error: new Error("db fail") });
    await expect(fetchGalleryPlaces()).rejects.toThrow("db fail");
  });
});
