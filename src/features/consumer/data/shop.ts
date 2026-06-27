// 쇼핑/상품/이벤트/쿠폰 데이터 접근 레이어 (Task #3 — consumer 도메인).
// 패턴: docs/data-access-layer.md · dressFitting.ts. Store·ProductDetail·ProductDetailPage·
// EventDetailPage·Coupons·TagResults 가 공유하는 product/store/event/coupon 읽기를 모은다.
// 큐레이션 게이트(활성·정렬·페르소나 매칭)는 호출 의미를 보존한 채 그대로 이전했다.
// 표시/포맷 매퍼(priceFormat·placeMappers·storeCategories)는 페이지에 남겨 중복을 막는다.

import { supabase } from "@/integrations/supabase/client";

// products 컬럼은 types.ts 에 전부 존재 → 타입 셀렉트 후 반환 데이터를 도메인 타입으로 캐스팅.
const PRODUCT_LIST_COLUMNS =
  "id, name, short_description, category, categories, price, sale_price, thumbnail_url, rating, review_count, sold_count, is_featured, source, source_url, source_mall";
const PRODUCT_FEATURED_COLUMNS = `${PRODUCT_LIST_COLUMNS}, featured_personas`;

// vendor-images 는 공개 버킷 — 경로형 레거시 행 방어용 public URL 변환.
const VENDOR_BUCKET = "vendor-images";

export interface StoreProduct {
  id: string;
  name: string;
  short_description: string | null;
  category: string | null;
  categories: string[] | null;
  price: number;
  sale_price: number | null;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  sold_count: number;
  is_featured: boolean;
  source: string;
  source_url: string | null;
  source_mall: string | null;
}

/** Store 목록 쿼리 옵션 — 페이지의 탭/필터/정렬을 그대로 표현. */
export interface StoreListOptions {
  /** "all" 이면 카테고리 필터 없음, 아니면 categories[] contains 매칭. */
  tab: string;
  sortMode: "popular" | string;
  /** 고급 필터 — categories[] contains 매칭. */
  category?: string | null;
  /** [min, max]. min>0 / max<500000 일 때만 적용. */
  priceRange?: [number, number];
  /** name ILIKE 매칭(이미 escape 된 패턴 문자열). */
  keywordLike?: string | null;
}

export interface BusinessProductDetail {
  id: string;
  place_id: string;
  name: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  detail_images: string[];
}

export interface ProductPlaceInfo {
  name: string | null;
  main_image_url: string | null;
  /** inquiry_phone ?? tel — 호출부가 우선순위 결정. */
  inquiry_phone: string | null;
  tel: string | null;
}

export interface BusinessEventDetail {
  id: string;
  place_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  banner_image_url: string | null;
  detail_images: string[] | null;
}

export interface EventPlaceInfo {
  name: string | null;
  main_image_url: string | null;
  category: string | null;
}

export interface DownloadedCouponRow {
  id: string;
  created_at: string;
  business_coupons: {
    title: string;
    discount_text: string;
    min_order_won: number | null;
    expires_at: string | null;
  } | null;
}

export interface TagPlaceRow {
  place_id: string;
  name: string;
  main_image_url: string | null;
  city: string | null;
  district: string | null;
  category: string;
  is_partner: boolean | null;
}

export const shopKeys = {
  all: ["consumer", "shop"] as const,
  list: (opts: StoreListOptions) => [...shopKeys.all, "list", opts] as const,
  featured: (tab: string, persona: string | null) =>
    [...shopKeys.all, "featured", tab, persona] as const,
  product: (id: string) => [...shopKeys.all, "product", id] as const,
  businessProduct: (id: string) => [...shopKeys.all, "businessProduct", id] as const,
  event: (id: string) => [...shopKeys.all, "event", id] as const,
  coupons: (userId: string) => [...shopKeys.all, "coupons", userId] as const,
  tag: (tag: string) => [...shopKeys.all, "tag", tag] as const,
};

