import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ItemType = "venue" | "studio" | "honeymoon" | "honeymoon_gift" | "appliance" | "suit" | "hanbok" | "invitation_venues" | "community_post" | "deal" | "product" | "influencer";

interface Favorite {
  id: string;
  user_id: string;
  item_id: string;
  item_type: string;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["favorites", user?.id];

  const { data: favorites = [], isLoading } = useQuery<Favorite[]>({
    queryKey,
    queryFn: async (): Promise<Favorite[]> => {
      if (!user) return [];

      // Using type assertion due to types not being synced yet
      const { data, error } = await (supabase as any)
        .from("favorites")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as Favorite[];
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: ItemType }) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await (supabase as any).from("favorites").insert({
        user_id: user.id,
        item_id: itemId,
        item_type: itemType,
      });

      if (error) throw error;
    },
    onMutate: async ({ itemId, itemType }) => {
      // Optimistic add: the heart should fill the instant the user taps it.
      // Async server confirmation is a network detail, not UX.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Favorite[]>(queryKey) ?? [];
      const optimistic: Favorite = {
        id: `optimistic-${itemType}-${itemId}`,
        user_id: user?.id ?? "",
        item_id: itemId,
        item_type: itemType,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Favorite[]>(queryKey, [...previous, optimistic]);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error("찜하기에 실패했어요. 잠시 후 다시 시도해주세요");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async ({ itemId, itemType }: { itemId: string; itemType: ItemType }) => {
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await (supabase as any)
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_id", itemId)
        .eq("item_type", itemType);

      if (error) throw error;
    },
    onMutate: async ({ itemId, itemType }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Favorite[]>(queryKey) ?? [];
      queryClient.setQueryData<Favorite[]>(
        queryKey,
        previous.filter((f) => !(f.item_id === itemId && f.item_type === itemType))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error("찜 해제에 실패했어요. 잠시 후 다시 시도해주세요");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const isFavorite = (itemId: string, itemType: ItemType): boolean => {
    return favorites.some(
      (fav) => fav.item_id === itemId && fav.item_type === itemType
    );
  };

  const toggleFavorite = async (itemId: string, itemType: ItemType) => {
    if (isFavorite(itemId, itemType)) {
      await removeFavorite.mutateAsync({ itemId, itemType });
    } else {
      await addFavorite.mutateAsync({ itemId, itemType });
    }
  };

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    isToggling: addFavorite.isPending || removeFavorite.isPending,
  };
};
