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
  // .order() 는 체이닝(.order().order()) 후 await 가능해야 한다 → 빌더를 반환하되
  // 빌더 자체를 thenable 로 만들어 마지막 await 가 h.order 결과로 resolve 되게 한다.
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
  uploadMakeupSource,
  fetchActiveMakeups,
  generateMakeupFitting,
  generateMakeupRecommend,
  fetchMakeupGallery,
  fetchMakeupFitting,
  makeupResultUrl,
  makeupSourceUrl,
} from "./makeupFitting";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
  h.createSigned.mockResolvedValue({ data: { signedUrl: "https://s/u" }, error: null });
  h.upload.mockResolvedValue({ error: null });
});

describe("uploadMakeupSource", () => {
  it("업로드 후 path+signedUrl 반환", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const res = await uploadMakeupSource("u1", file);
    expect(res.path).toMatch(/^u1\/.+\.png$/);
    expect(res.signedUrl).toBe("https://s/u");
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadMakeupSource("u1", new File(["x"], "a.png"))).rejects.toThrow("up");
  });
});

describe("fetchActiveMakeups", () => {
  it("행 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "m1" }], error: null });
    expect(await fetchActiveMakeups()).toEqual([{ id: "m1" }]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchActiveMakeups()).rejects.toThrow("e");
  });
});

describe("generateMakeupFitting", () => {
  it("fitting_id 반환", async () => {
    h.invoke.mockResolvedValue({ data: { fitting_id: "f1" }, error: null });
    expect(await generateMakeupFitting({})).toBe("f1");
  });
  it("응답 error 면 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "insufficient_hearts" }, error: null });
    await expect(generateMakeupFitting({})).rejects.toThrow("insufficient_hearts");
  });
  it("invoke error 면 throw", async () => {
    h.invoke.mockResolvedValue({ data: null, error: new Error("net") });
    await expect(generateMakeupFitting({})).rejects.toThrow("net");
  });
  it("fitting_id 없으면 throw", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(generateMakeupFitting({})).rejects.toThrow("생성 요청 실패");
  });
});

describe("generateMakeupRecommend", () => {
  it("fitting_id 반환", async () => {
    h.invoke.mockResolvedValue({ data: { fitting_id: "f2" }, error: null });
    expect(await generateMakeupRecommend({})).toBe("f2");
  });
  it("응답 error 면 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "insufficient_hearts" }, error: null });
    await expect(generateMakeupRecommend({})).rejects.toThrow("insufficient_hearts");
  });
  it("fitting_id 없으면 generation_failed", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(generateMakeupRecommend({})).rejects.toThrow("generation_failed");
  });
});

describe("fetchMakeupGallery", () => {
  it("행 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "1" }], error: null });
    expect(await fetchMakeupGallery("u1")).toEqual([{ id: "1" }]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchMakeupGallery("u1")).rejects.toThrow("e");
  });
});

describe("fetchMakeupFitting", () => {
  it("행 반환", async () => {
    h.single.mockResolvedValue({ data: { id: "1", status: "done" }, error: null });
    expect(await fetchMakeupFitting("1")).toEqual({ id: "1", status: "done" });
  });
  it("에러면 null", async () => {
    h.single.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchMakeupFitting("1")).toBeNull();
  });
});

describe("makeupResultUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await makeupResultUrl("p")).toBe("https://s/u");
  });
});

describe("makeupSourceUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await makeupSourceUrl("p")).toBe("https://s/u");
  });
});
