import { describe, it, expect, vi, beforeEach } from "vitest";

// 멀티스텝 체인(select·eq·in·order×2·limit·maybeSingle·single·insert·update·delete) 를
// thenable 빌더로 모킹한다. 각 빌더 메서드는 빌더를 반환하고, 최종 await 는 h.result 를 해석한다.
// rpc·functions.invoke·storage 는 별도 핸들로 모킹.
const h = vi.hoisted(() => ({
  result: { data: null as unknown, error: null as unknown, count: undefined as unknown },
  rpc: vi.fn(),
  invoke: vi.fn(),
  upload: vi.fn(),
  createSigned: vi.fn(),
  createSignedUrls: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.insert = chain;
  builder.update = chain;
  builder.delete = chain;
  builder.eq = chain;
  builder.in = chain;
  builder.order = chain;
  builder.limit = chain;
  builder.single = () => Promise.resolve(h.result);
  builder.maybeSingle = () => Promise.resolve(h.result);
  // 종단 await (.order() 등으로 끝나는 list 쿼리) — thenable 로 result 해석
  builder.then = (resolve: (v: unknown) => unknown) => resolve(h.result);
  return {
    supabase: {
      from: () => builder,
      rpc: (...a: unknown[]) => h.rpc(...a),
      functions: { invoke: (...a: unknown[]) => h.invoke(...a) },
      storage: {
        from: () => ({
          upload: (...a: unknown[]) => h.upload(...a),
          createSignedUrl: (...a: unknown[]) => h.createSigned(...a),
          createSignedUrls: (...a: unknown[]) => h.createSignedUrls(...a),
          remove: (...a: unknown[]) => h.remove(...a),
        }),
      },
    },
  };
});

import {
  fetchFrontTemplates,
  fetchFreeTemplates,
  fetchBackTemplates,
  fetchTemplateById,
  fetchTemplateFull,
  fetchStickerAssets,
  fetchLatestUserData,
  countInvitations,
  fetchInvitationForEdit,
  fetchPublishedMobileInvitations,
  fetchInvitationLayout,
  fetchInvitationOwnerMeta,
  fetchPublishedInvitationBySlug,
  insertInvitation,
  updateInvitation,
  deleteInvitation,
  publishInvitation,
  spendHearts,
  invokeCutout,
  invokeIllustration,
  invokeMap,
  invokeTextSuggest,
  invokeAddressSearch,
  invokeDesignPurchaseReady,
  fetchMarketDesigns,
  fetchPointBalance,
  fetchOwnedDesignIds,
  fetchGuestPhotos,
  insertGuestPhoto,
  deleteGuestPhoto,
  uploadInvitationImage,
  invitationImageUrl,
  invitationViewerUrl,
  uploadGuestPhoto,
  removeGuestPhoto,
  guestPhotoSignedUrls,
} from "./invitation";

function setResult(r: { data?: unknown; error?: unknown; count?: unknown }) {
  h.result = {
    data: r.data ?? null,
    error: r.error ?? null,
    count: r.count,
  };
}

beforeEach(() => {
  h.rpc.mockReset();
  h.invoke.mockReset();
  h.upload.mockReset();
  h.createSigned.mockReset();
  h.createSignedUrls.mockReset();
  h.remove.mockReset();
  setResult({ data: null, error: null });
  h.upload.mockResolvedValue({ error: null });
  h.createSigned.mockResolvedValue({ data: { signedUrl: "https://s/u" }, error: null });
  h.remove.mockResolvedValue({ error: null });
});

// ── 템플릿 ──
describe("fetchFrontTemplates / fetchFreeTemplates / fetchBackTemplates", () => {
  it("목록 반환", async () => {
    setResult({ data: [{ id: "t1" }] });
    expect(await fetchFrontTemplates("paper")).toEqual([{ id: "t1" }]);
    expect(await fetchFreeTemplates("mobile")).toEqual([{ id: "t1" }]);
    expect(await fetchBackTemplates()).toEqual([{ id: "t1" }]);
  });
  it("에러 시 throw", async () => {
    setResult({ data: null, error: new Error("e") });
    await expect(fetchFrontTemplates("paper")).rejects.toThrow("e");
    await expect(fetchFreeTemplates("paper")).rejects.toThrow("e");
    await expect(fetchBackTemplates()).rejects.toThrow("e");
  });
});

describe("fetchTemplateById / fetchTemplateFull", () => {
  it("행 반환", async () => {
    setResult({ data: { id: "t1" } });
    expect(await fetchTemplateById("t1")).toEqual({ id: "t1" });
    expect(await fetchTemplateFull("t1")).toEqual({ id: "t1" });
  });
  it("없으면 null", async () => {
    setResult({ data: null });
    expect(await fetchTemplateById("x")).toBeNull();
    expect(await fetchTemplateFull("x")).toBeNull();
  });
});

describe("fetchStickerAssets", () => {
  it("행 반환", async () => {
    setResult({ data: [{ id: "a1" }] });
    expect(await fetchStickerAssets()).toEqual([{ id: "a1" }]);
  });
  it("없으면 빈 배열", async () => {
    setResult({ data: null });
    expect(await fetchStickerAssets()).toEqual([]);
  });
});

// ── invitations 읽기 ──
describe("fetchLatestUserData", () => {
  it("user_data 반환", async () => {
    setResult({ data: { user_data: { groom_name: "G" } } });
    expect(await fetchLatestUserData("u1")).toEqual({ groom_name: "G" });
  });
  it("없으면 null", async () => {
    setResult({ data: null });
    expect(await fetchLatestUserData("u1")).toBeNull();
  });
});

describe("countInvitations", () => {
  it("count 반환", async () => {
    setResult({ data: null, count: 3 });
    expect(await countInvitations("u1")).toBe(3);
  });
  it("count 없으면 0", async () => {
    setResult({ data: null, count: null });
    expect(await countInvitations("u1")).toBe(0);
  });
});

describe("fetchInvitationForEdit", () => {
  it("행 반환", async () => {
    setResult({ data: { id: "i1", user_data: {} } });
    expect(await fetchInvitationForEdit("i1", "u1")).toEqual({ id: "i1", user_data: {} });
  });
  it("에러면 null", async () => {
    setResult({ data: null, error: new Error("e") });
    expect(await fetchInvitationForEdit("i1", "u1")).toBeNull();
  });
});

describe("fetchPublishedMobileInvitations", () => {
  it("행 반환", async () => {
    setResult({ data: [{ id: "i1", share_slug: "s" }] });
    expect(await fetchPublishedMobileInvitations("u1")).toEqual([
      { id: "i1", share_slug: "s" },
    ]);
  });
  it("에러면 빈 배열", async () => {
    setResult({ data: null, error: new Error("e") });
    expect(await fetchPublishedMobileInvitations("u1")).toEqual([]);
  });
});

describe("fetchInvitationLayout", () => {
  it("layout 반환", async () => {
    setResult({ data: { layout: { a: 1 } } });
    expect(await fetchInvitationLayout("i1")).toEqual({ a: 1 });
  });
  it("없으면 null", async () => {
    setResult({ data: null });
    expect(await fetchInvitationLayout("i1")).toBeNull();
  });
});

describe("fetchInvitationOwnerMeta", () => {
  it("메타 반환", async () => {
    setResult({ data: { user_id: "u1", user_data: {}, share_slug: "s" } });
    expect(await fetchInvitationOwnerMeta("i1")).toEqual({
      user_id: "u1",
      user_data: {},
      share_slug: "s",
    });
  });
  it("없으면 null", async () => {
    setResult({ data: null });
    expect(await fetchInvitationOwnerMeta("i1")).toBeNull();
  });
});

describe("fetchPublishedInvitationBySlug", () => {
  it("행 반환", async () => {
    setResult({ data: { id: "i1", user_data: {} } });
    expect(await fetchPublishedInvitationBySlug("slug")).toEqual({
      id: "i1",
      user_data: {},
    });
  });
  it("에러/없으면 null", async () => {
    setResult({ data: null, error: new Error("e") });
    expect(await fetchPublishedInvitationBySlug("slug")).toBeNull();
  });
});

// ── invitations 쓰기 ──
describe("insertInvitation", () => {
  it("id 반환", async () => {
    setResult({ data: { id: "new1" } });
    expect(await insertInvitation({ user_id: "u1" })).toBe("new1");
  });
  it("에러 시 throw", async () => {
    setResult({ data: null, error: new Error("e") });
    await expect(insertInvitation({})).rejects.toThrow("e");
  });
  it("id 없으면 throw", async () => {
    setResult({ data: {} });
    await expect(insertInvitation({})).rejects.toThrow("청첩장 저장에 실패");
  });
});

describe("updateInvitation", () => {
  it("성공", async () => {
    setResult({ error: null });
    await expect(updateInvitation("i1", { layout: {} })).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    setResult({ error: new Error("e") });
    await expect(updateInvitation("i1", {})).rejects.toThrow("e");
  });
});

describe("deleteInvitation", () => {
  it("에러를 흡수(throw 안 함)", async () => {
    setResult({ error: new Error("e") });
    await expect(deleteInvitation("i1")).resolves.toBeUndefined();
  });
});

// ── RPC ──
describe("publishInvitation", () => {
  it("배열 첫 행 반환", async () => {
    h.rpc.mockResolvedValue({ data: [{ share_slug: "s1" }], error: null });
    expect(await publishInvitation("i1")).toEqual({ share_slug: "s1" });
  });
  it("에러 시 throw", async () => {
    h.rpc.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(publishInvitation("i1")).rejects.toThrow("e");
  });
});

describe("spendHearts", () => {
  it("결과 행 반환", async () => {
    h.rpc.mockResolvedValue({ data: [{ success: true, balance_after: 5 }], error: null });
    const r = await spendHearts({ userId: "u1", amount: 3, reason: "x" });
    expect(r?.success).toBe(true);
  });
  it("에러 시 throw", async () => {
    h.rpc.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(spendHearts({ userId: "u1", amount: 3, reason: "x" })).rejects.toThrow("e");
  });
});

// ── Edge functions ──
describe("invokeCutout", () => {
  it("결과 반환", async () => {
    h.invoke.mockResolvedValue({ data: { cutout_paths: { p: "q" } }, error: null });
    expect(await invokeCutout(["p"])).toEqual({ cutout_paths: { p: "q" } });
  });
  it("error 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(invokeCutout(["p"])).rejects.toThrow("e");
  });
  it("응답 error 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "bad" }, error: null });
    await expect(invokeCutout(["p"])).rejects.toThrow("bad");
  });
});

