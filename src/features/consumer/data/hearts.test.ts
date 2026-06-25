import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ maybeSingle: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  return { supabase: { from: () => builder } };
});

import { fetchHeartBalance } from "./hearts";

beforeEach(() => h.maybeSingle.mockReset());

describe("fetchHeartBalance", () => {
  it("balance 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { balance: 7 } });
    expect(await fetchHeartBalance("u1")).toBe(7);
  });
  it("행 없으면 0", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchHeartBalance("u1")).toBe(0);
  });
});
