import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...a: unknown[]) => h.fromImpl(...a) },
}));

import { fetchErrorLogs, cleanupOldLogs, errorLogKeys } from "./errorLogs";

const builder = (result: unknown, spy?: { gte?: boolean; lt?: boolean; eq?: [unknown, unknown] }) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    limit: () => b,
    delete: () => b,
    gte: () => { if (spy) spy.gte = true; return b; },
    lt: () => { if (spy) spy.lt = true; return b; },
    eq: (c: unknown, v: unknown) => { if (spy) spy.eq = [c, v]; return b; },
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => h.fromImpl.mockReset());

describe("errorLogKeys", () => {
  it("필터 포함 list 키", () => {
    const f = { days: 7, source: "all" };
    expect(errorLogKeys.list(f)[3]).toEqual(f);
  });
});

describe("fetchErrorLogs", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "l1" }], error: null }));
    expect(await fetchErrorLogs({ days: null, source: "all" })).toEqual([{ id: "l1" }]);
  });
  it("days 지정 시 gte, source 지정 시 eq 적용", async () => {
    const spy: { gte?: boolean; eq?: [unknown, unknown] } = {};
    h.fromImpl.mockReturnValue(builder({ data: [], error: null }, spy));
    await fetchErrorLogs({ days: 7, source: "manual" });
    expect(spy.gte).toBe(true);
    expect(spy.eq).toEqual(["source", "manual"]);
  });
  it("days=null·source=all 이면 필터 미적용", async () => {
    const spy: { gte?: boolean; eq?: [unknown, unknown] } = {};
    h.fromImpl.mockReturnValue(builder({ data: [], error: null }, spy));
    await fetchErrorLogs({ days: null, source: "all" });
    expect(spy.gte).toBeUndefined();
    expect(spy.eq).toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchErrorLogs({ days: null, source: "all" })).rejects.toThrow("fail");
  });
});

describe("cleanupOldLogs", () => {
  it("lt(created_at) 로 오래된 로그 삭제", async () => {
    const spy: { lt?: boolean } = {};
    h.fromImpl.mockReturnValue(builder({ error: null }, spy));
    await cleanupOldLogs(30);
    expect(spy.lt).toBe(true);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("del fail") }));
    await expect(cleanupOldLogs()).rejects.toThrow("del fail");
  });
});
