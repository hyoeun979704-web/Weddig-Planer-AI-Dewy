// Instagram 게시물 초안 편집 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminInstagramPostEdit 의 instagram_post_drafts CRUD 를 모은다.
// instagram_post_drafts 는 types 에 존재 → (supabase as any) 캐스트 제거. 정규화/폼 매핑은 페이지 유지.

import { supabase } from "@/integrations/supabase/client";

export type DraftRow = Record<string, unknown>;

export const instagramPostDraftKeys = {
  all: ["admin", "instagramPostDraft"] as const,
  detail: (id: string) => [...instagramPostDraftKeys.all, id] as const,
  list: (filter: string) => [...instagramPostDraftKeys.all, "list", filter] as const,
};

/** 초안 목록(최대 100, status 필터). filter "all" 이면 전체. 에러 시 throw. */
export async function fetchDraftList<T>(filter: string): Promise<T[]> {
  let query = supabase.from("instagram_post_drafts").select("*").order("created_at", { ascending: false }).limit(100);
  if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

/** 신규 초안 생성. 에러 시 throw. */
export async function createDraft(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("instagram_post_drafts").insert(payload as never);
  if (error) throw error;
}

/** 초안 단건 조회. 없으면 null. 에러 시 throw(호출부가 loadError 표시). */
export async function fetchDraft(id: string): Promise<DraftRow | null> {
  const { data, error } = await supabase.from("instagram_post_drafts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as DraftRow) ?? null;
}

/** 초안 수정 후 갱신된 행 반환(없으면 null). 에러 시 throw. */
export async function updateDraft(id: string, payload: Record<string, unknown>): Promise<DraftRow | null> {
  const { data, error } = await supabase
    .from("instagram_post_drafts")
    .update(payload as never)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as DraftRow) ?? null;
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase.from("instagram_post_drafts").delete().eq("id", id);
  if (error) throw error;
}
