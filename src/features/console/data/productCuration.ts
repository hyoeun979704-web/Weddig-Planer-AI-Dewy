// 상품 큐레이션 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminProductCuration 페이지의 raw supabase(15 call-sites,
// (supabase as any) 캐스트 다수)를 여기로 모은다. products/product_seed_keywords/product_blocklist
// 는 #434 types 재생성으로 타입에 존재 → 캐스트 제거하고 타입 복원. React 비의존(테스트 가능).

import { supabase } from "@/integrations/supabase/client";
import { escapeLikePattern } from "@/lib/postgrestEscape";

export interface SearchResult {
  source: "naver" | "coupang";
  source_product_id: string;
  name: string;
  short_description: string | null;
  thumbnail_url: string | null;
  price: number;
  sale_price: number | null;
  source_url: string;
  source_mall: string | null;
  raw: unknown;
}

export interface PoolProduct {
  id: string;
  name: string;
  short_description: string | null;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  source: string;
  source_url: string | null;
  source_mall: string | null;
  source_product_id: string | null;
  categories: string[];
  stale_reason: string | null;
  last_resynced_at: string | null;
  click_count?: number;
}

export interface SeedRow {
  id: string;
  category: string;
  keyword: string;
}

export interface PoolFilters {
  page: number;
  pageSize: number;
  filterSource: "all" | string;
  filterActive: "all" | "on" | "off";
  filterCategory: "all" | string;
  keyword: string;
}

export interface ResyncResult {
  scanned: number;
  updated: number;
  deactivated: number;
  errors: unknown[];
}

export interface BatchCollectResult {
  totalFetched: number;
  candidates: number;
  blocked: number;
  inserted: number;
  duplicates: number;
  errors: unknown[];
}

const POOL_SELECT =
  "id, name, short_description, description, thumbnail_url, price, sale_price, is_active, is_featured, source, source_url, source_mall, source_product_id, categories, stale_reason, last_resynced_at";

export const PRODUCT_CLICK_DAYS = 7;

export const productCurationKeys = {
  all: ["admin", "productCuration"] as const,
  pool: (f: PoolFilters) => [...productCurationKeys.all, "pool", f] as const,
  seeds: () => [...productCurationKeys.all, "seeds"] as const,
};

/** 상품 풀 조회(필터·페이지네이션) + 최근 7일 클릭수 enrich. */
export async function fetchProductPool(f: PoolFilters): Promise<{ products: PoolProduct[]; total: number }> {
  const from = f.page * f.pageSize;
  const to = from + f.pageSize - 1;
  let q = supabase
    .from("products")
    .select(POOL_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (f.filterSource !== "all") q = q.eq("source", f.filterSource);
  if (f.filterActive === "on") q = q.eq("is_active", true);
  else if (f.filterActive === "off") q = q.eq("is_active", false);
  if (f.filterCategory !== "all") q = q.contains("categories", [f.filterCategory]);
  if (f.keyword.trim()) q = q.ilike("name", `%${escapeLikePattern(f.keyword.trim())}%`);

  const [poolRes, clickRes] = await Promise.all([
    q,
    supabase.rpc("product_click_counts", { p_days: PRODUCT_CLICK_DAYS }),
  ]);
  if (poolRes.error) throw poolRes.error;

  const clickMap = new Map<string, number>(
    ((clickRes.data as Array<{ product_id: string; click_count: number }>) ?? []).map((r) => [
      r.product_id,
      Number(r.click_count) || 0,
    ]),
  );
  const products = ((poolRes.data as unknown as PoolProduct[]) ?? []).map((p) => ({
    ...p,
    click_count: clickMap.get(p.id) ?? 0,
  }));
  return { products, total: poolRes.count ?? 0 };
}

/** 활성 시드 키워드 목록(카테고리·키워드 정렬). */
export async function fetchSeedKeywords(): Promise<SeedRow[]> {
  const { data, error } = await supabase
    .from("product_seed_keywords")
    .select("id, category, keyword")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("keyword", { ascending: true });
  if (error) throw error;
  return (data as unknown as SeedRow[]) ?? [];
}

/** 시드 키워드 추가(중복은 upsert). 추가된 행 반환(없으면 null). */
export async function upsertSeedKeyword(category: string, keyword: string): Promise<SeedRow | null> {
  const { data, error } = await supabase
    .from("product_seed_keywords")
    .upsert({ category, keyword }, { onConflict: "category,keyword", ignoreDuplicates: false })
    .select("id, category, keyword")
    .single();
  if (error) throw error;
  return (data as unknown as SeedRow) ?? null;
}

export async function deleteSeedKeyword(id: string): Promise<void> {
  const { error } = await supabase.from("product_seed_keywords").delete().eq("id", id);
  if (error) throw error;
}

/** 외부 소스(네이버/쿠팡) 상품 검색 — product-search 엣지함수. */
export async function searchProducts(source: "naver" | "coupang", query: string): Promise<SearchResult[]> {
  const { data, error } = await supabase.functions.invoke("product-search", { body: { source, query } });
  if (error) throw error;
  return ((data as { items?: SearchResult[] })?.items) ?? [];
}

/** 단일 상품 수집(insert). 중복(23505)은 호출부에서 err.code 로 구분. */
export async function insertProduct(row: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("products").insert(row as never);
  if (error) throw error;
}

/** 검색결과 일괄 수집(중복 skip). 추가된 건수 반환. */
export async function bulkUpsertProducts(rows: Record<string, unknown>[]): Promise<number> {
  const { error, count } = await supabase
    .from("products")
    .upsert(rows as never, { onConflict: "source,source_product_id", ignoreDuplicates: true, count: "exact" });
  if (error) throw error;
  return typeof count === "number" ? count : rows.length;
}

export async function updateProduct(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("products").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteProductRow(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/** 외부 상품 거부 — 재수집 차단 blocklist 등록. */
export async function blockProduct(source: string, sourceProductId: string, reason = "admin_reject"): Promise<void> {
  const { error } = await supabase
    .from("product_blocklist")
    .upsert(
      { source, source_product_id: sourceProductId, reason } as never,
      { onConflict: "source,source_product_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** 노출 중 외부 상품 가격/품절/링크 재동기화 — product-resync 엣지함수. */
export async function resyncProducts(): Promise<ResyncResult> {
  const { data, error } = await supabase.functions.invoke("product-resync", { body: {} });
  if (error) throw error;
  return data as ResyncResult;
}

/** 전 카테고리 키워드 일괄 수집 — product-batch-collect 엣지함수. */
export async function batchCollectProducts(): Promise<BatchCollectResult> {
  const { data, error } = await supabase.functions.invoke("product-batch-collect", { body: {} });
  if (error) throw error;
  return data as BatchCollectResult;
}
