import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import type { ItemType } from "@/hooks/useFavorites";

interface FavoriteRow {
  id: string;
  user_id: string;
  item_id: string;
  item_type: string;
  created_at: string;
}

export type Ownership = "mine" | "partner" | "both";

export interface MergedFavorite {
  item_id: string;
  item_type: ItemType;
  ownership: Ownership;
  /** Whichever side's row is most recent — used for "recent" sort. */
  latestCreatedAt: string;
  /** My row.id, if I'm one of the owners. Needed for the heart-toggle remove path. */
  myFavRowId: string | null;
  /** Partner's row.id. Mostly informational for the future (notes etc). */
  partnerFavRowId: string | null;
}

// Fetches favorites for the current user *and* the linked partner (if any),
// then merges by (item_id, item_type). Useful for the Favorites page where
// we want to render both sides + an "together first → recent" sort.
//
// We keep the original `useFavorites` hook for the toggle path (FavoriteButton,
// detail pages) — that one fetches only the user's own list and powers
// add/remove mutations. This hook is read-only.
export const useCoupleFavorites = () => {
  const { user } = useAuth();
  const { coupleLink, partnerProfile, isLinked, isLoading: linkLoading } = useCoupleLink();

  const partnerId = useMemo(() => {
    if (!isLinked || !coupleLink || !user) return null;
    return coupleLink.user_id === user.id ? coupleLink.partner_user_id : coupleLink.user_id;
  }, [coupleLink, isLinked, user]);

  const userIds = useMemo(() => {
    const ids: string[] = [];
    if (user?.id) ids.push(user.id);
    if (partnerId) ids.push(partnerId);
    return ids;
  }, [user?.id, partnerId]);

  const { data: rows = [], isLoading: rowsLoading } = useQuery({
    queryKey: ["couple-favorites", userIds.join(",")],
    queryFn: async (): Promise<FavoriteRow[]> => {
      if (userIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("favorites")
        .select("id, user_id, item_id, item_type, created_at")
        .in("user_id", userIds);
      if (error) throw error;
      return (data || []) as FavoriteRow[];
    },
    enabled: userIds.length > 0,
  });

  const merged: MergedFavorite[] = useMemo(() => {
    const byKey = new Map<string, MergedFavorite>();
    for (const row of rows) {
      const key = `${row.item_type}:${row.item_id}`;
      const isMine = row.user_id === user?.id;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          item_id: row.item_id,
          item_type: row.item_type as ItemType,
          ownership: isMine ? "mine" : "partner",
          latestCreatedAt: row.created_at,
          myFavRowId: isMine ? row.id : null,
          partnerFavRowId: isMine ? null : row.id,
        });
      } else {
        // Second row for the same item — must be the other side.
        existing.ownership = "both";
        if (isMine) existing.myFavRowId = row.id;
        else existing.partnerFavRowId = row.id;
        // Keep the most recent timestamp for sorting purposes.
        if (row.created_at > existing.latestCreatedAt) {
          existing.latestCreatedAt = row.created_at;
        }
      }
    }
    return Array.from(byKey.values());
  }, [rows, user?.id]);

  const isLoading = linkLoading || rowsLoading;

  return {
    merged,
    isLinked,
    partnerProfile,
    isLoading,
  };
};
