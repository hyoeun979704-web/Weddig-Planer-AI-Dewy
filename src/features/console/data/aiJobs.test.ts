import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => h.rpcImpl(...a) },
}));

import { fetchAiJobOverview, aiJobKeys } from "./aiJobs";

beforeEach(() => h.rpcImpl.mockReset());

describe("aiJobKeys", () => {
  it("overview 키", () => {
    expect(aiJobKeys.overview()).toEqual(["admin", "aiJobs", "overview"]);
  });
});

describe("fetchAiJobOverview", () => {
  it("통계·실패목록을 병렬로 반환", async () => {
    h.rpcImpl.mockImplementation((name: string) =>
      name === "admin_ai_job_stats"
        ? Promise.resolve({ data: [{ feature: "hair" }], error: null })
        : Promise.resolve({ data: [{ report_id: "r1" }], error: null }),
    );
    const r = await fetchAiJobOverview();
    expect(r.stats).toEqual([{ feature: "hair" }]);
    expect(r.failures).toEqual([{ report_id: "r1" }]);
  });

  it("통계 실패는 throw", async () => {
    h.rpcImpl.mockImplementation((name: string) =>
      name === "admin_ai_job_stats"
        ? Promise.resolve({ data: null, error: new Error("stats fail") })
        : Promise.resolve({ data: [], error: null }),
    );
    await expect(fetchAiJobOverview()).rejects.toThrow("stats fail");
  });

  it("실패목록 RPC 에러는 빈 배열로 격리(화면 안 깨짐)", async () => {
    h.rpcImpl.mockImplementation((name: string) =>
      name === "admin_ai_job_stats"
        ? Promise.resolve({ data: [{ feature: "hair" }], error: null })
        : Promise.resolve({ data: null, error: new Error("not applied") }),
    );
    const r = await fetchAiJobOverview();
    expect(r.failures).toEqual([]);
    expect(r.stats).toEqual([{ feature: "hair" }]);
  });
});
