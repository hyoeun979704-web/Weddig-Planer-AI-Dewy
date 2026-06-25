import { describe, it, expect, vi, beforeEach } from "vitest";

// 다단계 체인(.from().select().eq()...)을 위한 thenable 빌더 목.
// 각 빌더는 마지막에 result(또는 maybeSingle/limit)로 해소된다.
const h = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown },
  maybeSingleResult: { data: null as unknown, error: null as unknown },
  insert: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  invoke: vi.fn(),
  rpc: vi.fn(),
  reauth: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = () => {
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.in = () => builder;
    builder.order = () => builder;
    builder.limit = () => Promise.resolve(h.result);
    builder.maybeSingle = () => Promise.resolve(h.maybeSingleResult);
    builder.update = (...a: unknown[]) => {
      h.update(...a);
      return builder;
    };
    builder.insert = (...a: unknown[]) => h.insert(...a);
    builder.delete = () => ({ eq: (...a: unknown[]) => h.del(...a) });
    // thenable — .from(...).in(...) 등이 await 되면 result 로 해소.
    builder.then = (res: (v: unknown) => unknown) => res(h.result);
    return builder;
  };
  return {
    supabase: {
      from: () => makeBuilder(),
      rpc: (...a: unknown[]) => h.rpc(...a),
      functions: { invoke: (...a: unknown[]) => h.invoke(...a) },
      auth: {
        reauthenticate: (...a: unknown[]) => h.reauth(...a),
        updateUser: (...a: unknown[]) => h.updateUser(...a),
        getUser: (...a: unknown[]) => h.getUser(...a),
      },
      storage: {
        from: () => ({
          upload: (...a: unknown[]) => h.upload(...a),
          getPublicUrl: (...a: unknown[]) => h.getPublicUrl(...a),
        }),
      },
    },
  };
});

import {
  fetchProfile,
  fetchWeddingSettings,
  uploadAvatar,
  updateAvatarUrl,
  updateProfile,
  upsertWeddingSettings,
  syncBudgetRegion,
  sendReauthCode,
  updatePassword,
  deleteAccount,
  fetchMarketingConsent,
  recordMarketingConsent,
  fetchMailAccount,
  fetchMailList,
  startMailOAuth,
  disconnectMailAccount,
  sendMail,
  fetchFavoritePlaces,
  fetchFavoriteDeals,
  fetchFavoriteProducts,
  fetchFavoriteTipVideos,
} from "./account";

beforeEach(() => {
  h.result = { data: null, error: null };
  h.maybeSingleResult = { data: null, error: null };
  h.insert.mockReset().mockResolvedValue({ error: null });
  h.update.mockReset().mockReturnValue(undefined);
  h.del.mockReset().mockResolvedValue({ error: null });
  h.invoke.mockReset().mockResolvedValue({ data: {}, error: null });
  h.rpc.mockReset().mockResolvedValue({ data: {}, error: null });
  h.reauth.mockReset().mockResolvedValue({ error: null });
  h.updateUser.mockReset().mockResolvedValue({ error: null });
  h.getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
  h.upload.mockReset().mockResolvedValue({ error: null });
  h.getPublicUrl.mockReset().mockReturnValue({ data: { publicUrl: "https://pub/x" } });
});

// ── 프로필 ───────────────────────────────────────────────────────────────

describe("fetchProfile", () => {
  it("행 반환", async () => {
    h.maybeSingleResult = { data: { display_name: "A" }, error: null };
    expect(await fetchProfile("u1")).toEqual({ display_name: "A" });
  });
  it("없으면 null", async () => {
    h.maybeSingleResult = { data: null, error: null };
    expect(await fetchProfile("u1")).toBeNull();
  });
});

describe("fetchWeddingSettings", () => {
  it("행 반환", async () => {
    h.maybeSingleResult = { data: { wedding_date: "2026-01-01" }, error: null };
    expect(await fetchWeddingSettings("u1")).toEqual({ wedding_date: "2026-01-01" });
  });
  it("없으면 null", async () => {
    expect(await fetchWeddingSettings("u1")).toBeNull();
  });
});

describe("uploadAvatar", () => {
  it("업로드 후 공개 URL 반환", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    expect(await uploadAvatar("u1", file)).toBe("https://pub/x");
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadAvatar("u1", new File(["x"], "a.png"))).rejects.toThrow("up");
  });
});

