// 업체 목록(places) 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminPlaces 의 목록 조회(필터·검색·페이지)를 모은다.
// places 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";
import { escapeLikePattern, quoteForOr } from "@/lib/postgrestEscape";

export interface PlaceRow {
  place_id: string;
  category: string;
  name: string;
  city: string | null;
  district: string | null;
  main_image_url: string | null;
  is_active: boolean | null;
  is_partner: boolean | null;
  updated_at: string | null;
}

export interface PlacesListFilters {
  category: "all" | string;
  missingImageOnly: boolean;
  inactiveOnly: boolean;
  search: string;
  page: number;
  pageSize: number;
}

export const adminPlacesKeys = {
  all: ["admin", "places"] as const,
  list: (f: PlacesListFilters) => [...adminPlacesKeys.all, "list", f] as const,
};

const PLACES_SELECT = "place_id, category, name, city, district, main_image_url, is_active, is_partner, updated_at";

/** 업체 목록(카테고리·이미지없음·비활성·검색 필터 + 페이지네이션). 에러 시 throw. */
export async function fetchPlacesList(f: PlacesListFilters): Promise<{ rows: PlaceRow[]; total: number }> {
  let q = supabase.from("places").select(PLACES_SELECT, { count: "exact" });
  if (f.category !== "all") q = q.eq("category", f.category);
  if (f.missingImageOnly) q = q.is("main_image_url", null);
  if (f.inactiveOnly) q = q.eq("is_active", false);
  else q = q.eq("is_active", true);
  if (f.search) {
    // name/city ILIKE — LIKE 와일드카드·.or() 파서 양쪽에서 살균(인젝션/오작동 방지).
    const term = quoteForOr(`%${escapeLikePattern(f.search)}%`);
    q = q.or(`name.ilike.${term},city.ilike.${term}`);
  }
  q = q
    .order("updated_at", { ascending: false, nullsFirst: false })
    .range(f.page * f.pageSize, f.page * f.pageSize + f.pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as PlaceRow[], total: count ?? 0 };
}
