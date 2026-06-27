// 작가 청첩장 디자인(designer_designs) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessDesigns 의 디자인 조회·등록·삭제를 모은다.
// designer_designs 는 types 에 존재 → 페이지의 (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface DesignRow {
  id: string;
  title: string;
  price: number;
  preview_urls: string[];
  sellable: string[];
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
}

export interface NewDesign {
  designer_user_id: string;
  place_id: string | null;
  title: string;
  description: string | null;
  price: number;
  preview_urls: string[];
  style_tags: string[];
  sellable: string[];
}

export const businessDesignKeys = {
  all: ["partners", "businessDesigns"] as const,
  place: (placeId: string) => [...businessDesignKeys.all, placeId] as const,
};

/** 선택 지점(place_id)의 디자인 목록만 최신순 조회. 에러 시 throw. */
export async function fetchBusinessDesigns(placeId: string): Promise<DesignRow[]> {
  const { data, error } = await supabase
    .from("designer_designs")
    .select("id, title, price, preview_urls, sellable, status, review_note")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DesignRow[];
}

/** 디자인 등록(검토 대기 status=pending). 에러 시 throw. */
export async function addBusinessDesign(payload: NewDesign): Promise<void> {
  const { error } = await supabase.from("designer_designs").insert({ ...payload, status: "pending" } as never);
  if (error) throw error;
}

/** 디자인 삭제. 에러 시 throw. */
export async function deleteBusinessDesign(id: string): Promise<void> {
  const { error } = await supabase.from("designer_designs").delete().eq("id", id);
  if (error) throw error;
}
