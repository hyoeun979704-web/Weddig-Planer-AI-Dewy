import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchWaitlist, markNotified, markAllNotified, serviceWaitlistKeys } from "./serviceWaitlist";

const builder = (result: unknown, spy?: { eqs: [unknown, unknown][] }) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    update: () => b,
    eq: (col: unknown, val: unknown) => {
      spy?.eqs.push([col, val]);
      return b;
    },
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("serviceWaitlistKeys", () => {
  it("필터 포함 list 키", () => {
    const f = { serviceFilter: "all", notifiedFilter: "all" as const };
    expect(serviceWaitlistKeys.list(f)[3]).toEqual(f);
  });
});

describe("fetchWaitlist", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "w1" }], error: null }));
    expect(await fetchWaitlist({ serviceFilter: "all", notifiedFilter: "all" })).toEqual([{ id: "w1" }]);
  });
  it("pending 필터는 notified=false 로 조회", async () => {
    const spy = { eqs: [] as [unknown, unknown][] };
    h.fromImpl.mockReturnValue(builder({ data: [], error: null }, spy));
    await fetchWaitlist({ serviceFilter: "studio", notifiedFilter: "pending" });
    expect(spy.eqs).toContainEqual(["service_id", "studio"]);
    expect(spy.eqs).toContainEqual(["notified", false]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchWaitlist({ serviceFilter: "all", notifiedFilter: "all" })).rejects.toThrow("fail");
  });
});

describe("markNotified / markAllNotified", () => {
  it("markNotified 는 id 로 update", async () => {
    const spy = { eqs: [] as [unknown, unknown][] };
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await markNotified("w1");
    expect(spy.eqs).toContainEqual(["id", "w1"]);
  });
  it("markAllNotified 는 notified=false 대상 update", async () => {
    const spy = { eqs: [] as [unknown, unknown][] };
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await markAllNotified();
    expect(spy.eqs).toContainEqual(["notified", false]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("upd fail") }));
    await expect(markNotified("w1")).rejects.toThrow("upd fail");
  });
});
