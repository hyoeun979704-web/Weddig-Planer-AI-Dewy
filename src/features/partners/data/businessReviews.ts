// 기업 후기 관리(place_reviews) 데이터 접근 레이어 (Task #3 — partners 도메인).
// 패턴: docs/data-access-layer.md. BusinessReviews 의 후기 조회·사장님 답글 저장을 모은다.
// place_reviews 는 공개 읽기 대상, 답글(owner_response)은 기존 컬럼 사용 — 별도 마이그 없음.

import { supabase } from "@/integrations/supabase/client";

/** 답글 본문 최대 길이(저장 시 잘라냄). */
export const REPLY_MAX = 1000;

export interface ReviewRow {
  review_id: string;
  title: string | null;
  content: string | null;
  author: string | null;
  rating: number | null;
  review_date: string | null;
  created_at: string | null;
  source_name: string | null;
  owner_response: string | null;
  owner_response_at: string | null;
}

export const businessReviewKeys = {
  all: ["partners", "businessReviews"] as const,
  place: (placeId: string) => [...businessReviewKeys.all, placeId] as const,
};

/** 한 업체의 후기 목록(최신순, 최대 200건) 조회. 에러 시 throw. */
export async function fetchBusinessReviews(placeId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("place_reviews")
    .select("review_id, title, content, author, rating, review_date, created_at, source_name, owner_response, owner_response_at")
    .eq("place_id", placeId)
    .order("review_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ReviewRow[];
}

/** 후기에 사장님 답글 저장(owner_response/owner_response_at 갱신, REPLY_MAX 절단). 에러 시 throw. */
export async function saveReviewReply(reviewId: string, reply: string): Promise<void> {
  const { error } = await supabase
    .from("place_reviews")
    .update({ owner_response: reply.slice(0, REPLY_MAX), owner_response_at: new Date().toISOString() })
    .eq("review_id", reviewId);
  if (error) throw error;
}
