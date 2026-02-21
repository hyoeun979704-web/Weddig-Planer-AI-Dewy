import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PartnerDeal {
  id: string;
  title: string;
  description: string;
  short_description: string | null;
  partner_name: string;
  partner_logo_url: string | null;
  banner_image_url: string | null;
  category: string;
  deal_type: string;
  discount_info: string | null;
  original_price: number | null;
  deal_price: number | null;
  coupon_code: string | null;
  external_url: string | null;
  terms: string | null;
  start_date: string | null;
  end_date: string | null;
  is_featured: boolean;
  view_count: number;
  claim_count: number;
  is_claimed?: boolean;
}

const categoryLabels: Record<string, string> = {
  all: "전체",
  venue: "웨딩홀",
  studio: "스튜디오",
  dress: "드레스",
  makeup: "메이크업",
  honeymoon: "허니문",
  gift: "예물",
  interior: "혼수/인테리어",
  general: "기타",
};

export const useDealCategoryLabels = () => categoryLabels;

export const usePartnerDeals = (category?: string) => {
  const { user } = useAuth();
  const [deals, setDeals] = useState<PartnerDeal[]>([]);
  const [featured, setFeatured] = useState<PartnerDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeals = useCallback(async () => {
    try {
      let query = (supabase
        .from("partner_deals" as any)
        .select("*") as any)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (category && category !== "all") {
        query = query.eq("category", category) as any;
      }

      const { data, error } = await query;
      if (error) throw error;

      let claimedIds = new Set<string>();
      if (user) {
        const { data: claims } = await (supabase
          .from("deal_claims" as any)
          .select("deal_id") as any)
          .eq("user_id", user.id);
        claimedIds = new Set((claims || []).map((c: any) => c.deal_id));
      }

      const enriched = (data || []).map((d: PartnerDeal) => ({
        ...d,
        is_claimed: claimedIds.has(d.id),
      }));

      setDeals(enriched);
      setFeatured(enriched.filter((d: PartnerDeal) => d.is_featured));
    } catch (error) {
      console.error("Error fetching deals:", error);
    } finally {
      setIsLoading(false);
    }
  }, [category, user]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const claimDeal = async (dealId: string): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }

    try {
      const { error } = await (supabase
        .from("deal_claims" as any) as any)
        .insert({ deal_id: dealId, user_id: user.id });

      if (error) {
        if (error.code === "23505") {
          toast.info("이미 받은 혜택이에요");
          return false;
        }
        throw error;
      }

      // claim_count 증가
      await (supabase.rpc as any)("increment_claim_count", { deal_id: dealId }).catch(() => {});

      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, is_claimed: true, claim_count: d.claim_count + 1 } : d
        )
      );

      toast.success("혜택을 받았어요! 🎉");
      return true;
    } catch (error) {
      console.error("Error claiming deal:", error);
      toast.error("혜택 받기에 실패했습니다");
      return false;
    }
  };

  return { deals, featured, isLoading, claimDeal, refetch: fetchDeals };
};

export const usePartnerDealDetail = (id: string | undefined) => {
  const { user } = useAuth();
  const [deal, setDeal] = useState<PartnerDeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetch = async () => {
      try {
        const { data, error } = await (supabase
          .from("partner_deals" as any)
          .select("*") as any)
          .eq("id", id)
          .single();

        if (error) throw error;

        let isClaimed = false;
        if (user) {
          const { data: claim } = await (supabase
            .from("deal_claims" as any)
            .select("id") as any)
            .eq("deal_id", id)
            .eq("user_id", user.id)
            .maybeSingle();
          isClaimed = !!claim;
        }

        setDeal({ ...data, is_claimed: isClaimed });

        // view_count 증가 (fire and forget)
        supabase
          .from("partner_deals" as any)
          .update({ view_count: ((data as any).view_count || 0) + 1 } as any)
          .eq("id", id)
          .then(() => {});
      } catch (error) {
        console.error("Error fetching deal detail:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [id, user]);

  return { deal, isLoading };
};
