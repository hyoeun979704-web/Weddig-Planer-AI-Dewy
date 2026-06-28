import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  computeRsvpStats,
  rsvpToGuestDraft,
  type InvitationRsvpRow,
} from "@/lib/guestList";
import { trackEvent } from "@/lib/track";

/**
 * 청첩장 소유자용 RSVP 응답 조회 + 하객명단 가져오기.
 * 조회는 invitation_rsvp RLS(생성자만 SELECT)가 인가를 보장한다.
 * 가져오기는 guest_list_items.invitation_rsvp_id 유니크 인덱스로 중복 방지.
 */
export const useInvitationRsvps = (invitationId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const rsvpQuery = useQuery({
    queryKey: ["invitation-rsvps", invitationId],
    enabled: !!user && !!invitationId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invitation_rsvp")
        .select("*")
        .eq("invitation_id", invitationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InvitationRsvpRow[];
    },
  });

  // 이미 명단으로 가져온 RSVP id 집합 — 버튼 상태/중복 안내용.
  const importedQuery = useQuery({
    queryKey: ["guest-list-imported-rsvps", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("guest_list_items")
        .select("invitation_rsvp_id")
        .eq("user_id", user!.id)
        .not("invitation_rsvp_id", "is", null);
      if (error) throw error;
      return new Set<string>(
        (data ?? []).map((r: { invitation_rsvp_id: string }) => r.invitation_rsvp_id),
      );
    },
  });

  const rows = useMemo(() => rsvpQuery.data ?? [], [rsvpQuery.data]);
  const stats = useMemo(() => computeRsvpStats(rows), [rows]);
  const importedIds = importedQuery.data ?? new Set<string>();

  const importToGuestList = useMutation({
    mutationFn: async (targets: InvitationRsvpRow[]) => {
      if (!user) throw new Error("로그인이 필요합니다");
      const fresh = targets.filter((r) => !importedIds.has(r.id));
      if (fresh.length === 0) return { imported: 0, skipped: targets.length };
      const payload = fresh.map((r) => ({
        user_id: user.id,
        invitation_rsvp_id: r.id,
        ...rsvpToGuestDraft(r),
      }));
      const { error } = await (supabase as any)
        .from("guest_list_items")
        .insert(payload);
      if (error) {
        // 23505 = 유니크 위반(동시 가져오기 등) — 사용자에겐 중복 안내만.
        if ((error as { code?: string }).code === "23505") {
          return { imported: 0, skipped: targets.length };
        }
        throw error;
      }
      return { imported: fresh.length, skipped: targets.length - fresh.length };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["guest-list", user?.id] });
      qc.invalidateQueries({ queryKey: ["guest-list-imported-rsvps", user?.id] });
      if (result.imported > 0) {
        toast.success(`하객명단에 ${result.imported}명을 추가했어요`, {
          description: result.skipped > 0 ? `${result.skipped}명은 이미 추가되어 있어요` : undefined,
        });
        trackEvent("rsvp_imported_to_guest_list", { count: result.imported });
      } else {
        toast.info("이미 모두 하객명단에 있어요");
      }
    },
    onError: (e) =>
      toast.error("가져오기 실패", { description: e instanceof Error ? e.message : "" }),
  });

  return {
    rows,
    stats,
    importedIds,
    isLoading: rsvpQuery.isLoading,
    error: rsvpQuery.error,
    importToGuestList,
  };
};
