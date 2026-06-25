import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), uploadImpl: vi.fn(), getPublicUrlImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    storage: { from: () => ({ upload: (...a: unknown[]) => h.uploadImpl(...a), getPublicUrl: (...a: unknown[]) => h.getPublicUrlImpl(...a) }) },
  },
}));

import { fetchFonts, saveFont, uploadFontFile, invitationFontKeys } from "./invitationFonts";

const builder = (result: unknown) => {
  const b: Record<string, unknown> = {};
  Object.assign(b, {
    select: () => b,
    order: () => b,
    eq: () => b,
    update: () => b,
    insert: () => b,
    delete: () => b,
    then: (resolve: (v: unknown) => void) => resolve(result),
  });
  return b;
};

beforeEach(() => {
  h.fromImpl.mockReset();
  h.uploadImpl.mockReset();
  h.getPublicUrlImpl.mockReset();
});

describe("invitationFontKeys", () => {
  it("list 키", () => {
    expect(invitationFontKeys.list()).toEqual(["admin", "invitationFonts", "list"]);
  });
});

describe("fetchFonts", () => {
  it("데이터 반환", async () => {
    h.fromImpl.mockReturnValue(builder({ data: [{ id: "f1" }], error: null }));
    expect(await fetchFonts()).toEqual([{ id: "f1" }]);
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ data: null, error: new Error("fail") }));
    await expect(fetchFonts()).rejects.toThrow("fail");
  });
});

describe("saveFont", () => {
  it("editingId 있으면 update, 없으면 insert", async () => {
    let used = "";
    h.fromImpl.mockReturnValue(
      Object.assign(builder({ error: null }), {
        update: () => { used = "update"; return builder({ error: null }); },
        insert: () => { used = "insert"; return builder({ error: null }); },
      }),
    );
    await saveFont("id-1", { name: "x" });
    expect(used).toBe("update");
    await saveFont(null, { name: "x" });
    expect(used).toBe("insert");
  });
  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("save fail") }));
    await expect(saveFont(null, {})).rejects.toThrow("save fail");
  });
});

describe("uploadFontFile", () => {
  it("업로드 후 공개 URL 반환", async () => {
    h.uploadImpl.mockResolvedValue({ error: null });
    h.getPublicUrlImpl.mockReturnValue({ data: { publicUrl: "https://cdn/f.woff2" } });
    const file = new File(["x"], "f.woff2", { type: "font/woff2" });
    expect(await uploadFontFile(file, "woff2", "font/woff2")).toBe("https://cdn/f.woff2");
  });
  it("업로드 에러 시 throw", async () => {
    h.uploadImpl.mockResolvedValue({ error: new Error("upload fail") });
    await expect(uploadFontFile(new File(["x"], "f.ttf"), "ttf", "font/ttf")).rejects.toThrow("upload fail");
  });
});
