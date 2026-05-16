import { useMemo } from "react";
import { useTipVideos, type TipVideo } from "./useTipVideos";
import { useWeddingProfile } from "./useWeddingProfile";
import {
  buildCurationFactors,
  rankTipVideosForUser,
  type CurationFactors,
} from "@/lib/tipCuration";

interface Options {
  category?: string;
  limit?: number;
  // When true, fall back to plain popularity even if the user has a profile.
  // Lets the parent toggle "추천순" vs "인기순" without juggling two hooks.
  disabled?: boolean;
}

export interface PersonalizedTipVideosResult {
  data: TipVideo[];
  isLoading: boolean;
  isError: boolean;
  // True only when the result is actually re-ranked from the popularity baseline.
  isPersonalized: boolean;
  factors: CurationFactors | null;
}

/**
 * Wraps `useTipVideos` and re-ranks the result by user-specific signals
 * (wedding date phase, style hints, recency). Over-fetches by ~3x so the
 * re-ranker has enough candidates to actually move things around.
 */
export function usePersonalizedTipVideos(
  opts: Options = {}
): PersonalizedTipVideosResult {
  const { category, limit = 12, disabled = false } = opts;
  const profile = useWeddingProfile();

  // Over-fetch: re-ranking needs a wider candidate pool than the visible limit.
  const fetchLimit = Math.max(limit * 3, 30);
  const { data, isLoading, isError } = useTipVideos({
    category,
    limit: fetchLimit,
    freshOnly: false,
  });

  const { ranked, factors, isPersonalized } = useMemo(() => {
    const videos = data ?? [];
    if (disabled || !profile.isLoaded) {
      return {
        ranked: videos.slice(0, limit),
        factors: null as CurationFactors | null,
        isPersonalized: false,
      };
    }
    const f = buildCurationFactors(profile);
    if (!f.hasSignal) {
      return { ranked: videos.slice(0, limit), factors: f, isPersonalized: false };
    }
    return {
      ranked: rankTipVideosForUser(videos, profile, { limit }),
      factors: f,
      isPersonalized: true,
    };
  }, [data, profile, limit, disabled]);

  return { data: ranked, isLoading, isError, isPersonalized, factors };
}
