import { describe, it, expect, vi, beforeEach } from "vitest";

// 다단계 체인(.select().eq().order()... )은 thenable 빌더로 흉내낸다.
// 각 빌더는 마지막에 resolve 할 결과를 들고 다니고, 종결 메서드 호출이나 await 시 그 결과를 반환.
const h = vi.hoisted(() => ({
  // from(table) 별로 다음에 resolve 할 결과를 큐로 보관.
  results: {} as Record<string, unknown[]>,
  insert: vi.fn(),
  getPublicUrl: vi.fn(),
}));

function nextResult(table: string): unknown {
  const q = h.results[table];
  if (q && q.length > 0) return q.shift();
  return { data: null, error: null };
}

vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (table: string) => {
    let settled: unknown | undefined;
    const resolve = () => {
      if (settled === undefined) settled = nextResult(table);
      return settled;
    };
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    // 체인 메서드(결과를 누적하지 않고 동일 빌더 반환).
    for (const m of ["select", "eq", "is", "contains", "gte", "lte", "ilike", "or", "in", "order", "limit"]) {
      builder[m] = chain;
    }
    // 종결 메서드.
    builder.single = () => Promise.resolve(resolve());
    builder.maybeSingle = () => Promise.resolve(resolve());
    builder.insert = (...a: unknown[]) => h.insert(...a);
    // await 가능하게 thenable.
    builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve(resolve()).then(onF, onR);
    return builder;
  };
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      storage: {
        from: () => ({ getPublicUrl: (...a: unknown[]) => h.getPublicUrl(...a) }),
      },
    },
  };
});

import {
  fetchStoreProducts,
  fetchFeaturedProducts,
  trackProductClick,
  fetchStoreProduct,
  fetchBusinessProductDetail,
  fetchBusinessEventDetail,
  fetchDownloadedCoupons,
  fetchPlacesByTag,
  vendorPublicUrl,
} from "./shop";

// 특정 테이블의 다음 쿼리 결과를 등록.
function queue(table: string, ...results: unknown[]) {
  h.results[table] = (h.results[table] ?? []).concat(results);
}

beforeEach(() => {
  h.results = {};
  h.insert.mockReset();
  h.getPublicUrl.mockReset();
  h.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://pub/x" } });
});

describe("vendorPublicUrl", () => {
  it("빈 값은 null", () => {
    expect(vendorPublicUrl(null)).toBeNull();
    expect(vendorPublicUrl(undefined)).toBeNull();
  });
  it("절대 URL 은 그대로", () => {
    expect(vendorPublicUrl("https://a/b.jpg")).toBe("https://a/b.jpg");
  });
  it("경로형은 public URL 로 변환", () => {
    expect(vendorPublicUrl("path/x.jpg")).toBe("https://pub/x");
  });
});

describe("fetchStoreProducts", () => {
  it("행 반환", async () => {
    queue("products", { data: [{ id: "p1" }], error: null });
    const res = await fetchStoreProducts({ tab: "all", sortMode: "popular" });
    expect(res).toEqual([{ id: "p1" }]);
  });
  it("data 없으면 빈 배열", async () => {
    queue("products", { data: null, error: null });
    const res = await fetchStoreProducts({
      tab: "self_wedding_dress",
      sortMode: "latest",
      category: "ring",
      priceRange: [10000, 200000],
      keywordLike: "kw",
    });
    expect(res).toEqual([]);
  });
});

describe("fetchFeaturedProducts", () => {
  it("persona 있으면 행 반환", async () => {
    queue("products", { data: [{ id: "f1" }], error: null });
    expect(await fetchFeaturedProducts("all", "romantic")).toEqual([{ id: "f1" }]);
  });
  it("persona 없고 탭 지정이면 빈 배열", async () => {
    queue("products", { data: null, error: null });
    expect(await fetchFeaturedProducts("dress", null)).toEqual([]);
  });
});

describe("trackProductClick", () => {
  it("insert 호출(fire-and-forget)", () => {
    trackProductClick("p1", "all");
    expect(h.insert).toHaveBeenCalledWith({ product_id: "p1", source_tab: "all" });
  });
});

describe("fetchStoreProduct", () => {
  it("단건 반환", async () => {
    queue("products", { data: { id: "p1", name: "A" }, error: null });
    expect(await fetchStoreProduct("p1")).toEqual({ id: "p1", name: "A" });
  });
  it("없으면 null", async () => {
    queue("products", { data: null, error: null });
    expect(await fetchStoreProduct("p1")).toBeNull();
  });
});

