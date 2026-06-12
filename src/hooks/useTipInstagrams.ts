import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TipInstagram {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  author: string | null;
  thumbnail_url: string | null;
  categories: string[];
}

interface UseTipInstagramsOptions {
  category?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * 운영자 큐레이션 + (추후) 사용자 추천 Instagram 게시물.
 * RLS 가 moderation_status='approved' + is_active 만 노출.
 */
export function useTipInstagrams(opts: UseTipInstagramsOptions = {}) {
  const { category, limit = 12, enabled = true } = opts;
  return useQuery({
    queryKey: ["tip_instagrams", category ?? "all", limit],
    enabled,
    queryFn: async (): Promise<TipInstagram[]> => {
      let q = (supabase as any)
        .from("tip_instagrams")
        .select("id, url, title, description, author, thumbnail_url, categories")
        // 썸네일(재호스팅된 릴스 커버)이 있는 항목만 노출. 인스타 토큰 수집 전에는
        // 썸네일이 비어 결과가 0건 → InstagramTipSection 이 자동으로 섹션을 숨긴다.
        // 토큰 연결 후 수집되면 썸네일이 채워져 자동으로 다시 노출.
        .not("thumbnail_url", "is", null)
        .neq("thumbnail_url", "")
        .ilike("url", "%/reel/%")
        .order("collected_at", { ascending: false })
        .limit(limit);
      if (category) q = q.contains("categories", [category]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TipInstagram[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
