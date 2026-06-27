// 업체(place) 편집 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminPlaceEdit 의 places 조회/수정 + 등록 콘텐츠 요약 카운트를
// 여기로 모은다. places/business_*/place_media 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface PlaceRow {
  place_id: string;
  category: string;
  name: string;
  city: string | null;
  district: string | null;
  min_price: number | null;
  description: string | null;
  tags: string[] | null;
  main_image_url: string | null;
  lat: number | null;
  lng: number | null;
  is_active: boolean | null;
  is_partner: boolean | null;
  updated_at: string | null;
}

export interface PlaceContentSummary {
  products: { name: string; price: number | null }[];
  events: number;
  media: number;
}

const PLACE_SELECT =
  "place_id, category, name, city, district, min_price, description, tags, main_image_url, lat, lng, is_active, is_partner, updated_at";

export const placeEditKeys = {
  all: ["admin", "placeEdit"] as const,
  detail: (id: string) => [...placeEditKeys.all, id] as const,
  summary: (id: string) => [...placeEditKeys.all, id, "summary"] as const,
};

/** 단일 업체 조회. 없으면 null. 에러 시 throw. */
export async function fetchPlace(id: string): Promise<PlaceRow | null> {
  const { data, error } = await supabase.from("places").select(PLACE_SELECT).eq("place_id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as PlaceRow) ?? null;
}

/** 등록 콘텐츠 요약(상품 목록 + 이벤트/사진 수). 읽기전용 — 실패해도 화면 영향 없게 호출부가 처리. */
export async function fetchPlaceContentSummary(id: string): Promise<PlaceContentSummary> {
  const [pr, ev, md] = await Promise.all([
    supabase.from("business_products").select("name, price").eq("place_id", id).order("created_at", { ascending: false }),
    supabase.from("business_events").select("id", { count: "exact", head: true }).eq("place_id", id),
    supabase.from("place_media").select("id", { count: "exact", head: true }).eq("place_id", id),
  ]);
  return {
    products: (pr.data ?? []) as { name: string; price: number | null }[],
    events: ev.count ?? 0,
    media: md.count ?? 0,
  };
}

/** 업체 수정. 에러 시 throw. */
export async function updatePlace(id: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("places").update(payload as never).eq("place_id", id);
  if (error) throw error;
}
