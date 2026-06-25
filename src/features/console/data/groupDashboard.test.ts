import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchGroupPendingCounts, groupDashboardKeys } from "./groupDashboard";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    eq: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("groupDashboardKeys", () => {
  it("그룹별 pending 키", () => {
    expect(groupDashboardKeys.pending("commerce")).toEqual(["admin", "groupDashboard", "commerce", "pending"]);
  });
});

describe("fetchGroupPendingCounts", () => {
  it("commerce: 이벤트+쿠폰 pending 합산", async () => {
    h.fromImpl.mockImplementation((t: string) =>
      t === "business_events" ? builder({ count: 2, error: null }) : builder({ count: 3, error: null }),
    );
    const r = await fetchGroupPendingCounts("commerce");
    expect(r["/admin/content-review"]).toBe(5);
  });

  it("moderation: service_waitlist 미알림 수", async () => {
    h.fromImpl.mockReturnValue(builder({ count: 4, error: null }));
    const r = await fetchGroupPendingCounts("moderation");
    expect(r["/admin/service-waitlist"]).toBe(4);
  });

  it("ai: dress_fittings pending 수", async () => {
    h.fromImpl.mockReturnValue(builder({ count: 9, error: null }));
    const r = await fetchGroupPendingCounts("ai");
    expect(r["/admin/ai-jobs"]).toBe(9);
  });

  it("해당 없는 그룹은 빈 객체 + 쿼리 안 함", async () => {
    const r = await fetchGroupPendingCounts("design");
    expect(r).toEqual({});
    expect(h.fromImpl).not.toHaveBeenCalled();
  });

  it("count null → 0", async () => {
    h.fromImpl.mockReturnValue(builder({ count: null, error: null }));
    const r = await fetchGroupPendingCounts("commerce");
    expect(r["/admin/content-review"]).toBe(0);
  });
});
