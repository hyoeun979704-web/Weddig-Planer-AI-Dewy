import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  invoke: vi.fn(),
  createSigned: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = (...a: unknown[]) => h.order(...a);
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  builder.single = (...a: unknown[]) => h.single(...a);
  return {
    supabase: {
      from: () => builder,
      functions: { invoke: (...a: unknown[]) => h.invoke(...a) },
      storage: {
        from: () => ({
          createSignedUrl: (...a: unknown[]) => h.createSigned(...a),
          upload: (...a: unknown[]) => h.upload(...a),
        }),
      },
    },
  };
});

import {
  uploadDressSource,
  fetchDressMeta,
  generateDressFitting,
  generateDressRecommend,
  fetchDressGallery,
  fetchDressFitting,
  dressResultUrl,
} from "./dressFitting";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
  h.createSigned.mockResolvedValue({ data: { signedUrl: "https://s/u" }, error: null });
  h.upload.mockResolvedValue({ error: null });
});

describe("uploadDressSource", () => {
  it("업로드 후 path+signedUrl 반환", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const res = await uploadDressSource("u1", file);
    expect(res.path).toMatch(/^u1\/.+\.png$/);
    expect(res.signedUrl).toBe("https://s/u");
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadDressSource("u1", new File(["x"], "a.png"))).rejects.toThrow("up");
  });
});

describe("fetchDressMeta", () => {
  it("메타 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { name: "A" } });
    expect(await fetchDressMeta("s1")).toEqual({ name: "A" });
  });
  it("없으면 null", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchDressMeta("s1")).toBeNull();
  });
});

describe("generateDressFitting", () => {
  it("fitting_id 반환", async () => {
    h.invoke.mockResolvedValue({ data: { fitting_id: "f1" }, error: null });
    expect(await generateDressFitting({})).toBe("f1");
  });
  it("응답 error 면 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "insufficient_hearts" }, error: null });
    await expect(generateDressFitting({})).rejects.toThrow("insufficient_hearts");
  });
  it("fitting_id 없으면 throw", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(generateDressFitting({})).rejects.toThrow("생성 요청 실패");
  });
});

describe("generateDressRecommend", () => {
  it("fitting_id 반환", async () => {
    h.invoke.mockResolvedValue({ data: { fitting_id: "f2" }, error: null });
    expect(await generateDressRecommend({})).toBe("f2");
  });
  it("fitting_id 없으면 generation_failed", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(generateDressRecommend({})).rejects.toThrow("generation_failed");
  });
});

describe("fetchDressGallery", () => {
  it("행 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "1" }], error: null });
    expect(await fetchDressGallery("u1")).toEqual([{ id: "1" }]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchDressGallery("u1")).rejects.toThrow("e");
  });
});

describe("fetchDressFitting", () => {
  it("행 반환", async () => {
    h.single.mockResolvedValue({ data: { id: "1", status: "done" }, error: null });
    expect(await fetchDressFitting("1")).toEqual({ id: "1", status: "done" });
  });
  it("에러면 null", async () => {
    h.single.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchDressFitting("1")).toBeNull();
  });
});

describe("dressResultUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await dressResultUrl("p")).toBe("https://s/u");
  });
});
