import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { useFavorites, type ItemType } from "@/hooks/useFavorites";

interface PartnerFavorite {
  item_id: string;
  item_type: string;
}

/**
 * Pair-aware view layer over `useFavorites`.
 *
 * Returns the same `isFavorite` / `toggleFavorite` API as `useFavorites`, plus
 * `partnerLikes(itemId, itemType)` — which says whether the linked partner
 * (if any) has already favorited the same item. Anywhere the bare
 * <FavoriteButton> renders, we can layer a small partner-dot indicator that
 * makes "둘이 같이 봐주세요 / 둘 다 좋아해요" status visible at a glance.
 *
 * If the user isn't linked to a partner yet, partnerLikes() always returns
 * false and the consumer naturally falls back to solo-favorites UX.
 */
export const useCoupleFavorites = () => {
  const solo = useFavorites();
  const { partnerUserId, isLinked } = useCoupleLink();

  const { data: partnerFavorites = [], isLoading: partnerLoading } = useQuery<
    PartnerFavorite[]
  >({
    queryKey: ["favorites", "partner", partnerUserId],
    queryFn: async (): Promise<PartnerFavorite[]> => {
      if (!partnerUserId) return [];
      const { data, error } = await (supabase as any)
        .from("favorites")
        .select("item_id, item_type")
        .eq("user_id", partnerUserId);
      if (error) throw error;
      return (data || []) as PartnerFavorite[];
    },
    enabled: isLinked && !!partnerUserId,
    staleTime: 30_000,
  });

  const partnerSet = useMemo(() => {
    const s = new Set<string>();
    for (const f of partnerFavorites) s.add(`${f.item_type}:${f.item_id}`);
    return s;
  }, [partnerFavorites]);

  const partnerLikes = (itemId: string, itemType: ItemType): boolean =>
    partnerSet.has(`${itemType}:${itemId}`);

  return {
    ...solo,
    isLinked,
    partnerLikes,
    partnerFavoritesLoading: partnerLoading,
  };
};
