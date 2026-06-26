// 1:1 문의(inquiries) 관리 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminInquiries 의 조회 + 답변 등록을 모은다.
// inquiries 는 types 에 존재 → (supabase as any) 캐스트 제거. 페이지의 React Query 가 이 함수들을 감싼다.

import { supabase } from "@/integrations/supabase/client";

export interface AdminInquiry {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  answer: string | null;
  feedback: "up" | "down" | null;
  created_at: string;
  answered_at: string | null;
}

export const inquiryKeys = {
  all: ["admin-inquiries"] as const,
};

/** 전체 문의 목록(최신순). 에러 시 throw(React Query 가 처리). */
export async function fetchInquiries(): Promise<AdminInquiry[]> {
  const { data, error } = await supabase
    .from("inquiries")
    .select("id, user_id, category, title, content, status, answer, feedback, created_at, answered_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminInquiry[];
}

/** 문의 답변 등록 — status='answered' + answered_at 기록. 에러 시 throw. */
export async function answerInquiry(id: string, answer: string): Promise<void> {
  const { error } = await supabase
    .from("inquiries")
    .update({ answer, status: "answered", answered_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
