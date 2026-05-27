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
