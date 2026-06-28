import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TipBlog {
  id: string;
  url: string;
  title: string;
  description: string | null;
  blogger_name: string | null;
  blogger_link: string | null;
  post_date: string | null;
  thumbnail_url: string | null;
  source: string;
  categories: string[];
}

interface UseTipBlogsOptions {
  category?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * 네이버 블로그 / 매거진 RSS 등에서 수집된 결혼 준비 블로그 글.
 * RLS 가 is_active 만 자동 노출. 광고 의심 (is_ad_suspected) 은
 * collect 시점에 is_active=false 로 저장되어 자동 제외.
 */
export function useTipBlogs(opts: UseTipBlogsOptions = {}) {
  const { category, limit = 20, enabled = true } = opts;
  return useQuery({
    queryKey: ["tip_blogs", category ?? "all", limit],
    enabled,
    queryFn: async (): Promise<TipBlog[]> => {
      let q = (supabase as any)
        .from("tip_blogs")
        .select(
          "id, url, title, description, blogger_name, blogger_link, post_date, thumbnail_url, source, categories",
        )
        .order("post_date", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (category) q = q.contains("categories", [category]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TipBlog[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
