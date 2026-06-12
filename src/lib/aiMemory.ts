// L5 메모리 검증 — user_ai_memory 조회/삭제 단일 소스.
// 서버(ai-planner/memory.ts)가 자동 추출·저장한 사실을 사용자가 확인·삭제할 수
// 있게 한다(환각 누적 차단). RLS: 본인 행만 read/delete 허용(적용 확인됨).
import { supabase } from "@/integrations/supabase/client";

export interface AIMemory {
  id: string;
  fact_type: string;
  fact_text: string;
  created_at: string;
}

// fact_type → 표시 라벨. 키는 서버 추출기의 ALLOWED_FACT_TYPES 와 일치(매칭 값 — 변경 금지).
export const MEMORY_TYPE_LABELS: Record<string, string> = {
  preference: "취향·스타일",
  family: "가족 관계",
  schedule: "일정·날짜",
  budget: "예산·결제",
  vendor: "업체 관심",
  general: "기타",
};

export const memoryTypeLabel = (type: string): string => MEMORY_TYPE_LABELS[type] ?? "기타";

export async function fetchMemories(userId: string): Promise<AIMemory[]> {
  const { data, error } = await supabase
    .from("user_ai_memory")
    .select("id, fact_type, fact_text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** 특정 시점 이후 추출된 사실 — 응답 직후 "이렇게 기억할게요" 확인 칩용. */
export async function fetchMemoriesSince(userId: string, sinceIso: string): Promise<AIMemory[]> {
  const { data, error } = await supabase
    .from("user_ai_memory")
    .select("id, fact_type, fact_text, created_at")
    .eq("user_id", userId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

/** RLS 가 본인 행만 허용하지만 명시적으로 user_id 도 함께 건다(방어적). */
export async function deleteMemoryRow(userId: string, memoryId: string): Promise<void> {
  const { error } = await supabase
    .from("user_ai_memory")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);
  if (error) throw error;
}
