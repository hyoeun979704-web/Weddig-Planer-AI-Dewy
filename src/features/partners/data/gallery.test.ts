import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchGalleryData, createAlbum, addMedia, deleteMedia, galleryKeys } from "./gallery";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    eq: () => b,
    order: () => b,
    insert: () => b,
    delete: () => b,
    single: () => Promise.resolve(result),
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("galleryKeys", () => {
  it("place 키", () => {
    expect(galleryKeys.place("p1")).toEqual(["partners", "gallery", "p1"]);
  });
});

describe("fetchGalleryData", () => {
  it("미디어·앨범·상품을 병렬로 반환", async () => {
    h.fromImpl.mockImplementation((t: string) => {
      if (t === "place_media") return builder({ data: [{ id: "m1" }], error: null });
      if (t === "place_media_albums") return builder({ data: [{ id: "a1" }], error: null });
      return builder({ data: [{ id: "pr1", name: "상품" }], error: null });
    });
    const r = await fetchGalleryData("p1");
    expect(r.media).toEqual([{ id: "m1" }]);
    expect(r.albums).toEqual([{ id: "a1" }]);
    expect(r.products).toEqual([{ id: "pr1", name: "상품" }]);
  });
  it("미디어 조회 에러 시 throw", async () => {
    h.fromImpl.mockImplementation((t: string) =>
      t === "place_media" ? builder({ data: null, error: new Error("media fail") }) : builder({ data: [], error: null }),
    );
    await expect(fetchGalleryData("p1")).rejects.toThrow("media fail");
  });
});

describe("createAlbum", () => {
  it("생성된 앨범 id 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: { id: "alb-1" }, error: null }));
    expect(await createAlbum({ title: "x" })).toBe("alb-1");
  });
  it("에러/빈 응답 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("alb fail") }));
    await expect(createAlbum({})).rejects.toThrow("alb fail");
  });
});

describe("addMedia / deleteMedia", () => {
  it("addMedia 에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("add fail") }));
    await expect(addMedia({})).rejects.toThrow("add fail");
  });
  it("deleteMedia 에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("del fail") }));
    await expect(deleteMedia("m1")).rejects.toThrow("del fail");
  });
});
