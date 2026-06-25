import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ fromImpl: vi.fn(), uploadImpl: vi.fn(), getPublicUrlImpl: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...a: unknown[]) => h.fromImpl(...a),
    storage: { from: () => ({ upload: (...a: unknown[]) => h.uploadImpl(...a), getPublicUrl: (...a: unknown[]) => h.getPublicUrlImpl(...a) }) },
  },
}));

import {
  fetchTemplatesAndFonts,
  saveTemplate,
  uploadTemplateBlob,
  invitationTemplateKeys,
} from "./invitationTemplates";

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

describe("invitationTemplateKeys", () => {
  it("list 키를 만든다", () => {
    expect(invitationTemplateKeys.list()).toEqual(["admin", "invitationTemplates", "list"]);
  });
});

describe("fetchTemplatesAndFonts", () => {
  it("템플릿·폰트를 모으고 에러 플래그를 분리한다", async () => {
    h.fromImpl.mockImplementation((t: string) =>
      t === "invitation_templates"
        ? builder({ data: [{ id: "t1" }], error: null })
        : builder({ data: [{ id: "f1" }], error: null }),
    );
    const r = await fetchTemplatesAndFonts();
    expect(r.templates).toEqual([{ id: "t1" }]);
    expect(r.fonts).toEqual([{ id: "f1" }]);
    expect(r.templatesError).toBe(false);
    expect(r.fontsError).toBe(false);
  });

  it("템플릿 실패는 templatesError=true, 폰트 실패는 fontsError=true 로 분리", async () => {
    h.fromImpl.mockImplementation((t: string) =>
      t === "invitation_templates"
        ? builder({ data: null, error: new Error("tpl fail") })
        : builder({ data: null, error: new Error("fnt fail") }),
    );
    const r = await fetchTemplatesAndFonts();
    expect(r.templatesError).toBe(true);
    expect(r.fontsError).toBe(true);
    expect(r.templates).toEqual([]);
    expect(r.fonts).toEqual([]);
  });
});

describe("saveTemplate", () => {
  it("editingId 있으면 update 경로", async () => {
    let used = "";
    h.fromImpl.mockReturnValue(
      Object.assign(builder({ error: null }), {
        update: () => {
          used = "update";
          return builder({ error: null });
        },
        insert: () => {
          used = "insert";
          return builder({ error: null });
        },
      }),
    );
    await saveTemplate("id-1", { name: "x" });
    expect(used).toBe("update");
  });

  it("editingId 없으면 insert 경로", async () => {
    let used = "";
    h.fromImpl.mockReturnValue(
      Object.assign(builder({ error: null }), {
        update: () => { used = "update"; return builder({ error: null }); },
        insert: () => { used = "insert"; return builder({ error: null }); },
      }),
    );
    await saveTemplate(null, { name: "x" });
    expect(used).toBe("insert");
  });

  it("에러 시 throw", async () => {
    h.fromImpl.mockReturnValue(builder({ error: new Error("save fail") }));
    await expect(saveTemplate(null, {})).rejects.toThrow("save fail");
  });
});

describe("uploadTemplateBlob", () => {
  it("업로드 후 공개 URL 반환", async () => {
    h.uploadImpl.mockResolvedValue({ error: null });
    h.getPublicUrlImpl.mockReturnValue({ data: { publicUrl: "https://cdn/x.png" } });
    const blob = new Blob(["x"], { type: "image/png" });
    expect(await uploadTemplateBlob(blob)).toBe("https://cdn/x.png");
  });

  it("업로드 에러 시 throw", async () => {
    h.uploadImpl.mockResolvedValue({ error: new Error("upload fail") });
    await expect(uploadTemplateBlob(new Blob(["x"]))).rejects.toThrow("upload fail");
  });
});
