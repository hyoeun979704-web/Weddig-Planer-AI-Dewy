// AI 프롬프트(ai_prompts) 편집 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminAiPromptEditor 의 조회 + 내용/활성 수정을 모은다.
// ai_prompts 는 types 에 존재 → (supabase as any) 캐스트 제거.

import { supabase } from "@/integrations/supabase/client";

export interface PromptRow {
  key: string;
  label: string;
  description: string | null;
  content: string;
  category: string;
  is_active: boolean;
  updated_at: string;
}

export const aiPromptKeys = {
  all: ["admin", "aiPrompts"] as const,
  list: () => [...aiPromptKeys.all, "list"] as const,
};

/** 프롬프트 목록(카테고리·key 정렬). 에러 시 throw. */
export async function fetchPrompts(): Promise<PromptRow[]> {
  const { data, error } = await supabase
    .from("ai_prompts")
    .select("key, label, description, content, category, is_active, updated_at")
    .order("category", { ascending: true })
    .order("key", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PromptRow[];
}

/** 프롬프트 내용 수정 — 수정자(현재 운영자)도 함께 기록(내부에서 auth.getUser). 에러 시 throw. */
export async function updatePromptContent(key: string, content: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("ai_prompts")
    .update({ content, updated_by: auth?.user?.id ?? null })
    .eq("key", key);
  if (error) throw error;
}

/** 프롬프트 활성/비활성(비활성 시 코드 기본값 폴백 사용). 에러 시 throw. */
export async function setPromptActive(key: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("ai_prompts").update({ is_active: active } as never).eq("key", key);
  if (error) throw error;
}
