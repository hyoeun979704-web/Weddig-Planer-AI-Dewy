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
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  builder.single = (...a: unknown[]) => h.single(...a);
  // order(): limit 으로 체이닝하거나(await 안 됨) 그대로 await(thenable) 둘 다 지원.
  builder.order = (...a: unknown[]) => {
    h.order(...a);
    return {
      limit: (...b: unknown[]) => h.limit(...b),
      then: (resolve: (v: unknown) => unknown) =>
        resolve(h.order.mock.results.at(-1)?.value),
    };
  };
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
  fetchPhotoFixDiscounted,
  fetchPhotoFixJobs,
  uploadPhotoFixSource,
  generatePhotoFix,
  PhotoFixGenerateError,
  fetchPhotoFixJob,
  photoFixResultUrl,
} from "./photoFix";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
  h.createSigned.mockResolvedValue({ data: { signedUrl: "https://s/u" }, error: null });
  h.upload.mockResolvedValue({ error: null });
});

describe("fetchPhotoFixDiscounted", () => {
  it("used_count 0 이면 true", async () => {
    h.maybeSingle.mockResolvedValue({ data: { used_count: 0 } });
    expect(await fetchPhotoFixDiscounted("u1")).toBe(true);
  });
  it("used_count > 0 이면 false", async () => {
    h.maybeSingle.mockResolvedValue({ data: { used_count: 2 } });
    expect(await fetchPhotoFixDiscounted("u1")).toBe(false);
  });
  it("행 없으면 true", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchPhotoFixDiscounted("u1")).toBe(true);
  });
});

describe("fetchPhotoFixJobs", () => {
  it("limit 지정 시 그 개수만 조회하고 행 반환", async () => {
    h.limit.mockResolvedValue({ data: [{ id: "1" }], error: null });
    expect(await fetchPhotoFixJobs("u1", 20)).toEqual([{ id: "1" }]);
    expect(h.limit).toHaveBeenCalledWith(20);
  });
  it("limit 없으면 order 결과 그대로 반환", async () => {
    h.order.mockReturnValue({ data: [{ id: "2" }], error: null });
    expect(await fetchPhotoFixJobs("u1")).toEqual([{ id: "2" }]);
    expect(h.limit).not.toHaveBeenCalled();
  });
  it("데이터 없으면 빈 배열", async () => {
    h.limit.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchPhotoFixJobs("u1", 20)).toEqual([]);
  });
});

describe("uploadPhotoFixSource", () => {
  it("업로드 후 본인 photofix 폴더 경로 반환", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const path = await uploadPhotoFixSource("u1", file);
    expect(path).toMatch(/^u1\/photofix\/.+\.png$/);
  });
  it("업로드 실패 시 업로드 실패 메시지로 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadPhotoFixSource("u1", new File(["x"], "a.png"))).rejects.toThrow(/업로드 실패/);
  });
});

describe("generatePhotoFix", () => {
  it("job_id 반환", async () => {
    h.invoke.mockResolvedValue({ data: { job_id: "j1" }, error: null });
    expect(await generatePhotoFix({})).toBe("j1");
  });
  it("edge 에러의 코드를 PhotoFixGenerateError 로 노출", async () => {
    h.invoke.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ error: "insufficient_hearts" }) } },
    });
    await expect(generatePhotoFix({})).rejects.toBeInstanceOf(PhotoFixGenerateError);
    h.invoke.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ error: "insufficient_hearts" }) } },
    });
    await expect(generatePhotoFix({})).rejects.toMatchObject({ code: "insufficient_hearts" });
  });
  it("응답 error 면 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "bad" }, error: null });
    await expect(generatePhotoFix({})).rejects.toThrow("bad");
  });
  it("job_id 없으면 throw", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(generatePhotoFix({})).rejects.toThrow("보정 요청 실패");
  });
});

describe("fetchPhotoFixJob", () => {
  it("행 반환", async () => {
    h.single.mockResolvedValue({ data: { id: "1", status: "completed" }, error: null });
    expect(await fetchPhotoFixJob("1")).toEqual({ id: "1", status: "completed" });
  });
  it("에러면 null", async () => {
    h.single.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchPhotoFixJob("1")).toBeNull();
  });
});

describe("photoFixResultUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await photoFixResultUrl("p")).toBe("https://s/u");
  });
});
