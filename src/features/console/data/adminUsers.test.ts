import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), rpcImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a), rpc: (...a: unknown[]) => h.rpcImpl(...a) },
}));

import { fetchUsersWithDetails, setMemberAffiliation, adminUsersKeys } from "./adminUsers";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    limit: () => b,
    in: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.rpcImpl.mockReset();
});

describe("adminUsersKeys", () => {
  it("list 키", () => {
    expect(adminUsersKeys.list()).toEqual(["admin", "users", "list"]);
  });
});

describe("fetchUsersWithDetails", () => {
  it("프로필에 역할·하트·피팅·소속을 조인하고 매핑한다", async () => {
    h.fromImpl.mockImplementation((t: string) => {
      if (t === "profiles")
        return builder({
          data: [
            { user_id: "u1", email: "a@x.com", display_name: "A", community_nickname: null, created_at: "2026-06-01", member_tier: "basic" },
            { user_id: "u2", email: null, display_name: null, community_nickname: "nick", created_at: "2026-06-02", member_tier: "garbage" },
          ],
          error: null,
        });
      if (t === "user_roles") return builder({ data: [{ user_id: "u1", role: "admin" }, { user_id: "u1", role: "business" }], error: null });
      if (t === "user_hearts") return builder({ data: [{ user_id: "u1", balance: 50, total_spent: 10 }], error: null });
      if (t === "dress_fittings") return builder({ data: [{ user_id: "u1" }, { user_id: "u1" }, { user_id: "u2" }], error: null });
      return builder({ data: [], error: null });
    });
    h.rpcImpl.mockResolvedValue({ data: [{ user_id: "u1", affiliation: "business" }], error: null });

    const users = await fetchUsersWithDetails();
    const u1 = users.find((u) => u.user_id === "u1")!;
    expect(u1.roles).toEqual(["admin", "business"]);
    expect(u1.hearts_balance).toBe(50);
    expect(u1.hearts_spent).toBe(10);
    expect(u1.fittings_count).toBe(2); // u1 피팅 2건
    expect(u1.affiliation).toBe("business");
    expect(u1.member_tier).toBe("basic");

    const u2 = users.find((u) => u.user_id === "u2")!;
    expect(u2.member_tier).toBe("basic"); // 잘못된 tier → basic 폴백
    expect(u2.affiliation).toBe("individual"); // 소속 없으면 individual
    expect(u2.fittings_count).toBe(1);
    expect(u2.hearts_balance).toBe(0); // 하트 없으면 0
  });

  it("프로필 0건이면 빈 배열(부가 쿼리 안 함)", async () => {
    h.fromImpl.mockImplementation(() => builder({ data: [], error: null }));
    expect(await fetchUsersWithDetails()).toEqual([]);
    expect(h.rpcImpl).not.toHaveBeenCalled();
  });

  it("프로필 조회 에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("profiles fail") }));
    await expect(fetchUsersWithDetails()).rejects.toThrow("profiles fail");
  });
});

describe("setMemberAffiliation", () => {
  it("individual 전환 시 service_category 를 null 로 보낸다", async () => {
    let sentArgs: Record<string, unknown> = {};
    h.rpcImpl.mockImplementation((_name: string, args: Record<string, unknown>) => {
      sentArgs = args;
      return Promise.resolve({ data: { ok: true }, error: null });
    });
    const r = await setMemberAffiliation("u1", "individual", "studio");
    expect(r).toEqual({ ok: true });
    expect(sentArgs.p_service_category).toBeNull();
  });

  it("res.error 를 전달한다", async () => {
    h.rpcImpl.mockResolvedValue({ data: { ok: false, error: "forbidden" }, error: null });
    expect(await setMemberAffiliation("u1", "business", "studio")).toEqual({ ok: false, error: "forbidden" });
  });
});
