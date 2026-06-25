import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  invoke: vi.fn(),
  createSigned: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  // order 는 체이닝 가능(then 으로 await 시 h.order 결과)이면서 .limit 도 받는다.
  builder.order = () => ({
    then: (res: (v: unknown) => unknown) => Promise.resolve(h.order()).then(res),
    limit: (...a: unknown[]) => h.limit(...a),
  });
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
  fetchHairSamples,
  fetchHairUsageCount,
  fetchHairJobs,
  fetchHairGallery,
  fetchHairJob,
  uploadHairSource,
  invokeHairPreview,
  hairResultUrl,
} from "./hairPreview";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
  h.createSigned.mockResolvedValue({ data: { signedUrl: "https://s/u" }, error: null });
  h.upload.mockResolvedValue({ error: null });
});

describe("fetchHairSamples", () => {
  it("활성 샘플 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "1", name: "A" }] });
    expect(await fetchHairSamples()).toEqual([{ id: "1", name: "A" }]);
  });
  it("data 없으면 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null });
    expect(await fetchHairSamples()).toEqual([]);
  });
});

describe("fetchHairUsageCount", () => {
  it("used_count 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { used_count: 3 } });
    expect(await fetchHairUsageCount("u1")).toBe(3);
  });
  it("행 없으면 0", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchHairUsageCount("u1")).toBe(0);
  });
});

describe("fetchHairJobs", () => {
  it("기록 반환", async () => {
    h.limit.mockResolvedValue({ data: [{ id: "1", status: "completed" }] });
    expect(await fetchHairJobs("u1")).toEqual([{ id: "1", status: "completed" }]);
  });
  it("data 없으면 빈 배열", async () => {
    h.limit.mockResolvedValue({ data: null });
    expect(await fetchHairJobs("u1")).toEqual([]);
  });
});

describe("fetchHairGallery", () => {
  it("완료 행 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "1" }], error: null });
    expect(await fetchHairGallery("u1")).toEqual([{ id: "1" }]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchHairGallery("u1")).rejects.toThrow("e");
  });
});

describe("fetchHairJob", () => {
  it("행 반환", async () => {
    h.single.mockResolvedValue({ data: { id: "1", status: "processing" }, error: null });
    expect(await fetchHairJob("1")).toEqual({ id: "1", status: "processing" });
  });
  it("에러면 null", async () => {
    h.single.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchHairJob("1")).toBeNull();
  });
});

describe("uploadHairSource", () => {
  it("업로드 성공", async () => {
    await expect(
      uploadHairSource("u1/hair/x.png", new File(["x"], "a.png", { type: "image/png" })),
    ).resolves.toBeUndefined();
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(
      uploadHairSource("u1/hair/x.png", new File(["x"], "a.png")),
    ).rejects.toThrow("up");
  });
});

describe("invokeHairPreview", () => {
  it("data/error 그대로 반환(성공)", async () => {
    h.invoke.mockResolvedValue({ data: { job_id: "j1" }, error: null });
    expect(await invokeHairPreview({})).toEqual({ data: { job_id: "j1" }, error: null });
  });
  it("error 그대로 반환(실패)", async () => {
    const err = new Error("boom");
    h.invoke.mockResolvedValue({ data: null, error: err });
    expect(await invokeHairPreview({})).toEqual({ data: null, error: err });
  });
});

describe("hairResultUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await hairResultUrl("p")).toBe("https://s/u");
  });
  it("실패 시 null", async () => {
    h.createSigned.mockResolvedValue({ data: null, error: new Error("x") });
    expect(await hairResultUrl("p")).toBeNull();
  });
});
