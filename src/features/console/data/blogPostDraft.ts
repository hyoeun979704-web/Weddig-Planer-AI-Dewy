// 블로그 원고(워드프레스 발행 큐) 데이터 접근 레이어 — console 마케팅 도메인.
// 패턴: instagramPostDraft.ts. blog_post_drafts CRUD.
// 발행은 수동(운영자가 복사 → 워드프레스에 직접 게시 → "발행 완료" 표시). 자동 REST 발행 없음.

import { supabase } from "@/integrations/supabase/client";
import type { BlogPostDraft } from "@/types/blogPostDraft";

export const blogPostDraftKeys = {
  all: ["admin", "blogPostDraft"] as const,
  detail: (id: string) => [...blogPostDraftKeys.all, id] as const,
  list: (filter: string) => [...blogPostDraftKeys.all, "list", filter] as const,
};

/** 원고 목록(최대 100, status 필터). filter "all" 이면 전체. 에러 시 throw. */
export async function fetchBlogDraftList(filter: string): Promise<BlogPostDraft[]> {
  let query = supabase
    .from("blog_post_drafts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BlogPostDraft[];
}

/** 신규 원고 생성 후 생성된 행 반환. 에러 시 throw. */
export async function createBlogDraft(payload: Record<string, unknown>): Promise<BlogPostDraft> {
  const { data, error } = await supabase
    .from("blog_post_drafts")
    .insert(payload as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as BlogPostDraft;
}

/** 원고 단건 조회. 없으면 null. 에러 시 throw. */
export async function fetchBlogDraft(id: string): Promise<BlogPostDraft | null> {
  const { data, error } = await supabase
    .from("blog_post_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BlogPostDraft) ?? null;
}

/** 원고 수정 후 갱신된 행 반환(없으면 null). 에러 시 throw. */
export async function updateBlogDraft(
  id: string,
  payload: Record<string, unknown>,
): Promise<BlogPostDraft | null> {
  const { data, error } = await supabase
    .from("blog_post_drafts")
    .update(payload as never)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BlogPostDraft) ?? null;
}

export async function deleteBlogDraft(id: string): Promise<void> {
  const { error } = await supabase.from("blog_post_drafts").delete().eq("id", id);
  if (error) throw error;
}
