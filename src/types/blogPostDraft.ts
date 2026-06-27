// 블로그 원고 — 워드프레스 발행 큐 타입(console 마케팅 도메인).
// DB 단일 소스: supabase/migrations/20260627110000_blog_post_drafts.sql · types.ts blog_post_drafts.

export type BlogPostStatus =
  | "draft" // 작성/적재됨
  | "review" // 운영자 검수 중(또는 WP 임시저장됨)
  | "publishing" // 발행 처리 중(전이)
  | "published" // WP 발행 완료
  | "failed"; // 발행 실패

export type BlogAuthorPersona = "me" | "brand";

/** WP 쪽 실제 게시 상태(status 와 별개 — 부분 상태 추적). */
export type WpPostStatus = "draft" | "publish";

export interface BlogPostDraft {
  id: string;
  title: string;
  slug: string | null;
  content_markdown: string | null;
  excerpt: string | null;
  canonical_url: string | null;
  featured_image_url: string | null;
  categories: string[];
  tags: string[];
  author_persona: BlogAuthorPersona;
  source_type: string;
  source_id: string | null;
  notion_page_id: string | null;
  status: BlogPostStatus;
  wp_post_id: number | null;
  wp_url: string | null;
  wp_status: WpPostStatus | null;
  wp_featured_media_id: number | null;
  wp_published_at: string | null;
  last_error: string | null;
  retry_count: number;
  notes: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const BLOG_STATUS_LABEL: Record<BlogPostStatus, string> = {
  draft: "초안",
  review: "검수중",
  publishing: "발행중",
  published: "발행완료",
  failed: "실패",
};

export const BLOG_STATUS_TONE: Record<BlogPostStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-amber-100 text-amber-700",
  publishing: "bg-purple-100 text-purple-700",
  published: "bg-emerald-100 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
};

export const BLOG_PERSONA_LABEL: Record<BlogAuthorPersona, string> = {
  me: "효은(개인)",
  brand: "Dewy(브랜드)",
};
