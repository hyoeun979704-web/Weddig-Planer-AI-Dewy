import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TipVideo {
  video_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number;
  like_count: number;
  published_at: string | null;
  categories: string[];
  tags: string[] | null;
}

interface UseTipVideosOptions {
  category?: string; // place category slug or "general"
  limit?: number;
  freshOnly?: boolean; // prefer last 12 months
}

/**
 * Fetches tip videos ordered by view_count desc.
 * - No category → top videos across all categories (homepage 오늘의 꿀팁).
 * - With category → filter by `categories @> {category}` (GIN index hit).
 * - freshOnly → published_at >= 12 months ago. Falls back to all-time
 *   if too few fresh videos exist (rare given current corpus).
 */
export function useTipVideos(opts: UseTipVideosOptions = {}) {
  const { category, limit = 20, freshOnly = true } = opts;
  return useQuery({
    queryKey: ["tip_videos", category ?? "all", limit, freshOnly],
    queryFn: async (): Promise<TipVideo[]> => {
      let q = supabase
        .from("tip_videos")
        .select(
          "video_id,title,channel_name,thumbnail_url,duration_seconds,view_count,like_count,published_at,categories,tags"
        )
        .eq("is_active", true)
        .order("view_count", { ascending: false })
        .limit(limit);

      if (category) {
        q = q.contains("categories", [category]);
      }
      if (freshOnly) {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte("published_at", oneYearAgo);
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as TipVideo[];
      // Fallback: if freshOnly returned too few, retry without the filter so
      // the section never shows up empty when older content exists.
      if (freshOnly && rows.length < Math.min(5, limit)) {
        const { data: all } = await supabase
          .from("tip_videos")
          .select(
            "video_id,title,channel_name,thumbnail_url,duration_seconds,view_count,like_count,published_at,categories,tags"
          )
          .eq("is_active", true)
          .order("view_count", { ascending: false })
          .limit(limit);
        return (all ?? []) as TipVideo[];
      }
      return rows;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — tip lists don't churn fast
  });
}

export const youTubeUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
