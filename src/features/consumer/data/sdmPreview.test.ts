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
  // .order() 체이닝(2회) 후 await → 마지막에 h.order()가 결과를 resolve 하도록 builder 를 thenable 로.
  builder.order = () => builder;
  builder.then = (resolve: (v: unknown) => unknown) => resolve(h.order());
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
  uploadSdmSource,
  fetchActiveDresses,
  generateSdmPreview,
  fetchSdmPreview,
  sdmResultUrl,
} from "./sdmPreview";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
  h.createSigned.mockResolvedValue({ data: { signedUrl: "https://s/u" }, error: null });
  h.upload.mockResolvedValue({ error: null });
});

describe("uploadSdmSource", () => {
  it("업로드 후 path+signedUrl 반환", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const res = await uploadSdmSource("u1", file);
    expect(res.path).toMatch(/^u1\/.+\.png$/);
    expect(res.signedUrl).toBe("https://s/u");
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadSdmSource("u1", new File(["x"], "a.png"))).rejects.toThrow("up");
  });
});

describe("fetchActiveDresses", () => {
  it("행 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "1" }], error: null });
    expect(await fetchActiveDresses()).toEqual([{ id: "1" }]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchActiveDresses()).rejects.toThrow("e");
  });
});

describe("generateSdmPreview", () => {
  it("preview_id 반환", async () => {
    h.invoke.mockResolvedValue({ data: { preview_id: "p1" }, error: null });
    expect(await generateSdmPreview({})).toBe("p1");
  });
  it("응답 error 면 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "insufficient_hearts" }, error: null });
    await expect(generateSdmPreview({})).rejects.toThrow("insufficient_hearts");
  });
  it("preview_id 없으면 throw", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(generateSdmPreview({})).rejects.toThrow("생성 요청 실패");
  });
});

describe("fetchSdmPreview", () => {
  it("행 반환", async () => {
    h.single.mockResolvedValue({ data: { id: "1", status: "done" }, error: null });
    expect(await fetchSdmPreview("1")).toEqual({ id: "1", status: "done" });
  });
  it("에러면 null", async () => {
    h.single.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchSdmPreview("1")).toBeNull();
  });
});

describe("sdmResultUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await sdmResultUrl("p")).toBe("https://s/u");
  });
});
