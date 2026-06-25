import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  order: vi.fn(),
  inFilter: vi.fn(),
  insert: vi.fn(),
  // update 체인 끝(.eq().eq()) — 마지막 eq 가 결과를 resolve.
  updateEnd: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => {
  // 쿼리 빌더: select/eq 는 자기 자신을 반환(체이닝), 종단부만 hoisted mock 으로.
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.order = (...a: unknown[]) => h.order(...a);
  builder.maybeSingle = (...a: unknown[]) => h.maybeSingle(...a);
  builder.in = (...a: unknown[]) => h.inFilter(...a);
  builder.insert = (...a: unknown[]) => h.insert(...a);
  // update 는 .eq().eq() 두 번 — 두 번째 eq 에서 resolve 하도록 별도 빌더.
  builder.update = () => {
    const u: Record<string, unknown> = {};
    let depth = 0;
    u.eq = () => {
      depth += 1;
      return depth >= 2 ? h.updateEnd() : u;
    };
    return u;
  };
  return {
    supabase: {
      from: () => builder,
      storage: {
        from: () => ({
          upload: (...a: unknown[]) => h.upload(...a),
        }),
      },
    },
  };
});

import {
  uploadQuoteImage,
  fetchPlaceName,
  fetchComparePlaces,
  fetchMyInquiries,
  createInquiry,
  updateInquiryFeedback,
  quotesKeys,
} from "./quotes";

beforeEach(() => {
  Object.values(h).forEach((m) => m.mockReset());
  h.upload.mockResolvedValue({ error: null });
});

describe("quotesKeys", () => {
  it("inquiriesPrefix 는 myInquiries 키의 prefix", () => {
    expect(quotesKeys.myInquiries("u1").slice(0, 3)).toEqual(quotesKeys.inquiriesPrefix);
  });
});

describe("uploadQuoteImage", () => {
  it("업로드 후 path 반환(userId/uuid.ext)", async () => {
    const file = new File(["x"], "photo.PNG", { type: "image/png" });
    const path = await uploadQuoteImage("u1", file);
    expect(path).toMatch(/^u1\/.+\.png$/);
  });
  it("업로드 실패 시 throw", async () => {
    h.upload.mockResolvedValue({ error: new Error("up") });
    await expect(uploadQuoteImage("u1", new File(["x"], "a.jpg"))).rejects.toThrow("up");
  });
});

describe("fetchPlaceName", () => {
  it("이름 반환", async () => {
    h.maybeSingle.mockResolvedValue({ data: { name: "스튜디오A" } });
    expect(await fetchPlaceName("p1")).toBe("스튜디오A");
  });
  it("없으면 빈 문자열", async () => {
    h.maybeSingle.mockResolvedValue({ data: null });
    expect(await fetchPlaceName("p1")).toBe("");
  });
});

describe("fetchComparePlaces", () => {
  it("빈 입력은 쿼리 없이 []", async () => {
    expect(await fetchComparePlaces([])).toEqual([]);
    expect(h.inFilter).not.toHaveBeenCalled();
  });
  it("메타 행 반환", async () => {
    h.inFilter.mockResolvedValue({ data: [{ place_id: "p1", name: "A", main_image_url: null }] });
    expect(await fetchComparePlaces(["p1"])).toEqual([
      { place_id: "p1", name: "A", main_image_url: null },
    ]);
  });
  it("data null 이면 []", async () => {
    h.inFilter.mockResolvedValue({ data: null });
    expect(await fetchComparePlaces(["p1"])).toEqual([]);
  });
});

describe("fetchMyInquiries", () => {
  it("userId 없으면 [] (쿼리 미실행)", async () => {
    expect(await fetchMyInquiries(undefined)).toEqual([]);
    expect(h.order).not.toHaveBeenCalled();
  });
  it("행 반환", async () => {
    h.order.mockResolvedValue({ data: [{ id: "i1", feedback: "up" }], error: null });
    const rows = await fetchMyInquiries("u1");
    expect(rows).toEqual([{ id: "i1", feedback: "up" }]);
  });
  it("에러 시 throw", async () => {
    h.order.mockResolvedValue({ data: null, error: new Error("e") });
    await expect(fetchMyInquiries("u1")).rejects.toThrow("e");
  });
});

describe("createInquiry", () => {
  it("성공 시 resolve", async () => {
    h.insert.mockResolvedValue({ error: null });
    await expect(
      createInquiry({ userId: "u1", category: "c", title: "t", content: "b" }),
    ).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.insert.mockResolvedValue({ error: new Error("ins") });
    await expect(
      createInquiry({ userId: "u1", category: "c", title: "t", content: "b" }),
    ).rejects.toThrow("ins");
  });
});

describe("updateInquiryFeedback", () => {
  it("성공 시 resolve", async () => {
    h.updateEnd.mockResolvedValue({ error: null });
    await expect(
      updateInquiryFeedback({ id: "i1", userId: "u1", feedback: "up" }),
    ).resolves.toBeUndefined();
  });
  it("에러 시 throw", async () => {
    h.updateEnd.mockResolvedValue({ error: new Error("upd") });
    await expect(
      updateInquiryFeedback({ id: "i1", userId: "u1", feedback: null }),
    ).rejects.toThrow("upd");
  });
});
