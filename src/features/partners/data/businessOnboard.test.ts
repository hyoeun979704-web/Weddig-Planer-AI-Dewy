import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  maybeSingle: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  builder.insert = (...a: unknown[]) => h.insert(...a);
  return {
    supabase: {
      auth: { getSession: (...a: unknown[]) => h.getSession(...a) },
      from: () => builder,
    },
  };
});

import { verifyBusiness, applyPartnership } from "./businessOnboard";

const payload = {
  business_number: "000-00-00000",
  business_name: "상호",
  representative_name: "대표",
  open_date: "2020-01-01",
  business_type: "서비스업",
  service_category: "hall",
  phone: "02-000-0000",
};

beforeEach(() => {
  h.getSession.mockReset();
  h.maybeSingle.mockReset();
  h.insert.mockReset();
  h.getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
  vi.stubGlobal("fetch", vi.fn());
});

describe("verifyBusiness", () => {
  it("성공 응답을 { ok:true, data } 로 반환", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ is_verified: true, message: "ok" }),
    });
    const res = await verifyBusiness(payload);
    expect(res).toEqual({ ok: true, data: { is_verified: true, message: "ok" } });
  });
  it("verify-business 엔드포인트에 Bearer 토큰으로 POST", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });
    await verifyBusiness(payload);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("/functions/v1/verify-business");
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe("Bearer tok");
    expect((init as { method: string }).method).toBe("POST");
  });
  it("실패 응답은 ok:false 로 전달", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => ({ error: "bad" }) });
    const res = await verifyBusiness(payload);
    expect(res.ok).toBe(false);
    expect(res.data.error).toBe("bad");
  });
});

describe("applyPartnership", () => {
  it("프로필 있으면 partnership_applications insert", async () => {
    h.maybeSingle.mockResolvedValue({ data: { id: "bp1" } });
    h.insert.mockResolvedValue({ error: null });
    await applyPartnership("u1");
    expect(h.insert).toHaveBeenCalledWith({
      business_profile_id: "bp1",
      user_id: "u1",
      message: "가입 시 신청",
    });
  });
  it("프로필 없으면 insert 안 함", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    await applyPartnership("u1");
    expect(h.insert).not.toHaveBeenCalled();
  });
});
