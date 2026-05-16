import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { computeGuestStats, type GuestItem } from "@/lib/guestList";

export type GuestDraft = Pick<
  GuestItem,
  "name" | "side" | "relationship" | "rsvp_status" | "attending_count" | "contact" | "notes"
>;

export const useGuestList = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ["guest-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("guest_list_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuestItem[];
    },
  });

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const stats = useMemo(() => computeGuestStats(items), [items]);

  const addGuest = useMutation({
    mutationFn: async (draft: GuestDraft) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const { error } = await (supabase as any)
        .from("guest_list_items")
        .insert({ user_id: user.id, ...draft });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guest-list", user?.id] }),
    onError: (e) => toast.error("추가 실패", { description: e instanceof Error ? e.message : "" }),
  });

  const updateGuest = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<GuestDraft> }) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const { error } = await (supabase as any)
        .from("guest_list_items")
        .update(patch)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guest-list", user?.id] }),
    onError: (e) => toast.error("수정 실패", { description: e instanceof Error ? e.message : "" }),
  });

  const deleteGuest = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const { error } = await (supabase as any)
        .from("guest_list_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guest-list", user?.id] }),
    onError: (e) => toast.error("삭제 실패", { description: e instanceof Error ? e.message : "" }),
  });

  return {
    items,
    stats,
    isLoading: itemsQuery.isLoading,
    addGuest,
    updateGuest,
    deleteGuest,
  };
};
