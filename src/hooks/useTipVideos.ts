import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { escapeLikePattern, quoteForOr } from "@/lib/postgrestEscape";
import { koreanQueryToCategorySlugs } from "@/lib/placeMappers";

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
  // Free-text search across title and channel name. When set, `category`
  // and `freshOnly` are ignored — search is a global escape hatch that
  // surfaces every matching video regardless of the user's exclusions or
  // recency filters. Trimmed/empty strings are treated as "no search".
  searchQuery?: string;
  // React Query gating. Pass false when the consumer knows the result
  // won't be displayed (e.g. HOT row while the user is searching) to
  // avoid a wasted network round-trip.
  enabled?: boolean;
}

/**
 * Fetches tip videos ordered by view_count desc.
 * - No category & no search → top videos across all categories (homepage 오늘의 꿀팁).
 * - With category → filter by `categories @> {category}` (GIN index hit).
 * - With searchQuery → ilike against title/channel_name; ignores category & freshOnly.
 * - freshOnly → published_at >= 12 months ago. Falls back to all-time
 *   if too few fresh videos exist (rare given current corpus).
 */
export function useTipVideos(opts: UseTipVideosOptions = {}) {
  const { category, limit = 20, freshOnly = true, searchQuery, enabled = true } = opts;
  const trimmedQuery = searchQuery?.trim() ?? "";
  const isSearch = trimmedQuery.length > 0;
  return useQuery({
    queryKey: ["tip_videos", isSearch ? `q:${trimmedQuery}` : (category ?? "all"), limit, isSearch ? false : freshOnly],
    enabled,
    queryFn: async (): Promise<TipVideo[]> => {
      let q = supabase
        .from("tip_videos")
        .select(
          "video_id,title,channel_name,thumbnail_url,duration_seconds,view_count,like_count,published_at,categories,tags"
        )
        .eq("is_active", true)
        .order("view_count", { ascending: false })
        .limit(limit);

      if (isSearch) {
        // Two-layer escape: LIKE wildcards (so "50%" is literal) and the
        // .or() value wrapper (so commas/parens don't break parsing).
        const pattern = quoteForOr(`%${escapeLikePattern(trimmedQuery)}%`);
        // Text-field ilike across title, channel, and description.
        // description covers cases where the keyword only appears in the
        // YouTube write-up (the title may be a clickbait variant).
        const orParts = [
          `title.ilike.${pattern}`,
          `channel_name.ilike.${pattern}`,
          `description.ilike.${pattern}`,
        ];
        // If the query is a known Korean category label (or partial), also
        // match videos tagged with that slug — pulls in `wedding_gifts`
        // videos when the user types "예단", even if the literal word
        // never appears in the title.
        for (const slug of koreanQueryToCategorySlugs(trimmedQuery)) {
          orParts.push(`categories.cs.{${slug}}`);
        }
        q = q.or(orParts.join(","));
      } else if (category) {
        q = q.contains("categories", [category]);
      }
      // freshOnly is intentionally bypassed during search so old-but-relevant
      // videos still appear when the user explicitly types a keyword.
      if (freshOnly && !isSearch) {
        const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte("published_at", oneYearAgo);
      }

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as TipVideo[];
      // Fallback: if freshOnly returned too few, retry without the filter so
      // the section never shows up empty when older content exists.
      if (!isSearch && freshOnly && rows.length < Math.min(5, limit)) {
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
