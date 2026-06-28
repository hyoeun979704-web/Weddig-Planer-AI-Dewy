import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CouplePartner {
  /** The linked partner's user_id, or null when not linked. */
  partnerId: string | null;
  /** The link creator's user_id (couple_links.user_id). Canonical owner of the
   *  couple's singleton rows — e.g. the shared budget_settings. */
  linkOwnerId: string | null;
  isLinked: boolean;
}

const EMPTY: CouplePartner = { partnerId: null, linkOwnerId: null, isLinked: false };

// Shared, cached lookup of the current user's linked partner. useBudget /
// useWeddingSchedule use it to widen their queries to .in("user_id",
// [me, partner]) so a linked couple sees one shared budget/schedule.
//
// Deliberately lightweight (one row, no profile/self-recovery) so React Query
// can dedupe it across every page that shares couple data. The richer
// useCoupleLink (profiles, resync, invite codes) stays for the link UI.
export const useCouplePartnerId = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<CouplePartner>({
    queryKey: ["couple-partner-id", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return EMPTY;
      const { data: rows, error } = await (supabase
        .from("couple_links" as any)
        .select("user_id, partner_user_id") as any)
        .or(`user_id.eq.${user.id},partner_user_id.eq.${user.id}`)
        .eq("status", "linked")
        .order("linked_at", { ascending: false, nullsFirst: false })
        .limit(1);
      if (error) throw error;

      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!row) return EMPTY;
      const partnerId =
        row.user_id === user.id ? row.partner_user_id : row.user_id;
      return {
        partnerId: partnerId ?? null,
        linkOwnerId: row.user_id ?? null,
        isLinked: !!partnerId,
      };
    },
  });

  return {
    partnerId: data?.partnerId ?? null,
    linkOwnerId: data?.linkOwnerId ?? null,
    isLinked: data?.isLinked ?? false,
    isLoading,
  };
};
