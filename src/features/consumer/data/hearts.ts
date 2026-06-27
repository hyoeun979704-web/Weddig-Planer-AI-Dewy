// 하트 잔액(user_hearts) 데이터 접근 레이어 (Task #3 — consumer 도메인).
// 패턴: docs/data-access-layer.md. 여러 AI 화면이 잔액 조회를 복붙해 왔다 — 단일화.

import { supabase } from "@/integrations/supabase/client";

export const heartKeys = {
  all: ["consumer", "hearts"] as const,
  balance: (userId: string) => [...heartKeys.all, userId] as const,
};

/** 사용자 하트 잔액 조회. 행이 없으면 0. (에러도 0 으로 흡수 — 잔액 표시는 비핵심) */
export async function fetchHeartBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from("user_hearts")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { balance?: number } | null)?.balance ?? 0;
}