describe("fetchBusinessProductDetail", () => {
  it("상품+업체+관련 포트폴리오 반환", async () => {
    queue("business_products", {
      data: {
        id: "bp1",
        place_id: "pl1",
        name: "상품",
        price: 5000,
        description: "설명",
        image_url: "https://img/a.jpg",
        detail_images: ["https://img/b.jpg"],
      },
      error: null,
    });
    queue("places", { data: { name: "업체", main_image_url: "https://img/p.jpg", tel: "010", inquiry_phone: null }, error: null });
    queue("place_media_albums", { data: [{ id: "al1" }], error: null });
    queue("place_media", { data: [{ image_url: "https://img/m.jpg" }], error: null });
    const res = await fetchBusinessProductDetail("bp1");
    expect(res?.product.id).toBe("bp1");
    expect(res?.product.name).toBe("상품");
    expect(res?.product.detail_images).toEqual(["https://img/b.jpg"]);
    expect(res?.place?.name).toBe("업체");
    expect(res?.place?.tel).toBe("010");
    expect(res?.related).toEqual(["https://img/m.jpg"]);
  });
  it("앨범 없으면 related 빈 배열", async () => {
    queue("business_products", { data: { id: "bp2", place_id: "pl2", name: "x", image_url: null }, error: null });
    queue("places", { data: { name: "업체2", main_image_url: null, tel: null, inquiry_phone: null }, error: null });
    queue("place_media_albums", { data: [], error: null });
    const res = await fetchBusinessProductDetail("bp2");
    expect(res?.related).toEqual([]);
  });
  it("상품 없으면 null", async () => {
    queue("business_products", { data: null, error: null });
    expect(await fetchBusinessProductDetail("none")).toBeNull();
  });
  it("place_id 없으면 place=null", async () => {
    queue("business_products", { data: { id: "bp3", place_id: null, name: "y", image_url: null }, error: null });
    queue("place_media_albums", { data: [], error: null });
    const res = await fetchBusinessProductDetail("bp3");
    expect(res?.place).toBeNull();
  });
});

describe("fetchBusinessEventDetail", () => {
  it("이벤트+업체 반환", async () => {
    queue("business_events", {
      data: { id: "ev1", place_id: "pl1", title: "이벤트", description: "d", starts_at: "s", ends_at: "e", banner_image_url: "https://img/ban.jpg", detail_images: ["https://img/d.jpg"] },
      error: null,
    });
    queue("places", { data: { name: "업체", main_image_url: "https://img/p.jpg", category: "wedding_hall" }, error: null });
    const res = await fetchBusinessEventDetail("ev1");
    expect(res?.event.title).toBe("이벤트");
    expect(res?.place?.category).toBe("wedding_hall");
  });
  it("place_id 없으면 place=null", async () => {
    queue("business_events", { data: { id: "ev2", place_id: null, title: "t", detail_images: null }, error: null });
    const res = await fetchBusinessEventDetail("ev2");
    expect(res?.place).toBeNull();
  });
  it("이벤트 없으면 null", async () => {
    queue("business_events", { data: null, error: null });
    expect(await fetchBusinessEventDetail("none")).toBeNull();
  });
});

describe("fetchDownloadedCoupons", () => {
  it("행 반환", async () => {
    queue("coupon_downloads", { data: [{ id: "c1", created_at: "t", business_coupons: null }], error: null });
    expect(await fetchDownloadedCoupons("u1")).toEqual([{ id: "c1", created_at: "t", business_coupons: null }]);
  });
  it("에러 시 throw", async () => {
    queue("coupon_downloads", { data: null, error: new Error("e") });
    await expect(fetchDownloadedCoupons("u1")).rejects.toThrow("e");
  });
});

describe("fetchPlacesByTag", () => {
  it("행 반환", async () => {
    queue("places", { data: [{ place_id: "pl1", name: "A", category: "ring" }], error: null });
    const res = await fetchPlacesByTag("선물");
    expect(res).toEqual([{ place_id: "pl1", name: "A", category: "ring" }]);
  });
  it("에러 시 빈 배열", async () => {
    queue("places", { data: null, error: new Error("e") });
    expect(await fetchPlacesByTag("선물")).toEqual([]);
  });
});