/** vendor-images 공개 버킷 URL 변환(절대 URL 은 그대로, 경로형은 public URL). 실패 시 원본. */
export function vendorPublicUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try {
    return supabase.storage.from(VENDOR_BUCKET).getPublicUrl(url).data.publicUrl || url;
  } catch {
    return url;
  }
}

/** Store 상품 목록 — 활성·탭/필터·정렬(인기=sold_count, 그외 created_at). 에러는 빈 배열로 흡수(목록 비핵심). */
export async function fetchStoreProducts(opts: StoreListOptions): Promise<StoreProduct[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_LIST_COLUMNS)
    .eq("is_active", true)
    .order(opts.sortMode === "popular" ? "sold_count" : "created_at", { ascending: false });

  if (opts.tab !== "all") {
    query = query.contains("categories", [opts.tab]);
  }
  if (opts.category) {
    query = query.contains("categories", [opts.category]);
  }
  const [min, max] = opts.priceRange ?? [0, 500000];
  if (min > 0) {
    query = query.gte("price", min);
  }
  if (max < 500000) {
    query = query.lte("price", max);
  }
  if (opts.keywordLike) {
    query = query.ilike("name", `%${opts.keywordLike}%`);
  }

  const { data } = await query;
  return (data ?? []) as unknown as StoreProduct[];
}

/**
 * 추천 띠 상품 — 활성·추천(is_featured)·탭 매칭, 최대 8개.
 * featured_personas 가 빈 배열(전체 대상)이거나 사용자 persona 가 포함될 때만 노출.
 */
export async function fetchFeaturedProducts(
  tab: string,
  persona: string | null,
): Promise<StoreProduct[]> {
  let query = supabase
    .from("products")
    .select(PRODUCT_FEATURED_COLUMNS)
    .eq("is_active", true)
    .eq("is_featured", true)
    .limit(8);

  if (tab !== "all") {
    query = query.contains("categories", [tab]);
  }
  const orFilter = persona
    ? `featured_personas.eq.{},featured_personas.cs.{${persona}}`
    : "featured_personas.eq.{}";
  query = query.or(orFilter);

  const { data } = await query;
  return (data ?? []) as unknown as StoreProduct[];
}

/** 상품 클릭 트래킹 — fire-and-forget. 실패해도 UX 영향 없어 await 하지 않는다. */
export function trackProductClick(productId: string, sourceTab: string): void {
  void supabase.from("product_clicks").insert({ product_id: productId, source_tab: sourceTab });
}

/** 자체몰 상품 단건(전 컬럼) — 없으면 null. */
export async function fetchStoreProduct(id: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return (data as Record<string, unknown> | null) ?? null;
}

/**
 * 업체 상품(business_products) 단건 + 업체 정보 + 관련 포트폴리오를 한 번에.
 * 업체 조회와 포트폴리오 조회는 서로 독립이라 병렬로 묶어 라운드트립을 줄인다.
 * detail_images 는 types.ts 미반영 컬럼이라 select("*") 후 동적 접근.
 */
