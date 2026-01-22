import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ItemType = "venue" | "studio" | "honeymoon" | "honeymoon_gift" | "appliance" | "suit" | "hanbok" | "invitation_venues";

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

  const { data: favorites = [], isLoading } = useQuery<Favorite[]>({
    queryKey: ["favorites", user?.id],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
      toast.success("찜 목록에 추가되었습니다");
    },
    onError: (error) => {
      toast.error("찜하기에 실패했습니다");
      console.error(error);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
      toast.success("찜 목록에서 제거되었습니다");
    },
    onError: (error) => {
      toast.error("찜 해제에 실패했습니다");
      console.error(error);
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