describe("updateAvatarUrl", () => {
  it("성공 시 통과", async () => {
    h.result = { data: null, error: null };
    await expect(updateAvatarUrl("u1", "https://x")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result = { data: null, error: new Error("db") };
    await expect(updateAvatarUrl("u1", "https://x")).rejects.toThrow("db");
  });
});

describe("updateProfile", () => {
  it("성공 시 통과", async () => {
    h.result = { data: null, error: null };
    await expect(
      updateProfile("u1", { display_name: "A", community_nickname: null, birth_year: 1990, phone: null }),
    ).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.result = { data: null, error: new Error("db") };
    await expect(
      updateProfile("u1", { display_name: "A", community_nickname: null, birth_year: null, phone: null }),
    ).rejects.toThrow("db");
  });
});

describe("upsertWeddingSettings", () => {
  it("기존 행 있으면 update 호출", async () => {
    h.maybeSingleResult = { data: { id: "s1" }, error: null };
    await upsertWeddingSettings("u1", { wedding_date: "2026-01-01", wedding_region: "서울" });
    expect(h.update).toHaveBeenCalled();
    expect(h.insert).not.toHaveBeenCalled();
  });
  it("기존 행 없으면 insert 호출", async () => {
    h.maybeSingleResult = { data: null, error: null };
    await upsertWeddingSettings("u1", { wedding_date: null, wedding_region: "서울" });
    expect(h.insert).toHaveBeenCalled();
  });
});

describe("syncBudgetRegion", () => {
  it("행 있으면 update 호출", async () => {
    h.maybeSingleResult = { data: { id: "b1" }, error: null };
    await syncBudgetRegion("u1", "seoul");
    expect(h.update).toHaveBeenCalledWith({ region: "seoul" });
  });
  it("행 없으면 update 미호출", async () => {
    h.maybeSingleResult = { data: null, error: null };
    await syncBudgetRegion("u1", "seoul");
    expect(h.update).not.toHaveBeenCalled();
  });
});

describe("sendReauthCode", () => {
  it("성공 시 error null", async () => {
    h.reauth.mockResolvedValue({ error: null });
    expect(await sendReauthCode()).toEqual({ error: null });
  });
  it("실패 시 error 객체 반환", async () => {
    h.reauth.mockResolvedValue({ error: { message: "bad" } });
    expect(await sendReauthCode()).toEqual({ error: { message: "bad" } });
  });
});

describe("updatePassword", () => {
  it("성공 시 error null", async () => {
    h.updateUser.mockResolvedValue({ error: null });
    expect(await updatePassword("pw12345678", "123456")).toEqual({ error: null });
  });
  it("실패 시 error 객체 반환", async () => {
    h.updateUser.mockResolvedValue({ error: { message: "nonce" } });
    expect(await updatePassword("pw12345678", "000000")).toEqual({ error: { message: "nonce" } });
  });
});

// ── 설정 ─────────────────────────────────────────────────────────────────

describe("deleteAccount", () => {
  it("성공 시 통과", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(deleteAccount()).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: null, error: new Error("fn") });
    await expect(deleteAccount()).rejects.toThrow("fn");
  });
});

// ── 알림 ─────────────────────────────────────────────────────────────────

describe("fetchMarketingConsent", () => {
  it("행 있으면 boolean 반환", async () => {
    h.result = { data: [{ agreed: true }], error: null };
    expect(await fetchMarketingConsent("u1")).toBe(true);
  });
  it("행 없으면 null", async () => {
    h.result = { data: [], error: null };
    expect(await fetchMarketingConsent("u1")).toBeNull();
  });
});

describe("recordMarketingConsent", () => {
  it("성공 시 통과", async () => {
    h.insert.mockResolvedValue({ error: null });
    await expect(recordMarketingConsent("u1", true)).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("ins") });
    await expect(recordMarketingConsent("u1", true)).rejects.toThrow("ins");
  });
});

// ── 메일 ─────────────────────────────────────────────────────────────────

