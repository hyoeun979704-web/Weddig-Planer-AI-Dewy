// 커플 의견 조율 보드(couple_votes·couple_links) 데이터 접근 레이어
// (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// CoupleVote(목록·생성)·CoupleVoteDetail(상세·투표·AI절충·결정) 이 공유하는 DB 호출을 모은다.
// couple_votes·couple_links 는 types.ts 에 존재 → 타입드 .from() 사용.
// AI 절충안 스트리밍 fetch 는 페이지에 남기되, 인증 토큰 조회(getSession)만 여기로 모은다.

import { supabase } from "@/integrations/supabase/client";

export interface CoupleVoteRow {
  id: string;
  user_id: string;
  partner_user_id: string | null;
  topic: string;
  option_a: string;
  option_b: string;
  my_pick: string | null;
  my_reason: string | null;
  partner_pick: string | null;
  partner_reason: string | null;
  ai_suggestion: string | null;
  status: string;
  created_at: string;
}

export const coupleVoteKeys = {
  all: ["consumer", "coupleVote"] as const,
  list: (userId: string) => [...coupleVoteKeys.all, "list", userId] as const,
  detail: (id: string) => [...coupleVoteKeys.all, "detail", id] as const,
};

/** 내가 만들었거나 파트너로 참여한 투표 목록(최신순). 에러 시 throw. */
export async function fetchCoupleVotes(userId: string): Promise<CoupleVoteRow[]> {
  const { data, error } = await supabase
    .from("couple_votes")
    .select("*")
    .or(`user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CoupleVoteRow[];
}

/** 단일 투표 상세 조회. 없으면 null. (maybeSingle — 0행 허용) 에러 시 throw. */
export async function fetchCoupleVote(id: string): Promise<CoupleVoteRow | null> {
  const { data, error } = await supabase
    .from("couple_votes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CoupleVoteRow | null) ?? null;
}

/** 연동된(status=linked) 커플 링크에서 파트너 user_id 도출. 없으면 null. 에러 시 throw. */
export async function fetchLinkedPartnerId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("couple_links")
    .select("user_id, partner_user_id")
    .or(`user_id.eq.${userId},partner_user_id.eq.${userId}`)
    .eq("status", "linked")
    .maybeSingle();
  if (error) throw error;
  const row = data as { user_id: string; partner_user_id: string | null } | null;
  if (!row) return null;
  return row.user_id === userId ? row.partner_user_id : row.user_id;
}

/** 새 투표 생성. 에러 시 throw(호출부가 토스트 분기). */
export async function createCoupleVote(input: {
  userId: string;
  partnerUserId: string | null;
  topic: string;
  optionA: string;
  optionB: string;
}): Promise<void> {
  const { error } = await supabase.from("couple_votes").insert({
    user_id: input.userId,
    partner_user_id: input.partnerUserId,
    topic: input.topic,
    option_a: input.optionA,
    option_b: input.optionB,
    status: "voting",
  });
  if (error) throw error;
}

/** 내 투표(선택+이유) 저장. 생성자/파트너 컬럼은 호출부가 결정해 전달. 에러 시 throw. */
export async function saveCoupleVotePick(
  id: string,
  update: {
    my_pick?: string;
    my_reason?: string | null;
    partner_pick?: string;
    partner_reason?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("couple_votes").update(update).eq("id", id);
  if (error) throw error;
}

/** AI 절충안 + 상태(discussed) 저장. 에러 시 throw. */
export async function saveCoupleVoteAISuggestion(id: string, suggestion: string): Promise<void> {
  const { error } = await supabase
    .from("couple_votes")
    .update({ ai_suggestion: suggestion, status: "discussed" })
    .eq("id", id);
  if (error) throw error;
}

/** 투표를 결정 완료(status=decided)로 전환. 에러 시 throw. */
export async function decideCoupleVote(id: string): Promise<void> {
  const { error } = await supabase
    .from("couple_votes")
    .update({ status: "decided" })
    .eq("id", id);
  if (error) throw error;
}

/** 현재 세션 access_token 조회(AI 절충안 fetch 인증용). 없으면 null. */
export async function getSessionAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
