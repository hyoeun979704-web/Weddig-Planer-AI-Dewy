// 기업 갤러리(place_media·앨범) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessGallery 의 미디어·앨범·상품 조회 + 추가/삭제를 모은다.
// 테이블 모두 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface MediaItem {
  id: string;
  kind: string;
  image_url: string | null;
  title: string | null;
  price: number | null;
  album_id: string | null;
}

export interface Album {
  id: string;
  title: string;
  shoot_date: string | null;
  venue_name: string | null;
  style_tags: string[] | null;
  product_id: string | null;
}

export interface ProductOpt {
  id: string;
  name: string;
}

export const galleryKeys = {
  all: ["partners", "gallery"] as const,
  place: (placeId: string) => [...galleryKeys.all, placeId] as const,
};

/** 한 업체의 미디어·앨범·상품(앨범 연결용)을 병렬 조회. 에러 시 throw. */
export async function fetchGalleryData(placeId: string): Promise<{
  media: MediaItem[];
  albums: Album[];
  products: ProductOpt[];
}> {
  const [mediaRes, albumRes, prodRes] = await Promise.all([
    supabase
      .from("place_media")
      .select("id, kind, image_url, title, price, album_id")
      .eq("place_id", placeId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("place_media_albums")
      .select("id, title, shoot_date, venue_name, style_tags, product_id")
      .eq("place_id", placeId)
      .order("created_at", { ascending: false }),
    supabase.from("business_products").select("id, name").eq("place_id", placeId).order("created_at", { ascending: false }),
  ]);
  if (mediaRes.error) throw mediaRes.error;
  if (albumRes.error) throw albumRes.error;
  if (prodRes.error) throw prodRes.error;
  return {
    media: (mediaRes.data ?? []) as unknown as MediaItem[],
    albums: (albumRes.data ?? []) as unknown as Album[],
    products: (prodRes.data ?? []) as unknown as ProductOpt[],
  };
}

/** 앨범 생성. 생성된 앨범 id 반환. 에러/빈 응답 시 throw. */
export async function createAlbum(payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.from("place_media_albums").insert(payload as never).select("id").single();
  if (error || !data) throw error ?? new Error("앨범 생성 응답이 비었어요");
  return (data as { id: string }).id;
}

/** 미디어(사진/메뉴) 추가. 에러 시 throw. */
export async function addMedia(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("place_media").insert(payload as never);
  if (error) throw error;
}

/** 미디어 삭제. 에러 시 throw. */
export async function deleteMedia(id: string): Promise<void> {
  const { error } = await supabase.from("place_media").delete().eq("id", id);
  if (error) throw error;
}