describe("invokeIllustration / invokeMap / invokeAddressSearch (원본 반환)", () => {
  it("raw { data, error } 반환", async () => {
    h.invoke.mockResolvedValue({ data: { ok: 1 }, error: null });
    expect(await invokeIllustration({})).toEqual({ data: { ok: 1 }, error: null });
    expect(await invokeMap("addr")).toEqual({ data: { ok: 1 }, error: null });
    expect(await invokeAddressSearch("q")).toEqual({ data: { ok: 1 }, error: null });
  });
});

describe("invokeTextSuggest", () => {
  it("결과 반환", async () => {
    h.invoke.mockResolvedValue({ data: { suggestions: ["a"] }, error: null });
    expect(await invokeTextSuggest({})).toEqual({ suggestions: ["a"] });
  });
  it("error 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(invokeTextSuggest({})).rejects.toThrow("e");
  });
  it("응답 error 시 throw", async () => {
    h.invoke.mockResolvedValue({ data: { error: "bad" }, error: null });
    await expect(invokeTextSuggest({})).rejects.toThrow("bad");
  });
});

describe("invokeDesignPurchaseReady", () => {
  it("raw { data, error } 반환", async () => {
    h.invoke.mockResolvedValue({ data: { success: true }, error: null });
    expect(
      await invokeDesignPurchaseReady({ designId: "d", usePoints: 0, origin: "o" }),
    ).toEqual({ data: { success: true }, error: null });
  });
});

