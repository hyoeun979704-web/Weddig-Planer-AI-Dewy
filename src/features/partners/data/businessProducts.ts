// 기업 상품(business_products) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessProducts 의 상품 조회·등록·삭제를 모은다.
// business_products 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface ProductItem {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  moderation_status: string;
  moderation_note: string | null;
}

export interface NewProduct {
  place_id: string;
  owner_user_id: string;
  name: string;
  price: number | null;
  description: string | null;
  image_url: string | null;
  detail_images: string[];
}

export const businessProductKeys = {
  all: ["partners", "businessProducts"] as const,
  place: (placeId: string) => [...businessProductKeys.all, placeId] as const,
};

/** 한 업체의 상품 목록(최신순) 조회. 에러 시 throw. */
export async function fetchBusinessProducts(placeId: string): Promise<ProductItem[]> {
  const { data, error } = await supabase
    .from("business_products")
    .select("id, name, price, description, image_url, moderation_status, moderation_note")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProductItem[];
}

/** 상품 등록. 운영자 검토 대기 상태로 저장. 에러 시 throw. */
export async function addBusinessProduct(payload: NewProduct): Promise<void> {
  const { error } = await supabase.from("business_products").insert(payload as never);
  if (error) throw error;
}

/** 상품 삭제. 에러 시 throw. */
export async function deleteBusinessProduct(id: string): Promise<void> {
  const { error } = await supabase.from("business_products").delete().eq("id", id);
  if (error) throw error;
}
