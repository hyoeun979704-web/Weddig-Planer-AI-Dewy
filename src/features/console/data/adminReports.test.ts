import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), getUserImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    auth: { getUser: (...a: unknown[]) => h.getUserImpl(...a) },
  },
}));

import { fetchReports, updateReportStatus, deleteReportTarget, adminReportKeys } from "./adminReports";

const builder = (result: unknown, spy?: { from?: string; update?: Record<string, unknown> }) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    eq: () => b,
    delete: () => b,
    update: (u: Record<string, unknown>) => {
      if (spy) spy.update = u;
      return b;
    },
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.getUserImpl.mockReset();
});

describe("adminReportKeys", () => {
  it("필터 포함 list 키", () => {
    const f = { statusFilter: "all" as const, typeFilter: "all" as const };
    expect(adminReportKeys.list(f)[3]).toEqual(f);
  });
});

describe("fetchReports", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ report_id: "r1" }], error: null }));
    expect(await fetchReports({ statusFilter: "pending", typeFilter: "all" })).toEqual([{ report_id: "r1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchReports({ statusFilter: "all", typeFilter: "all" })).rejects.toThrow("fail");
  });
});

describe("updateReportStatus", () => {
  it("actioned 면 resolved_at·resolved_by 를 채운다", async () => {
    h.getUserImpl.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const spy: { update?: Record<string, unknown> } = {};
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await updateReportStatus("r1", "actioned");
    expect(spy.update?.status).toBe("actioned");
    expect(spy.update?.resolved_by).toBe("admin-1");
    expect(typeof spy.update?.resolved_at).toBe("string");
  });

  it("reviewing 이면 resolved 정보 없이 상태만 변경", async () => {
    h.getUserImpl.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    const spy: { update?: Record<string, unknown> } = {};
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await updateReportStatus("r1", "reviewing");
    expect(spy.update).toEqual({ status: "reviewing" });
  });

  it("에러 시 throw", async () => {
    h.getUserImpl.mockResolvedValue({ data: { user: { id: "a" } } });
    h.fromImpl.mockReturnValue(builder({ error: new Error("upd fail") }));
    await expect(updateReportStatus("r1", "dismissed")).rejects.toThrow("upd fail");
  });
});

describe("deleteReportTarget", () => {
  it("post 는 community_posts 에서 삭제", async () => {
    let table = "";
    h.fromImpl.mockImplementation((t: string) => { table = t; return builder({ error: null }); });
    await deleteReportTarget("post", "t1");
    expect(table).toBe("community_posts");
  });
  it("comment 는 community_comments 에서 삭제", async () => {
    let table = "";
    h.fromImpl.mockImplementation((t: string) => { table = t; return builder({ error: null }); });
    await deleteReportTarget("comment", "t1");
    expect(table).toBe("community_comments");
  });
});
