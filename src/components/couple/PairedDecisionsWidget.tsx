import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import chevronRightIcon from "@/assets/icons/chevron-right.svg";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupleLink } from "@/hooks/useCoupleLink";

interface FavRow {
  item_id: string;
  item_type: string;
}

/**
 * "함께 결정 대기" widget.
 *
 * Renders nothing unless the user is in a linked couple and there is a real
 * gap between their favorites — i.e. one side has favorited an item the
 * other hasn't. The card surfaces the count and routes to the favorites
 * page with the relevant filter so the couple can resolve disagreements
 * intentionally rather than letting them drift.
 *
 * The same data could power per-card "신랑만 찜" pills later; for Phase 1
 * we just want a single visible pulse on the Schedule home that says
 * "this app knows you're two people, not one".
 */
const PairedDecisionsWidget = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLinked, partnerUserId, partnerProfile } = useCoupleLink();

  const enabled = !!user && isLinked && !!partnerUserId;

  const { data, isLoading } = useQuery({
    queryKey: ["paired-favorites-gap", user?.id, partnerUserId],
    queryFn: async () => {
      if (!user || !partnerUserId) return { mineOnly: 0, theirsOnly: 0, both: 0 };

      const [mineRes, theirsRes] = await Promise.all([
        (supabase as any)
          .from("favorites")
          .select("item_id, item_type")
          .eq("user_id", user.id),
        (supabase as any)
          .from("favorites")
          .select("item_id, item_type")
          .eq("user_id", partnerUserId),
      ]);

      const mine: FavRow[] = mineRes.data || [];
      const theirs: FavRow[] = theirsRes.data || [];

      const key = (f: FavRow) => `${f.item_type}:${f.item_id}`;
      const mineSet = new Set(mine.map(key));
      const theirsSet = new Set(theirs.map(key));

      let mineOnly = 0;
      let theirsOnly = 0;
      let both = 0;
      for (const k of mineSet) {
        if (theirsSet.has(k)) both++;
        else mineOnly++;
      }
      for (const k of theirsSet) if (!mineSet.has(k)) theirsOnly++;

      return { mineOnly, theirsOnly, both };
    },
    enabled,
    staleTime: 60_000,
  });

  const partnerLabel = useMemo(
    () => partnerProfile?.display_name?.trim() || "파트너",
    [partnerProfile]
  );

  if (!enabled || isLoading || !data) return null;

  const { mineOnly, theirsOnly, both } = data;
  const totalGap = mineOnly + theirsOnly;

  // Don't show the widget at all if there's nothing to act on. Empty state
  // for a couple with zero favorites would just be noise.
  if (totalGap === 0 && both === 0) return null;

  return (
    <button
      onClick={() => navigate("/favorites")}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl border border-border text-left active:scale-[0.99] transition-transform"
      aria-label="함께 결정 대기 중인 찜 보기"
    >
      <div className="w-10 h-10 rounded-xl bg-[hsl(var(--pink-100))] flex items-center justify-center shrink-0 relative">
        <Heart className="w-5 h-5 text-primary fill-primary" />
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#7BB6E0] ring-2 ring-white"
        />
      </div>

      <div className="flex-1 min-w-0">
        {totalGap > 0 ? (
          <>
            <p className="text-[15px] font-bold text-foreground">
              함께 봐줄 항목 {totalGap}개
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {mineOnly > 0 && theirsOnly > 0
                ? `내가 찜 ${mineOnly} · ${partnerLabel}이 찜 ${theirsOnly}`
                : mineOnly > 0
                  ? `${partnerLabel}에게 보여줄 찜 ${mineOnly}개`
                  : `${partnerLabel}이 골라둔 ${theirsOnly}개`}
              {both > 0 ? ` · 둘 다 좋아한 ${both}` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-bold text-foreground">
              둘 다 좋아한 항목 {both}개
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              취향이 잘 맞아요 💕
            </p>
          </>
        )}
      </div>

      <img src={chevronRightIcon} alt="" className="w-1.5 h-[9px] shrink-0" />
    </button>
  );
};

export default PairedDecisionsWidget;
