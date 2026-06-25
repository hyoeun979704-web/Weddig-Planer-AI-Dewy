import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  reportsResult: { data: null as unknown, error: null as unknown },
  maybeSingle: vi.fn(),
  single: vi.fn(),
  invoke: vi.fn(),
  createSigned: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  // 빌더는 thenable — fetchConsultingReports 의 limit 없는 await(빌더 직접)와
  // limit 있는 .limit() 양쪽 모두 h.reportsResult 로 수렴시킨다.
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = () => builder;
  builder.limit = () => h.reportsResult;
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  builder.single = (...a: unknown[]) => h.single(...a);
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(h.reportsResult).then(resolve, reject);
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
  uploadConsultingSource,
  requestConsulting,
  fetchConsultingDiscounted,
  fetchConsultingReports,
  fetchConsultingReport,
  consultingResultUrl,
} from "./weddingConsulting";

beforeEach(() => {
  h.maybeSingle.mockReset();
  h.single.mockReset();
  h.invoke.mockReset();
  h.createSigned.mockReset();
  h.upload.mockReset();
  h.reportsResult = { data: null, error: null };
  h.createSigned.mockResolvedValue({ data: { signedUrl: "https://s/u" }, error: null });
  h.upload.mockResolvedValue({ error: null });
});

describe("uploadConsultingSource", () => {
  it("path 반환(consulting 경로)", async () => {
    const path = await uploadConsultingSource("u1", new File(["x"], "a.png", { type: "image/png" }));
    expect(path).toMatch(/^u1\/consulting\/.+\.png$/);
  });
  it("실패 시 '업로드 실패:' 메시지로 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("nope") });
    await expect(uploadConsultingSource("u1", new File(["x"], "a.png"))).rejects.toThrow(/업로드 실패: nope/);
  });
});

describe("requestConsulting", () => {
  it("report_id 반환", async () => {
    h.invoke.mockResolvedValue({ data: { report_id: "r1" }, error: null });
    expect(await requestConsulting("p", ["hair"])).toBe("r1");
  });
  it("error.context.json 의 code 를 메시지로 throw", async () => {
    h.invoke.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ error: "insufficient_hearts" }) } },
    });
    await expect(requestConsulting("p", ["hair"])).rejects.toThrow("insufficient_hearts");
  });
  it("data.error 면 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "bad" }, error: null });
    await expect(requestConsulting("p", ["hair"])).rejects.toThrow("bad");
  });
  it("report_id 없으면 '요청 실패'", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(requestConsulting("p", ["hair"])).rejects.toThrow("요청 실패");
  });
});

describe("fetchConsultingDiscounted", () => {
  it("used_count 0 이면 true(할인)", async () => {
    h.maybeSingle.mockResolvedValue({ data: { used_count: 0 } });
    expect(await fetchConsultingDiscounted("u1")).toBe(true);
  });
  it("used_count>0 이면 false", async () => {
    h.maybeSingle.mockResolvedValue({ data: { used_count: 2 } });
    expect(await fetchConsultingDiscounted("u1")).toBe(false);
  });
  it("행 없으면 true(할인)", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchConsultingDiscounted("u1")).toBe(true);
  });
});

describe("fetchConsultingReports", () => {
  it("limit 없이 행 반환", async () => {
    h.reportsResult = { data: [{ id: "1" }], error: null };
    expect(await fetchConsultingReports("u1")).toEqual([{ id: "1" }]);
  });
  it("limit 지정해도 행 반환", async () => {
    h.reportsResult = { data: [{ id: "2" }], error: null };
    expect(await fetchConsultingReports("u1", 20)).toEqual([{ id: "2" }]);
  });
  it("에러 시 throw", async () => {
    h.reportsResult = { data: null, error: new Error("e") };
    await expect(fetchConsultingReports("u1")).rejects.toThrow("e");
  });
});

describe("fetchConsultingReport", () => {
  it("행 반환", async () => {
    h.single.mockResolvedValue({ data: { id: "1", status: "completed" }, error: null });
    expect(await fetchConsultingReport("1")).toEqual({ id: "1", status: "completed" });
  });
  it("에러면 null", async () => {
    h.single.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchConsultingReport("1")).toBeNull();
  });
});

describe("consultingResultUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await consultingResultUrl("p")).toBe("https://s/u");
  });
});
