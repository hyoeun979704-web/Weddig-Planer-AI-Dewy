import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  limit: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.limit = (...a: unknown[]) => h.limit(...a);
  return {
    supabase: {
      from: () => builder,
      functions: { invoke: (...a: unknown[]) => h.invoke(...a) },
    },
  };
});

import {
  fetchStarterUsed,
  readyHeartCharge,
  approveHeartCharge,
  readySubscription,
  approveSubscription,
} from "./payments";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
});

describe("fetchStarterUsed", () => {
  it("행이 있으면 true", async () => {
    h.limit.mockResolvedValue({ data: [{ id: "t1" }], error: null });
    expect(await fetchStarterUsed("u1")).toBe(true);
  });
  it("행이 없으면 false", async () => {
    h.limit.mockResolvedValue({ data: [], error: null });
    expect(await fetchStarterUsed("u1")).toBe(false);
  });
  it("data 가 null 이면 false", async () => {
    h.limit.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchStarterUsed("u1")).toBe(false);
  });
});

describe("readyHeartCharge", () => {
  it("성공 응답 반환 + 함수명 확인", async () => {
    h.invoke.mockResolvedValue({ data: { success: true, tid: "T1" }, error: null });
    const res = await readyHeartCharge({ packageId: "p1" });
    expect(res.data).toEqual({ success: true, tid: "T1" });
    expect(h.invoke).toHaveBeenCalledWith("kakao-pay-charge-ready", { body: { packageId: "p1" } });
  });
  it("error 전달", async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: "fail" } });
    const res = await readyHeartCharge({});
    expect(res.error).toEqual({ message: "fail" });
  });
});

describe("approveHeartCharge", () => {
  it("성공 응답 반환 + 함수명 확인", async () => {
    h.invoke.mockResolvedValue({ data: { success: true, heartsGranted: 10 }, error: null });
    const res = await approveHeartCharge({ tid: "T1" });
    expect(res.data).toEqual({ success: true, heartsGranted: 10 });
    expect(h.invoke).toHaveBeenCalledWith("kakao-pay-charge-approve", { body: { tid: "T1" } });
  });
  it("error 전달", async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: "no" } });
    const res = await approveHeartCharge({});
    expect(res.error).toEqual({ message: "no" });
  });
});

describe("readySubscription", () => {
  it("성공 응답 반환 + 함수명 확인", async () => {
    h.invoke.mockResolvedValue({ data: { success: true, tid: "T1" }, error: null });
    const res = await readySubscription({ type: "monthly" });
    expect(res.data).toEqual({ success: true, tid: "T1" });
    expect(h.invoke).toHaveBeenCalledWith("kakao-pay-ready", { body: { type: "monthly" } });
  });
  it("error 전달", async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: "fail" } });
    const res = await readySubscription({});
    expect(res.error).toEqual({ message: "fail" });
  });
});

describe("approveSubscription", () => {
  it("성공 응답 반환 + 함수명 확인", async () => {
    h.invoke.mockResolvedValue({ data: { success: true, heartsGranted: 180 }, error: null });
    const res = await approveSubscription({ tid: "T1" });
    expect(res.data).toEqual({ success: true, heartsGranted: 180 });
    expect(h.invoke).toHaveBeenCalledWith("kakao-pay-approve", { body: { tid: "T1" } });
  });
  it("error 전달", async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: "no" } });
    const res = await approveSubscription({});
    expect(res.error).toEqual({ message: "no" });
  });
});
