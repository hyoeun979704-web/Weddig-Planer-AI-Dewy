// 추천 상품 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminFeaturedProducts 의 products 조회/수정을 여기로 모은다.
// products 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";
import { escapeLikePattern } from "@/lib/postgrestEscape";

export interface FeaturedRow {
  id: string;
  name: string;
  thumbnail_url: string | null;
  price: number;
  sale_price: number | null;
  source: string;
  source_url: string | null;
  categories: string[];
  is_featured: boolean;
  featured_personas: string[];
}

export interface FeaturedFilters {
  page: number;
  pageSize: number;
  filterCategory: "all" | string;
  filterStatus: "all" | "on" | "off";
  keyword: string;
}

const FEATURED_SELECT =
  "id, name, thumbnail_url, price, sale_price, source, source_url, categories, is_featured, featured_personas";

export const featuredProductKeys = {
  all: ["admin", "featuredProducts"] as const,
  list: (f: FeaturedFilters) => [...featuredProductKeys.all, "list", f] as const,
};

/** 추천 상품 목록 조회(필터·페이지네이션). is_featured desc → created_at desc. */
export async function fetchFeaturedProducts(f: FeaturedFilters): Promise<{ rows: FeaturedRow[]; total: number }> {
  const from = f.page * f.pageSize;
  const to = from + f.pageSize - 1;
  let q = supabase
    .from("products")
    .select(FEATURED_SELECT, { count: "exact" })
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (f.filterCategory !== "all") q = q.contains("categories", [f.filterCategory]);
  if (f.filterStatus === "on") q = q.eq("is_featured", true);
  else if (f.filterStatus === "off") q = q.eq("is_featured", false);
  if (f.keyword.trim()) q = q.ilike("name", `%${escapeLikePattern(f.keyword.trim())}%`);

  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as FeaturedRow[], total: count ?? 0 };
}

/** 추천 상품 필드 수정(is_featured / featured_personas). 에러 시 throw. */
export async function updateFeaturedProduct(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("products").update(patch as never).eq("id", id);
  if (error) throw error;
}
