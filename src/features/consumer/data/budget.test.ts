import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => h.rpc(...a),
  },
}));

import { payBalance } from "./budget";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
});

describe("payBalance", () => {
  it("RPC 호출 인자 매핑 + 성공", async () => {
    h.rpc.mockResolvedValue({ error: null });
    await expect(
      payBalance({ itemId: "i1", payDate: "2026-06-25", paymentMethod: "card", memo: "m" }),
    ).resolves.toBeUndefined();
    expect(h.rpc).toHaveBeenCalledWith("pay_balance", {
      p_item_id: "i1",
      p_pay_date: "2026-06-25",
      p_payment_method: "card",
      p_memo: "m",
    });
  });
  it("memo null 도 전달", async () => {
    h.rpc.mockResolvedValue({ error: null });
    await payBalance({ itemId: "i1", payDate: "2026-06-25", paymentMethod: "card", memo: null });
    expect(h.rpc).toHaveBeenCalledWith("pay_balance", expect.objectContaining({ p_memo: null }));
  });
  it("에러 시 throw", async () => {
    h.rpc.mockResolvedValue({ error: new Error("rpc fail") });
    await expect(
      payBalance({ itemId: "i1", payDate: "2026-06-25", paymentMethod: "card", memo: null }),
    ).rejects.toThrow("rpc fail");
  });
});
