import { supabase } from "@/integrations/supabase/client";

export interface ReferralProgress {
  has_referral: boolean;
  wedding_info_done: boolean;
  community_done: boolean;
  review_done: boolean;
  rewarded: boolean;
}

/**
 * 친구추천 이벤트 미션 진행도 확인 + 완료 시 양쪽 100하트 지급(서버 RPC, 1회 멱등).
 * 미션 행동(결혼정보 저장·커뮤니티 글 작성·후기 작성) 직후 호출하면 자동 지급된다.
 * 초대로 가입하지 않은 사용자는 has_referral=false 로 조용히 반환(무동작).
 * 베스트에포트 — 실패해도 호출부 흐름을 막지 않는다.
 */
export async function checkReferralMilestones(): Promise<ReferralProgress | null> {
  try {
    const { data, error } = await (supabase as any).rpc("check_referral_milestones");
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    return (row as ReferralProgress) ?? null;
  } catch {
    return null;
  }
}
