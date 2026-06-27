// Instagram 큐레이션 데이터 접근 레이어 (Task #3 — console 도메인).
// 패턴: docs/data-access-layer.md. AdminTipInstagrams 의 raw supabase(11 call-sites,
// (supabase as any) 캐스트 포함)를 여기로 모은다. tip_instagrams/tip_instagram_accounts 는
// types 에 존재 → 캐스트 제거. React 비의존(테스트 가능).

import { supabase } from "@/integrations/supabase/client";

export interface InstagramPost {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  author: string | null;
  thumbnail_url: string | null;
  categories: string[];
  moderation_status: string;
  moderation_note: string | null;
  collected_at: string;
}

export interface InstagramAccount {
  username: string;
  category: string;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_new: number | null;
  last_sync_error: string | null;
}

export interface CollectReelsResult {
  total_new?: number;
  accounts?: number;
  error?: string;
}

const POST_SELECT =
  "id, url, title, description, author, thumbnail_url, categories, moderation_status, moderation_note, collected_at";

export const tipInstagramKeys = {
  all: ["admin", "tipInstagrams"] as const,
  posts: (filter: "pending" | "all") => [...tipInstagramKeys.all, "posts", filter] as const,
  accounts: () => [...tipInstagramKeys.all, "accounts"] as const,
};

// ── 비즈니스 계정(릴스 자동 수집 소스) ──────────────────────────────
export async function fetchInstagramAccounts(): Promise<InstagramAccount[]> {
  const { data, error } = await supabase
    .from("tip_instagram_accounts")
    .select("username,category,is_active,last_synced_at,last_sync_new,last_sync_error")
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as InstagramAccount[];
}

export async function upsertInstagramAccount(username: string, category: string): Promise<void> {
  const { error } = await supabase
    .from("tip_instagram_accounts")
    .upsert({ username, category }, { onConflict: "username" });
  if (error) throw error;
}

export async function deleteInstagramAccount(username: string): Promise<void> {
  const { error } = await supabase.from("tip_instagram_accounts").delete().eq("username", username);
  if (error) throw error;
}

/** Business Discovery 릴스 수집 — instagram-collect-reels 엣지함수. 응답의 error 도 throw. */
export async function collectReels(): Promise<CollectReelsResult> {
  const { data, error } = await supabase.functions.invoke("instagram-collect-reels", { body: {} });
  if (error) throw error;
  const r = (data ?? {}) as CollectReelsResult;
  if (r.error) throw new Error(r.error);
  return r;
}

// ── 게시물(검토 대상) ──────────────────────────────────────────────
export async function fetchInstagramPosts(filter: "pending" | "all"): Promise<InstagramPost[]> {
  let q = supabase.from("tip_instagrams").select(POST_SELECT).order("collected_at", { ascending: false });
  if (filter === "pending") q = q.eq("moderation_status", "pending");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as InstagramPost[];
}

/** 게시물 등록. 중복(23505)은 호출부에서 err.code 로 구분. */
export async function insertInstagramPost(payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("tip_instagrams").insert(payload as never);
  if (error) throw error;
}

export async function setPostModeration(
  id: string,
  status: "approved" | "rejected",
  note: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("tip_instagrams")
    .update({ moderation_status: status, moderation_note: note })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInstagramPost(id: string): Promise<void> {
  const { error } = await supabase.from("tip_instagrams").delete().eq("id", id);
  if (error) throw error;
}

export async function updateInstagramThumbnail(id: string, thumbnailUrl: string): Promise<void> {
  const { error } = await supabase.from("tip_instagrams").update({ thumbnail_url: thumbnailUrl } as never).eq("id", id);
  if (error) throw error;
}

/**
 * 외부 이미지 URL 을 공개 Storage(tip-thumbnails)로 미러링 — mirror-image 엣지함수.
 * 실패 시 edge 응답 본문(hint/error)을 추출해 Error 로 throw(원인 노출). 성공 시 공개 URL 반환.
 */
export async function mirrorImage(url: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("mirror-image", { body: { url } });
  if (error) {
    let msg = error.message;
    try {
      const ctx = await (error as { context?: { json?: () => Promise<{ hint?: string; error?: string }> } }).context?.json?.();
      if (ctx?.hint || ctx?.error) msg = ctx.hint ?? ctx.error ?? msg;
    } catch {
      /* 본문 파싱 실패는 무시 */
    }
    throw new Error(msg);
  }
  const thumb = (data as { thumbnail_url?: string } | null)?.thumbnail_url;
  if (!thumb) throw new Error("응답에 thumbnail_url 이 없어요.");
  return thumb;
}
