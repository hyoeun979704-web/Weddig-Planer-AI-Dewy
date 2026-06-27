// 기업 이벤트(business_events) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessEvents 의 이벤트 조회·등록·삭제를 모은다.
// 조회는 select("*") — banner_image_url/detail_images 미적용 라이브에서도 422 방어(드리프트 idiom).

import { supabase } from "@/integrations/supabase/client";

export interface EventItem {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  banner_image_url: string | null;
  detail_images: string[] | null;
  moderation_status: string;
  moderation_note: string | null;
}

export interface NewEvent {
  place_id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  banner_image_url: string;
  detail_images: string[];
}

export const businessEventKeys = {
  all: ["partners", "businessEvents"] as const,
  place: (placeId: string) => [...businessEventKeys.all, placeId] as const,
};

/** 한 업체의 이벤트 목록(최신순) 조회. 에러 시 throw. */
export async function fetchBusinessEvents(placeId: string): Promise<EventItem[]> {
  // select("*") 는 드리프트(banner_image_url/detail_images 미적용 라이브) 방어 idiom.
  const { data, error } = await supabase
    .from("business_events")
    .select("*")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EventItem[];
}

/** 이벤트 등록. 운영자 검토 대기 상태로 저장. 에러 시 throw. */
export async function addBusinessEvent(payload: NewEvent): Promise<void> {
  const { error } = await supabase.from("business_events").insert(payload as never);
  if (error) throw error;
}

/** 이벤트 삭제. 에러 시 throw. */
export async function deleteBusinessEvent(id: string): Promise<void> {
  const { error } = await supabase.from("business_events").delete().eq("id", id);
  if (error) throw error;
}
