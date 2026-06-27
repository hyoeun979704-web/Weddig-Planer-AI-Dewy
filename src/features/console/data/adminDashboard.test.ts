import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import {
  fetchAdminStats,
  fetchRecentActivity,
  fetchDataFreshness,
  adminDashboardKeys,
} from "./adminDashboard";

// 모든 체인 메서드가 자기 자신을 반환하고, await 시 result 로 resolve 하는 thenable 빌더.
const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    eq: () => b,
    gte: () => b,
    order: () => b,
    limit: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("adminDashboardKeys", () => {
  it("구조화된 키를 만든다", () => {
    expect(adminDashboardKeys.stats()).toEqual(["admin", "dashboard", "stats"]);
    expect(adminDashboardKeys.recent()).toEqual(["admin", "dashboard", "recent"]);
    expect(adminDashboardKeys.freshness()).toEqual(["admin", "dashboard", "freshness"]);
  });
});

// 테이블명 → 결과 맵 기반 목(매칭 없으면 기본값). throw 대신 기본값으로 견고하게.
const mapMock = (map: Record<string, unknown>, fallback: unknown) =>
  h.fromImpl.mockImplementation((t: string) => builder(t in map ? map[t] : fallback));

describe("fetchAdminStats", () => {
  it("카운트 매핑 + 하트 집계 + 검토대기 합산을 계산한다", async () => {
    const TXNS = [
      { amount: 100, reason: "purchase" },
      { amount: 50, reason: "first_purchase_bonus" },
      { amount: -30, reason: "spend_fitting" },
      { amount: -20, reason: "spend_hair" },
    ];
    mapMock(
      {
        heart_transactions: { data: TXNS, error: null },
        dress_samples: { count: 10, error: null },
        profiles: { count: 100, error: null },
        dress_fittings: { count: 5, error: null },
        service_waitlist: { count: 3, error: null },
        business_events: { count: 2, error: null },
        business_coupons: { count: 4, error: null },
      },
      { count: 0, error: null },
    );

    const s = await fetchAdminStats();
    expect(s.dressTotal).toBe(10);
    expect(s.usersTotal).toBe(100);
    expect(s.fittingsTotal).toBe(5);
    expect(s.pendingWaitlist).toBe(3);
    // 하트: 적립=100+50=150, 사용=|−30|+|−20|=50, 건수=4
    expect(s.heartEarned).toBe(150);
    expect(s.heartSpent).toBe(50);
    expect(s.heartTxnTotal).toBe(4);
    // 검토대기 = events(2) + coupons(4)
    expect(s.pendingContentReview).toBe(6);
  });

  it("count null 에 0 폴백한다", async () => {
    h.fromImpl.mockImplementation((t: string) =>
      t === "heart_transactions" ? builder({ data: null, error: null }) : builder({ count: null, error: null }),
    );
    const s = await fetchAdminStats();
    expect(s.usersTotal).toBe(0);
    expect(s.heartEarned).toBe(0);
    expect(s.pendingContentReview).toBe(0);
  });
});

describe("fetchRecentActivity", () => {
  it("피팅·하트·사전알림을 병합해 시간 역순 정렬하고 구매/사용을 구분한다", async () => {
    mapMock(
      {
        dress_fittings: { data: [{ id: "1", status: "done", created_at: "2026-06-01T00:00:00Z" }], error: null },
        heart_transactions: {
          data: [
            { id: "2", amount: 100, reason: "purchase", created_at: "2026-06-03T00:00:00Z" },
            { id: "3", amount: -10, reason: "spend_hair", created_at: "2026-06-02T00:00:00Z" },
          ],
          error: null,
        },
        service_waitlist: { data: [{ id: "4", service_id: "svc", created_at: "2026-06-04T00:00:00Z" }], error: null },
      },
      { data: [], error: null },
    );

    const items = await fetchRecentActivity();
    // 시간 역순: waitlist(06-04) → purchase(06-03) → spend(06-02) → fitting(06-01)
    expect(items.map((i) => i.id)).toEqual(["w-4", "t-2", "t-3", "f-1"]);
    expect(items[1].type).toBe("heart_purchase"); // reason=purchase
    expect(items[2].type).toBe("heart_spend"); // reason=spend_hair
  });
});

describe("fetchDataFreshness", () => {
  it("카테고리별 중앙값·stale(60일+)·미상(null)을 계산한다", async () => {
    const day = 86400000;
    const now = Date.now();
    // invitation_venue 만 데이터를 주고 나머지는 빈 배열.
    h.fromImpl.mockImplementation(() =>
      builder({
        data: [
          { last_collected_at: new Date(now - 10 * day).toISOString() }, // 10일
          { last_collected_at: new Date(now - 70 * day).toISOString() }, // 70일 → stale
          { last_collected_at: new Date(now - 90 * day).toISOString() }, // 90일 → stale
          { last_collected_at: null }, // 미상
        ],
        error: null,
      }),
    );

    const rows = await fetchDataFreshness();
    const r = rows[0];
    expect(r.total).toBe(4);
    expect(r.unknownCount).toBe(1);
    expect(r.staleCount).toBe(2); // 70·90일
    // known days 정렬 [10,70,90], 중앙값 index 1 = 70
    expect(r.daysSinceMedian).toBe(70);
  });

  it("빈 카테고리는 0 행으로 반환한다", async () => {
    h.fromImpl.mockImplementation(() => builder({ data: [], error: null }));
    const rows = await fetchDataFreshness();
    expect(rows.every((r) => r.total === 0)).toBe(true);
  });
});
