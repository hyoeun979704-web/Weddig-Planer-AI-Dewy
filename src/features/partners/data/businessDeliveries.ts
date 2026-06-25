// 기업 결과물 보내기(place_inquiries 수신자 조회) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessDeliveries 의 "문의 고객 목록" 조회를 모은다.
// 파일 업로드·전송·보낸목록은 공용 훅(@/hooks/useVendorDeliveries)이 이미 담당 — 여기선
// 결과물 수신자(고객)를 고를 문의 목록만 분리한다.

import { supabase } from "@/integrations/supabase/client";

export interface DeliveryInquiryRow {
  id: string;
  title: string;
  user_id: string;
  status: string;
  created_at: string;
}

export const businessDeliveryKeys = {
  all: ["partners", "businessDeliveries"] as const,
  inquiries: (placeId: string) => [...businessDeliveryKeys.all, "inquiries", placeId] as const,
};

/** 한 업체에 들어온 문의 목록(결과물 보낼 고객 선택용, 최신순) 조회. 에러 시 throw. */
export async function fetchDeliveryInquiries(placeId: string): Promise<DeliveryInquiryRow[]> {
  const { data, error } = await supabase
    .from("place_inquiries")
    .select("id, title, user_id, status, created_at")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DeliveryInquiryRow[];
}
