// 웨딩 갤러리(places) 데이터 접근 레이어 (Task #3 — consumer 도메인).
// 패턴: docs/data-access-layer.md. Gallery 페이지가 직접 호출하던 활성 업체
// 대표 이미지 조회를 추출한다. 큐레이션 정렬(partner_rank 우선)을 유지한다.

import { supabase } from "@/integrations/supabase/client";

export interface GalleryPlace {
  place_id: string;
  name: string;
  category: string;
  main_image_url: string | null;
}

export const galleryKeys = {
  all: ["consumer", "gallery"] as const,
  places: () => [...galleryKeys.all, "places"] as const,
};

/**
 * 갤러리용 활성 업체 목록(대표 이미지 있는 것만, partner_rank 우선 정렬, 최대 30).
 * 제휴 등급 우선 큐레이션 + main_image_url 존재 항목만 필터. 에러 시 throw.
 */
export async function fetchGalleryPlaces(): Promise<GalleryPlace[]> {
  const { data, error } = await supabase
    .from("places")
    .select("place_id, name, category, main_image_url")
    .eq("is_active", true)
    .not("main_image_url", "is", null)
    .order("partner_rank", { ascending: false, nullsFirst: false })
    .limit(30);
  if (error) throw error;
  return ((data ?? []) as unknown as GalleryPlace[]).filter((p) => p.main_image_url);
}