export async function fetchBusinessProductDetail(
  id: string,
): Promise<{ product: BusinessProductDetail; place: ProductPlaceInfo | null; related: string[] } | null> {
  // select("*") — 컬럼 드리프트 방어.
  const { data } = await supabase.from("business_products").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const placeId = (row.place_id as string) ?? null;

  const placePromise: Promise<{ data: Record<string, unknown> | null }> = placeId
    ? (supabase
        .from("places")
        .select("name, main_image_url, tel, inquiry_phone" as never)
        .eq("place_id", placeId)
        .maybeSingle() as unknown as Promise<{ data: Record<string, unknown> | null }>)
    : Promise.resolve({ data: null });

  // 관련 포트폴리오 = 이 상품에 연결된 앨범의 사진들.
  const relatedPromise = (async (): Promise<string[]> => {
    const { data: albs } = await supabase
      .from("place_media_albums")
      .select("id")
      .eq("product_id", id);
    const albumIds = (albs ?? []).map((a) => (a as { id: string }).id);
    if (albumIds.length === 0) return [];
    const { data: md } = await supabase
      .from("place_media")
      .select("image_url, album_id, display_order")
      .in("album_id", albumIds)
      .order("display_order", { ascending: true });
    return ((md ?? []) as { image_url: string | null }[])
      .map((m) => vendorPublicUrl(m.image_url))
      .filter(Boolean) as string[];
  })();

  const [{ data: pl }, related] = await Promise.all([placePromise, relatedPromise]);
  const place: ProductPlaceInfo | null = pl
    ? {
        name: (pl.name as string) ?? null,
        main_image_url: (pl.main_image_url as string) ?? null,
        inquiry_phone: (pl.inquiry_phone as string) ?? null,
        tel: (pl.tel as string) ?? null,
      }
    : null;

  const product: BusinessProductDetail = {
    id: row.id as string,
    place_id: placeId,
    name: row.name as string,
    price: (row.price as number) ?? null,
    description: (row.description as string) ?? null,
    image_url: vendorPublicUrl((row.image_url as string) ?? null),
    detail_images: (((row.detail_images as string[]) ?? []) as string[])
      .map((u) => vendorPublicUrl(u))
      .filter(Boolean) as string[],
  };

  return { product, place, related };
}

/**
 * 업체 이벤트(business_events) 단건 + (있으면) 업체 정보.
 * detail_images 등 컬럼 드리프트 방어로 select("*").
 */
export async function fetchBusinessEventDetail(
  id: string,
): Promise<{ event: BusinessEventDetail; place: EventPlaceInfo | null } | null> {
  const { data } = await supabase.from("business_events").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const placeId = (row.place_id as string) ?? null;

  let place: EventPlaceInfo | null = null;
  if (placeId) {
    const { data: p } = await supabase
      .from("places")
      .select("name, main_image_url, category")
      .eq("place_id", placeId)
      .maybeSingle();
    const pl = p as { name?: string; main_image_url?: string; category?: string } | null;
    place = {
      name: pl?.name ?? null,
      main_image_url: pl?.main_image_url ?? null,
      category: pl?.category ?? null,
    };
  }

  const event: BusinessEventDetail = {
    id: row.id as string,
    place_id: placeId,
    title: row.title as string,
    description: (row.description as string) ?? null,
    starts_at: (row.starts_at as string) ?? null,
    ends_at: (row.ends_at as string) ?? null,
    banner_image_url: (row.banner_image_url as string) ?? null,
    detail_images: ((row.detail_images as string[]) ?? null) as string[] | null,
  };

  return { event, place };
}

/** 내가 받은(다운로드한) 업체 쿠폰함(최신순). 에러 시 throw. user 없으면 빈 배열. */
export async function fetchDownloadedCoupons(userId: string): Promise<DownloadedCouponRow[]> {
  const { data, error } = await supabase
    .from("coupon_downloads")
    .select("id, created_at, business_coupons(title, discount_text, min_order_won, expires_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DownloadedCouponRow[];
}

/** 같은 태그 업체 목록 — 활성·미삭제·tags contains, 파트너 우선→조회수 순(최대 60). 에러는 빈 배열. */
export async function fetchPlacesByTag(tag: string): Promise<TagPlaceRow[]> {
  const { data, error } = await supabase
    .from("places")
    .select("place_id, name, main_image_url, city, district, category, is_partner")
    .eq("is_active", true)
    .is("deleted_at", null)
    .contains("tags", [tag])
    .order("partner_rank", { ascending: false, nullsFirst: false })
    .order("view_count", { ascending: false })
    .limit(60);
  if (error || !data) return [];
  return data as unknown as TagPlaceRow[];
}
