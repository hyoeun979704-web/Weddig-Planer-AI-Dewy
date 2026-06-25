// 커뮤니티(community_posts·community_comments·community_likes·community_post_places
// + community-images 스토리지 + increment_post_views RPC) 데이터 접근 레이어
// (Task #3 — consumer 도메인). 패턴: docs/data-access-layer.md.
// Community·CommunityPostDetail·CommunityWrite·CommunityEdit·BookmarkedPosts 가
// 공유하는 DB·스토리지·RPC 호출을 모은다. 페이지는 UX(토스트·옵티미스틱·페이지네이션)만
// 담당하고 모든 supabase 접근은 여기로 위임한다.

import { supabase } from "@/integrations/supabase/client";

const IMAGE_BUCKET = "community-images";

// 모든 community_posts 컬럼을 포함하는 원시 행. like_count·comment_count 집계 컬럼은
// 트리거 동기화 값(페이지가 likes_count·comments_count 로 매핑).
export interface CommunityPostRow {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean | null;
  image_urls: string[] | null;
  views: number | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  wedding_style: string | null;
}

export interface CommunityCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
}

export interface NewCommunityPost {
  user_id: string;
  category: string;
  title: string;
  content: string;
  has_image: boolean;
  image_urls: string[];
  wedding_style: string | null;
}

export interface UpdateCommunityPost {
  category: string;
  title: string;
  content: string;
  has_image: boolean;
  image_urls: string[];
}

export const communityKeys = {
  all: ["community"] as const,
  posts: (blockedUserIds: string[]) => ["community-posts", blockedUserIds] as const,
  post: (id: string | undefined) => ["community-post", id] as const,
  postEdit: (id: string | undefined) => ["community-post-edit", id] as const,
  comments: (id: string | undefined, blockedUserIds: string[]) =>
    ["community-comments", id, blockedUserIds] as const,
  likesCount: (id: string | undefined) => ["community-likes-count", id] as const,
  liked: (id: string | undefined, userId: string | undefined) =>
    ["community-liked", id, userId] as const,
  bookmarked: (postIds: string[]) => ["bookmarked-posts", postIds] as const,
};

// ── 게시글 목록/상세 ──────────────────────────────────────────────

/**
 * 피드 목록(최신 100개). 차단 사용자 글은 제외. 에러 시 throw.
 * 트렌딩·정렬·필터는 호출부에서 클라이언트 계산.
 */
export async function fetchCommunityPosts(
  blockedUserIds: string[],
): Promise<CommunityPostRow[]> {
  let query = supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (blockedUserIds.length > 0) {
    query = query.not("user_id", "in", `(${blockedUserIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CommunityPostRow[];
}

/** 북마크한 게시글 목록(주어진 id 집합, 최신순). 에러 시 throw. */
export async function fetchBookmarkedPosts(
  postIds: string[],
): Promise<CommunityPostRow[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .in("id", postIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CommunityPostRow[];
}

/** 단일 게시글 조회(없으면 null). 에러 시 throw. */
export async function fetchCommunityPost(
  id: string,
): Promise<CommunityPostRow | null> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CommunityPostRow | null) ?? null;
}

/** 수정 화면용 게시글 조회(.single — 없으면 에러). 에러 시 throw. */
export async function fetchCommunityPostForEdit(
  id: string,
): Promise<CommunityPostRow> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as CommunityPostRow;
}

/** 조회수 +1 (작성자 외 UPDATE 불가 → RLS 우회 RPC). 결과 무시(비핵심). */
export async function incrementPostViews(postId: string): Promise<void> {
  await supabase.rpc("increment_post_views", { p_post_id: postId });
}

/** 새 게시글 작성 → 생성된 행 반환. 에러 시 throw. */
export async function createCommunityPost(
  post: NewCommunityPost,
): Promise<CommunityPostRow> {
  const { data, error } = await supabase
    .from("community_posts")
    .insert(post)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as CommunityPostRow;
}

/** 게시글 수정(작성자 본인만). 에러 시 throw. */
export async function updateCommunityPost(
  id: string,
  userId: string,
  patch: UpdateCommunityPost,
): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

/** 게시글 삭제(작성자 본인만). 에러 시 throw. */
export async function deleteCommunityPost(
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── 태그된 업체 연결 ──────────────────────────────────────────────

/** 작성 글에 태그 업체 연결. 에러 시 throw(호출부가 비핵심으로 흡수). */
export async function linkCommunityPostPlaces(
  postId: string,
  placeIds: string[],
): Promise<void> {
  if (placeIds.length === 0) return;
  const { error } = await supabase
    .from("community_post_places")
    .insert(placeIds.map((placeId) => ({ post_id: postId, place_id: placeId })));
  if (error) throw error;
}

// ── 댓글 ──────────────────────────────────────────────────────────

/** 게시글 댓글 목록(작성순). 차단 사용자 댓글은 제외. 에러 시 throw. */
export async function fetchCommunityComments(
  postId: string,
  blockedUserIds: string[],
): Promise<CommunityCommentRow[]> {
  let query = supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (blockedUserIds.length > 0) {
    query = query.not("user_id", "in", `(${blockedUserIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CommunityCommentRow[];
}

/** 댓글/답글 작성. 에러 시 throw. */
export async function createCommunityComment(args: {
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("community_comments").insert({
    post_id: args.postId,
    user_id: args.userId,
    content: args.content,
    parent_comment_id: args.parentCommentId || null,
  });
  if (error) throw error;
}

/** 댓글 삭제(작성자 본인만). 에러 시 throw. */
export async function deleteCommunityComment(
  commentId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("community_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** 댓글 수정(작성자 본인만). 에러 시 throw. */
export async function updateCommunityComment(
  commentId: string,
  userId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from("community_comments")
    .update({ content })
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── 좋아요 ────────────────────────────────────────────────────────

/** 게시글 좋아요 수(exact count). 에러 시 throw. */
export async function fetchPostLikesCount(postId: string): Promise<number> {
  const { count, error } = await supabase
    .from("community_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error) throw error;
  return count || 0;
}

/** 사용자가 이 글을 좋아요 했는지 여부. 에러 시 throw. */
export async function fetchPostLiked(
  postId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("community_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** 좋아요 추가. 에러 시 throw. */
export async function addPostLike(postId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("community_likes")
    .insert({ post_id: postId, user_id: userId });
  if (error) throw error;
}

/** 좋아요 취소. 에러 시 throw. */
export async function removePostLike(
  postId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("community_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── 이미지 업로드(공개 버킷) ──────────────────────────────────────

/**
 * 커뮤니티 이미지들을 공개 버킷에 올리고 publicUrl 배열을 반환.
 * (공개 버킷이라 서명 URL 이 아닌 getPublicUrl 사용). 업로드 실패 시 throw.
 */
export async function uploadCommunityImages(
  userId: string,
  images: File[],
): Promise<string[]> {
  if (images.length === 0) return [];

  const uploadedUrls: string[] = [];
  for (const image of images) {
    const fileExt = image.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(fileName, image);
    if (error) {
      console.error("Image upload error:", error);
      throw new Error("이미지 업로드에 실패했습니다.");
    }

    const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(fileName);
    uploadedUrls.push(urlData.publicUrl);
  }

  return uploadedUrls;
}