describe("fetchMailAccount", () => {
  it("연결 상태 반환", async () => {
    h.rpc.mockResolvedValue({ data: { connected: true, email: "a@b.c" }, error: null });
    const res = await fetchMailAccount();
    expect(res.data).toEqual({ connected: true, email: "a@b.c" });
    expect(res.error).toBeNull();
  });
  it("데이터 없으면 빈 객체", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    const res = await fetchMailAccount();
    expect(res.data).toEqual({});
    expect(res.error).toEqual({ message: "x" });
  });
});

describe("fetchMailList", () => {
  it("items 반환", async () => {
    h.invoke.mockResolvedValue({ data: { items: [{ id: "1" }] }, error: null });
    expect(await fetchMailList()).toEqual([{ id: "1" }]);
  });
  it("에러 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: null, error: new Error("list") });
    await expect(fetchMailList()).rejects.toThrow("list");
  });
});

describe("startMailOAuth", () => {
  it("url 반환", async () => {
    h.invoke.mockResolvedValue({ data: { url: "https://o" }, error: null });
    expect(await startMailOAuth("http://x", "/mail")).toEqual({ url: "https://o", error: null, code: null });
  });
  it("에러 코드 반환", async () => {
    h.invoke.mockResolvedValue({ data: { error: "mail_not_configured" }, error: null });
    const res = await startMailOAuth("http://x", "/mail");
    expect(res.url).toBeNull();
    expect(res.code).toBe("mail_not_configured");
  });
});

describe("disconnectMailAccount", () => {
  it("로그인 시 delete 호출", async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    await disconnectMailAccount();
    expect(h.del).toHaveBeenCalled();
  });
  it("비로그인 시 delete 미호출", async () => {
    h.getUser.mockResolvedValue({ data: { user: null } });
    await disconnectMailAccount();
    expect(h.del).not.toHaveBeenCalled();
  });
});

describe("sendMail", () => {
  it("성공 시 통과", async () => {
    h.invoke.mockResolvedValue({ data: {}, error: null });
    await expect(sendMail({ to: "a@b.c", subject: "s", body: "b", attachments: [] })).resolves.toBeUndefined();
  });
  it("transport 에러 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: null, error: new Error("send") });
    await expect(sendMail({ to: "a@b.c", subject: "s", body: "b", attachments: [] })).rejects.toThrow(
      "메일 전송에 실패했어요",
    );
  });
  it("응답 error 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "quota" }, error: null });
    await expect(sendMail({ to: "a@b.c", subject: "s", body: "b", attachments: [] })).rejects.toThrow(
      "메일 전송에 실패했어요",
    );
  });
});

// ── 찜 ───────────────────────────────────────────────────────────────────

describe("fetchFavoritePlaces", () => {
  it("행 반환", async () => {
    h.result = { data: [{ place_id: "p1" }], error: null };
    expect(await fetchFavoritePlaces(["p1"])).toEqual([{ place_id: "p1" }]);
  });
  it("데이터 없으면 빈 배열", async () => {
    h.result = { data: null, error: null };
    expect(await fetchFavoritePlaces(["p1"])).toEqual([]);
  });
});

describe("fetchFavoriteDeals", () => {
  it("행 반환", async () => {
    h.result = { data: [{ id: "d1" }], error: null };
    expect(await fetchFavoriteDeals(["d1"])).toEqual([{ id: "d1" }]);
  });
  it("데이터 없으면 빈 배열", async () => {
    h.result = { data: null, error: null };
    expect(await fetchFavoriteDeals(["d1"])).toEqual([]);
  });
});

describe("fetchFavoriteProducts", () => {
  it("행 반환", async () => {
    h.result = { data: [{ id: "x1" }], error: null };
    expect(await fetchFavoriteProducts(["x1"])).toEqual([{ id: "x1" }]);
  });
  it("데이터 없으면 빈 배열", async () => {
    h.result = { data: null, error: null };
    expect(await fetchFavoriteProducts(["x1"])).toEqual([]);
  });
});

describe("fetchFavoriteTipVideos", () => {
  it("행 반환", async () => {
    h.result = { data: [{ video_id: "v1" }], error: null };
    expect(await fetchFavoriteTipVideos(["v1"])).toEqual([{ video_id: "v1" }]);
  });
  it("데이터 없으면 빈 배열", async () => {
    h.result = { data: null, error: null };
    expect(await fetchFavoriteTipVideos(["v1"])).toEqual([]);
  });
});
