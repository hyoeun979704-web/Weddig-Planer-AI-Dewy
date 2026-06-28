import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ createSigned: vi.fn(), upload: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: (...a: unknown[]) => h.createSigned(...a),
        upload: (...a: unknown[]) => h.upload(...a),
      }),
    },
  },
}));

import { createSignedUrl, uploadToBucket, SIGNED_URL_TTL } from "./storage";

beforeEach(() => {
  h.createSigned.mockReset();
  h.upload.mockReset();
});

describe("createSignedUrl", () => {
  it("signedUrl 반환", async () => {
    h.createSigned.mockResolvedValue({ data: { signedUrl: "https://x/y" }, error: null });
    expect(await createSignedUrl("b", "p", 100)).toBe("https://x/y");
  });
  it("data 없으면 null", async () => {
    h.createSigned.mockResolvedValue({ data: null, error: new Error("x") });
    expect(await createSignedUrl("b", "p", 100)).toBeNull();
  });
});

describe("uploadToBucket", () => {
  it("기본 upsert=false 로 업로드", async () => {
    h.upload.mockResolvedValue({ error: null });
    await uploadToBucket("b", "p", new Blob(["x"]), { contentType: "image/png" });
    expect(h.upload).toHaveBeenCalledWith("p", expect.anything(), { upsert: false, contentType: "image/png" });
  });
  it("에러 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadToBucket("b", "p", new Blob(["x"]))).rejects.toThrow("up");
  });
});

describe("SIGNED_URL_TTL", () => {
  it("preview=2h, day=24h", () => {
    expect(SIGNED_URL_TTL.preview).toBe(7200);
    expect(SIGNED_URL_TTL.day).toBe(86400);
  });
});
