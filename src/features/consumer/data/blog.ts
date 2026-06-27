// 자체 블로그 공개 조회 데이터 레이어 (소비자).
// RLS 공개 정책으로 anon 도 status='published' 행을 읽을 수 있다.

import { supabase } from "@/integrations/supabase/client";

export interface PublicBlogPost {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content_markdown: string | null;
  featured_image_url: string | null;
  categories: string[];
  tags: string[];
  canonical_url: string | null;
  published_at: string | null;
}

const SELECT =
  "id, title, slug, excerpt, content_markdown, featured_image_url, categories, tags, canonical_url, wp_published_at";

function mapRow(r: Record<string, unknown>): PublicBlogPost {
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    slug: (r.slug as string | null) ?? null,
    excerpt: (r.excerpt as string | null) ?? null,
    content_markdown: (r.content_markdown as string | null) ?? null,
    featured_image_url: (r.featured_image_url as string | null) ?? null,
    categories: Array.isArray(r.categories) ? (r.categories as string[]) : [],
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    canonical_url: (r.canonical_url as string | null) ?? null,
    published_at: (r.wp_published_at as string | null) ?? null,
  };
}

/** 발행된 글 목록(최신순). */
export async function fetchPublishedBlogList(limit = 50): Promise<PublicBlogPost[]> {
  const { data, error } = await supabase
    .from("blog_post_drafts")
    .select(SELECT)
    .eq("status", "published")
    .order("wp_published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

/** 슬러그로 발행된 글 1건. 없으면 null. */
export async function fetchPublishedBlogBySlug(slug: string): Promise<PublicBlogPost | null> {
  const { data, error } = await supabase
    .from("blog_post_drafts")
    .select(SELECT)
    .eq("status", "published")
    .eq("slug", slug)
    .order("wp_published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Record<string, unknown>) : null;
}
