import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  order: vi.fn(),
  single: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = (...a: unknown[]) => h.order(...a);
  builder.single = (...a: unknown[]) => h.single(...a);
  return {
    supabase: {
      from: () => builder,
      functions: { invoke: (...a: unknown[]) => h.invoke(...a) },
    },
  };
});

import {
  fetchOrders,
  fetchOrderComplete,
  readyOrderPayment,
  approveOrderPayment,
} from "./orders";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
});

describe("fetchOrders", () => {
  it("주문 목록 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "o1", order_items: [] }], error: null });
    expect(await fetchOrders("u1")).toEqual([{ id: "o1", order_items: [] }]);
  });
  it("에러 시 빈 배열", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await fetchOrders("u1")).toEqual([]);
  });
});

describe("fetchOrderComplete", () => {
  it("주문 상세 반환", async () => {
    h.single.mockResolvedValue({ data: { id: "o1", order_number: "N1" }, error: null });
    expect(await fetchOrderComplete("o1")).toEqual({ id: "o1", order_number: "N1" });
  });
  it("없으면 null", async () => {
    h.single.mockResolvedValue({ data: null, error: null });
    expect(await fetchOrderComplete("o1")).toBeNull();
  });
});

describe("readyOrderPayment", () => {
  it("성공 응답을 그대로 반환", async () => {
    h.invoke.mockResolvedValue({ data: { success: true, tid: "T1" }, error: null });
    const res = await readyOrderPayment({});
    expect(res.data).toEqual({ success: true, tid: "T1" });
    expect(res.error).toBeNull();
    expect(h.invoke).toHaveBeenCalledWith("kakao-pay-order-ready", { body: {} });
  });
  it("error 를 그대로 반환", async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: "fail" } });
    const res = await readyOrderPayment({});
    expect(res.data).toBeNull();
    expect(res.error).toEqual({ message: "fail" });
  });
});

describe("approveOrderPayment", () => {
  it("일반 주문은 kakao-pay-order-approve 호출", async () => {
    h.invoke.mockResolvedValue({ data: { success: true }, error: null });
    const res = await approveOrderPayment(false, { tid: "T1" });
    expect(res.data).toEqual({ success: true });
    expect(h.invoke).toHaveBeenCalledWith("kakao-pay-order-approve", { body: { tid: "T1" } });
  });
  it("디자인 구매는 design-purchase-approve 호출 + error 전달", async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: "no" } });
    const res = await approveOrderPayment(true, { tid: "T1" });
    expect(res.error).toEqual({ message: "no" });
    expect(h.invoke).toHaveBeenCalledWith("design-purchase-approve", { body: { tid: "T1" } });
  });
});