// ── 마켓 ──
describe("fetchMarketDesigns", () => {
  it("행 반환", async () => {
    setResult({ data: [{ id: "d1" }] });
    expect(await fetchMarketDesigns()).toEqual([{ id: "d1" }]);
  });
  it("없으면 빈 배열", async () => {
    setResult({ data: null });
    expect(await fetchMarketDesigns()).toEqual([]);
  });
});

describe("fetchPointBalance", () => {
  it("잔액 반환", async () => {
    setResult({ data: { balance: 100 } });
    expect(await fetchPointBalance("u1")).toBe(100);
  });
  it("없으면 0", async () => {
    setResult({ data: null });
    expect(await fetchPointBalance("u1")).toBe(0);
  });
});

describe("fetchOwnedDesignIds", () => {
  it("Set 반환", async () => {
    setResult({ data: [{ design_id: "d1" }, { design_id: "d2" }] });
    const s = await fetchOwnedDesignIds("u1");
    expect(s.has("d1")).toBe(true);
    expect(s.size).toBe(2);
  });
  it("없으면 빈 Set", async () => {
    setResult({ data: null });
    expect((await fetchOwnedDesignIds("u1")).size).toBe(0);
  });
});

// ── 하객 사진 ──
describe("fetchGuestPhotos", () => {
  it("행 반환", async () => {
    setResult({ data: [{ id: "g1" }] });
    expect(await fetchGuestPhotos("i1")).toEqual([{ id: "g1" }]);
  });
  it("에러 시 throw", async () => {
    setResult({ data: null, error: new Error("e") });
    await expect(fetchGuestPhotos("i1")).rejects.toThrow("e");
  });
});

