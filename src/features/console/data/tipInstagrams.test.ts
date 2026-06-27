import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), invokeImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    functions: { invoke: (...a: unknown[]) => h.invokeImpl(...a) },
  },
}));

import {
  fetchInstagramPosts,
  insertInstagramPost,
  collectReels,
  mirrorImage,
  tipInstagramKeys,
} from "./tipInstagrams";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    eq: () => b,
    insert: () => b,
    upsert: () => b,
    update: () => b,
    delete: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.invokeImpl.mockReset();
});

describe("tipInstagramKeys", () => {
  it("filter 별 posts 키와 accounts 키", () => {
    expect(tipInstagramKeys.posts("pending")).toEqual(["admin", "tipInstagrams", "posts", "pending"]);
    expect(tipInstagramKeys.accounts()).toEqual(["admin", "tipInstagrams", "accounts"]);
  });
});

describe("fetchInstagramPosts", () => {
  it("데이터를 반환한다", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "1" }], error: null }));
    expect(await fetchInstagramPosts("pending")).toEqual([{ id: "1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchInstagramPosts("all")).rejects.toThrow("fail");
  });
});

describe("insertInstagramPost", () => {
  it("중복 23505 코드를 보존해 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: Object.assign(new Error("dup"), { code: "23505" }) }));
    await expect(insertInstagramPost({ url: "x" })).rejects.toMatchObject({ code: "23505" });
  });
});

describe("collectReels", () => {
  it("정상 결과 반환", async () => {
    h.invokeImpl.mockResolvedValue({ data: { accounts: 2, total_new: 5 }, error: null });
    expect(await collectReels()).toEqual({ accounts: 2, total_new: 5 });
  });
  it("응답 본문의 error 도 throw", async () => {
    h.invokeImpl.mockResolvedValue({ data: { error: "token expired" }, error: null });
    await expect(collectReels()).rejects.toThrow("token expired");
  });
  it("전송 에러 throw", async () => {
    h.invokeImpl.mockResolvedValue({ data: null, error: new Error("net") });
    await expect(collectReels()).rejects.toThrow("net");
  });
});

describe("mirrorImage", () => {
  it("thumbnail_url 반환", async () => {
    h.invokeImpl.mockResolvedValue({ data: { thumbnail_url: "https://cdn/x.jpg" }, error: null });
    expect(await mirrorImage("https://src")).toBe("https://cdn/x.jpg");
  });
  it("edge 에러의 context.json hint 를 추출해 throw", async () => {
    const error = { message: "Edge Function returned 400", context: { json: async () => ({ hint: "이미지가 너무 커요" }) } };
    h.invokeImpl.mockResolvedValue({ data: null, error });
    await expect(mirrorImage("https://src")).rejects.toThrow("이미지가 너무 커요");
  });
  it("thumbnail_url 없으면 throw", async () => {
    h.invokeImpl.mockResolvedValue({ data: {}, error: null });
    await expect(mirrorImage("https://src")).rejects.toThrow("thumbnail_url");
  });
});
