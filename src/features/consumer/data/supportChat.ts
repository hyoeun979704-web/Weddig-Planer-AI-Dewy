// 고객센터 챗봇 에스컬레이션(inquiries) 데이터 접근 레이어 (Task #3 — consumer 도메인).
// 패턴: docs/data-access-layer.md. SupportChat 페이지가 직접 호출하던 불편문의
// 자동 접수(inquiries INSERT)를 추출한다. 봇 응답 로직(lib/cx/supportBot)은 페이지에 유지.

import { supabase } from "@/integrations/supabase/client";

export const supportChatKeys = {
  all: ["consumer", "supportChat"] as const,
};

/** 불편문의 접수 페이로드 — inquiries 테이블 컬럼과 대응. */
export interface CreateInquiryInput {
  userId: string;
  category: string;
  title: string;
  content: string;
}

/**
 * 불편문의(에스컬레이션) 자동 접수 — inquiries 테이블에 INSERT. 에러 시 throw
 * (호출부가 토스트로 분기). category="complaint" 등은 호출부가 지정.
 */
export async function createInquiry(input: CreateInquiryInput): Promise<void> {
  const { error } = await supabase.from("inquiries").insert({
    user_id: input.userId,
    category: input.category,
    title: input.title,
    content: input.content,
  });
  if (error) throw error;
}
