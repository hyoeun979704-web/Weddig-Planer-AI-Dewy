import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: (...a: unknown[]) => h.insert(...a) }),
  },
}));

import { createInquiry } from "./supportChat";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
});

describe("createInquiry", () => {
  it("inquiries INSERT 매핑 + 성공", async () => {
    h.insert.mockResolvedValue({ error: null });
    await expect(
      createInquiry({ userId: "u1", category: "complaint", title: "t", content: "c" }),
    ).resolves.toBeUndefined();
    expect(h.insert).toHaveBeenCalledWith({
      user_id: "u1",
      category: "complaint",
      title: "t",
      content: "c",
    });
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("insert fail") });
    await expect(
      createInquiry({ userId: "u1", category: "complaint", title: "t", content: "c" }),
    ).rejects.toThrow("insert fail");
  });
});