describe("insertGuestPhoto", () => {
  it("성공", async () => {
    setResult({ error: null });
    await expect(
      insertGuestPhoto({
        invitationId: "i1",
        uploaderName: null,
        storagePath: "p",
        contentType: null,
        sizeBytes: 1,
      }),
    ).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    setResult({ error: new Error("e") });
    await expect(
      insertGuestPhoto({
        invitationId: "i1",
        uploaderName: null,
        storagePath: "p",
        contentType: null,
        sizeBytes: 1,
      }),
    ).rejects.toThrow("e");
  });
});

describe("deleteGuestPhoto", () => {
  it("성공", async () => {
    setResult({ error: null });
    await expect(deleteGuestPhoto("g1")).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    setResult({ error: new Error("e") });
    await expect(deleteGuestPhoto("g1")).rejects.toThrow("e");
  });
});

// ── 스토리지 ──
describe("uploadInvitationImage", () => {
  it("path + signedUrl 반환", async () => {
    const res = await uploadInvitationImage("u1", new File(["x"], "a.png", { type: "image/png" }));
    expect(res.path).toMatch(/^u1\/.+\.png$/);
    expect(res.signedUrl).toBe("https://s/u");
  });
  it("prefix 적용", async () => {
    const res = await uploadInvitationImage("u1", new File(["x"], "a.png"), { prefix: "qr" });
    expect(res.path).toMatch(/^u1\/qr-.+\.png$/);
  });
  it("fallbackExt 적용(확장자 토큰이 빈 이름)", async () => {
    // "a." → split(".").pop() === "" (falsy) → fallbackExt 사용
    const res = await uploadInvitationImage("u1", new File(["x"], "a."), { fallbackExt: "png" });
    expect(res.path).toMatch(/\.png$/);
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadInvitationImage("u1", new File(["x"], "a.png"))).rejects.toThrow("up");
  });
});

describe("invitationImageUrl / invitationViewerUrl", () => {
  it("서명 URL 반환", async () => {
    expect(await invitationImageUrl("p")).toBe("https://s/u");
    expect(await invitationViewerUrl("p")).toBe("https://s/u");
  });
  it("실패 시 null", async () => {
    h.createSigned.mockResolvedValue({ data: null, error: new Error("e") });
    expect(await invitationImageUrl("p")).toBeNull();
  });
});

describe("uploadGuestPhoto / removeGuestPhoto", () => {
  it("업로드 성공", async () => {
    await expect(uploadGuestPhoto("p", new File(["x"], "a.jpg"))).resolves.toBeUndefined();
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadGuestPhoto("p", new File(["x"], "a.jpg"))).rejects.toThrow("up");
  });
  it("삭제는 에러 흡수", async () => {
    h.remove.mockRejectedValue(new Error("rm"));
    await expect(removeGuestPhoto("p")).resolves.toBeUndefined();
  });
});

describe("guestPhotoSignedUrls", () => {
  it("URL 배열 반환(실패는 null)", async () => {
    h.createSignedUrls.mockResolvedValue({
      data: [{ signedUrl: "https://s/1" }, { signedUrl: null }],
      error: null,
    });
    expect(await guestPhotoSignedUrls(["p1", "p2"])).toEqual(["https://s/1", null]);
  });
  it("data 없으면 빈 배열", async () => {
    h.createSignedUrls.mockResolvedValue({ data: null, error: null });
    expect(await guestPhotoSignedUrls(["p1"])).toEqual([]);
  });
});
