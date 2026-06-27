// 블로그 원고(워드프레스 발행 큐) 데이터 접근 레이어 — console 마케팅 도메인.
// 패턴: instagramPostDraft.ts. blog_post_drafts CRUD + wordpress-publisher 호출.

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

export interface WordpressPublishResult {
  success: boolean;
  wpPostId?: number;
  wpUrl?: string | null;
  wpStatus?: "draft" | "publish";
  error?: string;
}

/** wordpress-publisher edge function 호출. wpStatus: 임시저장(draft)·발행(publish). */
export async function publishToWordpress(
  draftId: string,
  wpStatus: "draft" | "publish",
): Promise<WordpressPublishResult> {
  const { data, error } = await supabase.functions.invoke("wordpress-publisher", {
    body: { draftId, wpStatus },
  });
  if (error) {
    // edge function 이 4xx/5xx 면 supabase-js 가 error 로 던짐 — 본문 메시지 회수 시도.
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
  const result = data as WordpressPublishResult | null;
  if (!result || result.error) throw new Error(result?.error ?? "응답이 비어있어요");
  return result;
}
