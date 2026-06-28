import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { computeGuestStats, type GuestItem } from "@/lib/guestList";
import { trackEvent } from "@/lib/track";

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
    // 개인 데이터 — 변경은 mutation 이 invalidate 하므로 탭 복귀마다 refetch 불필요.
    staleTime: 60_000,
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
    onSuccess: (_data, draft) => {
      qc.invalidateQueries({ queryKey: ["guest-list", user?.id] });
      trackEvent("guest_added", {
        side: draft.side,
        rsvp_status: draft.rsvp_status,
        attending_count: draft.attending_count,
      });
    },
    onError: (e) => toast.error("추가 실패", { description: e instanceof Error ? e.message : "" }),
  });

  const updateGuest = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<GuestDraft> }) => {
      if (!user) throw new Error("로그인이 필요합니다");
      // RSVP 변경은 별도 이벤트로 트래킹 — 응답 수집 흐름을 보기 위해.
      // 이전 값과 비교해야 정확하므로 update 직전에 현재 값을 한 번 읽음.
      let previousRsvp: string | null = null;
      if (patch.rsvp_status) {
        const prev = items.find((g) => g.id === id);
        previousRsvp = prev?.rsvp_status ?? null;
      }
      const { error } = await (supabase as any)
        .from("guest_list_items")
        .update(patch)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      return { previousRsvp };
    },
    onSuccess: (result, { patch }) => {
      qc.invalidateQueries({ queryKey: ["guest-list", user?.id] });
      if (patch.rsvp_status && patch.rsvp_status !== result?.previousRsvp) {
        trackEvent("guest_rsvp_changed", {
          from: result?.previousRsvp ?? null,
          to: patch.rsvp_status,
        });
      }
    },
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
