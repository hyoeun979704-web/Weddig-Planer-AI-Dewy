import { describe, it, expect, vi, beforeEach } from "vitest";

// supabase 클라이언트 모킹 — from()/rpc() 를 테스트별로 갈아끼운다.
const h = vi.hoisted(() => ({ fromImpl: vi.fn(), rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    rpc: (...a: unknown[]) => h.rpcImpl(...a),
  },
}));

import {
  fetchBusinessStats,
  fetchActivePartnerApplication,
  submitPartnershipApplication,
  partnerDashboardKeys,
} from "./businessDashboard";

// .select(opts).eq(col,val) 종단에서 {count} 를 반환하는 카운트 빌더.
const countBuilder = (count: number | null) => ({
  select: () => ({ eq: () => Promise.resolve({ count, error: null }) }),
});

// partnership_applications 조회 체인.
const appBuilder = (data: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    eq: () => b,
    in: () => b,
    order: () => b,
    limit: () => b,
    maybeSingle: () => Promise.resolve({ data, error: null }),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.rpcImpl.mockReset();
});

describe("partnerDashboardKeys", () => {
  it("placeId/businessProfileId 별로 구조화된 안정적 키를 만든다", () => {
    expect(partnerDashboardKeys.stats("p1")).toEqual(["partner", "dashboard", "stats", "p1"]);
    expect(partnerDashboardKeys.partnerApplication("b1")).toEqual([
      "partner", "dashboard", "partnerApplication", "b1",
    ]);
  });
});

describe("fetchBusinessStats", () => {
  it("favorites/media/reviews 카운트 + 쿠폰 RPC + 인자 viewCount 를 매핑한다", async () => {
    h.fromImpl.mockImplementation((table: string) => {
      if (table === "favorites") return countBuilder(3);
      if (table === "place_media") return countBuilder(5);
      if (table === "place_reviews") return countBuilder(2);
      throw new Error(`unexpected table ${table}`);
    });
    h.rpcImpl.mockResolvedValue({ data: 7, error: null });

    const stats = await fetchBusinessStats("p1", 99);
    expect(stats).toEqual({ favorites: 3, media: 5, views: 99, couponDownloads: 7, reviews: 2 });
  });

  it("카운트 null·RPC 비숫자에 관대하게 0 폴백한다(통계 카드 안 깨짐)", async () => {
    h.fromImpl.mockImplementation(() => countBuilder(null));
    h.rpcImpl.mockResolvedValue({ data: null, error: { message: "nope" } });

    const stats = await fetchBusinessStats("p1", 0);
    expect(stats).toEqual({ favorites: 0, media: 0, views: 0, couponDownloads: 0, reviews: 0 });
  });
});

describe("fetchActivePartnerApplication", () => {
  it("진행 중 신청이 있으면 그 상태를 반환한다", async () => {
    h.fromImpl.mockReturnValue(appBuilder({ status: "interviewing" }));
    expect(await fetchActivePartnerApplication("b1")).toEqual({ status: "interviewing" });
  });

  it("없으면 null 을 반환한다", async () => {
    h.fromImpl.mockReturnValue(appBuilder(null));
    expect(await fetchActivePartnerApplication("b1")).toBeNull();
  });
});

describe("submitPartnershipApplication", () => {
  it("성공 시 resolve 한다", async () => {
    h.fromImpl.mockReturnValue({ insert: () => Promise.resolve({ error: null }) });
    await expect(submitPartnershipApplication("b1", "u1")).resolves.toBeUndefined();
  });

  it("insert 에러 시 throw 한다", async () => {
    h.fromImpl.mockReturnValue({ insert: () => Promise.resolve({ error: new Error("boom") }) });
    await expect(submitPartnershipApplication("b1", "u1")).rejects.toThrow("boom");
  });
});
