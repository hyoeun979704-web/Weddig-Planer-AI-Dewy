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

export interface GenerateBlogResult {
  success: boolean;
  draftId?: string;
  sourceCount?: number;
  error?: string;
}

/**
 * blog-draft-generator edge function 호출 — 자료조사(그라운딩)→신뢰성 검증→wp_aio 작성→자가분석.
 * topic 으로 신규 생성(draftId 반환) 또는 draftId 로 기존 원고 재생성.
 */
export async function generateBlogDraft(input: {
  topic?: string;
  draftId?: string;
  readerPersona?: string | null;
  angle?: string | null;
}): Promise<GenerateBlogResult> {
  const { data, error } = await supabase.functions.invoke("blog-draft-generator", { body: input });
  if (error) {
    let detail = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const j = await ctx.json();
        detail = j?.message || j?.error || detail;
      } catch {
        /* 본문 파싱 실패 — 기본 메시지 유지 */
      }
    }
    throw new Error(detail);
  }
  const result = data as GenerateBlogResult | null;
  if (!result || result.error) throw new Error(result?.error ?? "응답이 비어있어요");
  return result;
}
