// 기업 문의함(place_inquiries) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessInquiries 의 문의 조회·답변·예약확정을 모은다.
// RLS 가 내 업체(place 소유) 문의만 돌려주고, 문의 본문 불변은 DB 트리거가 강제한다.

import { supabase } from "@/integrations/supabase/client";

/** 답변 본문 최대 길이(저장 시 잘라냄). */
export const ANSWER_MAX = 2000;

export interface InquiryRow {
  id: string;
  title: string;
  content: string;
  contact: string | null;
  status: "open" | "answered" | "closed" | "booked";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
}

export const businessInquiryKeys = {
  all: ["partners", "businessInquiries"] as const,
  place: (placeId: string) => [...businessInquiryKeys.all, placeId] as const,
};

/** 한 업체의 문의 목록(최신순) 조회. 에러 시 throw. */
export async function fetchBusinessInquiries(placeId: string): Promise<InquiryRow[]> {
  const { data, error } = await supabase
    .from("place_inquiries")
    .select("id, title, content, contact, status, answer, answered_at, created_at")
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InquiryRow[];
}

/** 문의 답변 저장 — answer/status/answered_at 만 갱신(본문은 트리거가 불변 강제). 에러 시 throw. */
export async function answerInquiry(id: string, answer: string): Promise<void> {
  const { error } = await supabase
    .from("place_inquiries")
    .update({
      answer: answer.slice(0, ANSWER_MAX),
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** 문의를 예약 확정 상태로 표시. 에러 시 throw. */
export async function markInquiryBooked(id: string): Promise<void> {
  const { error } = await supabase.from("place_inquiries").update({ status: "booked" }).eq("id", id);
  if (error) throw error;
}
