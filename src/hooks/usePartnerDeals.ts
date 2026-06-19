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
  // 업체 이벤트(business_events)를 같은 목록에 합칠 때 쓰는 부가 필드.
  kind?: "deal" | "event";
  place_id?: string;          // event → /vendor/:place_id 이동
  has_banner?: boolean;       // '이벤트 상세페이지 등록'(배너 有) = 노출 우선
  is_partner?: boolean;       // 제휴업체 우선
  created_at?: string | null; // 최신순 정렬용
}

// 업체 이미지(vendor-images 공개 버킷) public URL. 경로만 저장된 레거시 행 방어.
const pubUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try { return supabase.storage.from("vendor-images").getPublicUrl(url).data.publicUrl || url; } catch { return url; }
};

// 업체 카테고리(place.category) → 혜택 탭 카테고리 키.
const PLACE_TO_DEAL_CAT: Record<string, string> = {
  wedding_hall: "venue", studio: "studio", dress_shop: "studio", makeup_shop: "studio", honeymoon: "honeymoon",
};

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

      const enriched: PartnerDeal[] = (data || []).map((d: PartnerDeal) => ({
        ...d,
        is_claimed: claimedIds.has(d.id),
        kind: "deal" as const,
        has_banner: !!d.banner_image_url,
        is_partner: false,
      }));

      // 업체가 등록한 이벤트(business_events)도 같은 '전체 혜택' 목록에 노출(별도 페이지 X).
      // 운영자 검토 통과 + 진행 중인 것만. 업체 카테고리를 혜택 카테고리로 매핑해 필터에 반영.
      const nowIso = new Date().toISOString();
      const { data: evs } = await (supabase
        .from("business_events" as any)
        .select("id, place_id, title, description, banner_image_url, featured_until, ends_at, created_at") as any)
        .eq("moderation_status", "approved")
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(80);

      let eventItems: PartnerDeal[] = [];
      if (evs && evs.length) {
        const ids = Array.from(new Set((evs as any[]).map((e) => e.place_id)));
        const { data: places } = await (supabase
          .from("places" as any)
          .select("place_id, name, category, is_partner, main_image_url") as any)
          .in("place_id", ids);
        const pmap = new Map<string, any>(((places as any[]) || []).map((p) => [p.place_id, p]));
        const now = Date.now();
        eventItems = (evs as any[]).map((e) => {
          const p = pmap.get(e.place_id);
          const isPartner = p?.is_partner === true;
          return {
            id: `evt_${e.id}`,
            title: e.title,
            description: e.description ?? "",
            short_description: e.description ?? null,
            partner_name: p?.name ?? "입점 업체",
            partner_logo_url: null,
            // 따로 지정한 배너가 없으면 업체 대표이미지로 폴백(빈 썸네일 방지).
            banner_image_url: pubUrl(e.banner_image_url) ?? pubUrl(p?.main_image_url),
            category: PLACE_TO_DEAL_CAT[p?.category] ?? "general",
            deal_type: "event",
            discount_info: null, original_price: null, deal_price: null,
            coupon_code: null, external_url: null, terms: null,
            start_date: null, end_date: e.ends_at ?? null,
            is_featured: (!!e.featured_until && new Date(e.featured_until).getTime() > now) || isPartner,
            view_count: 0, claim_count: 0,
            kind: "event" as const, place_id: e.place_id,
            has_banner: !!e.banner_image_url, is_partner: isPartner, created_at: e.created_at ?? null,
          } as PartnerDeal;
        });
        if (category && category !== "all") {
          eventItems = eventItems.filter((it) => it.category === category);
        }
      }

      // 이벤트를 앞에 두되 최종 정렬은 화면(Deals)에서 노출 순위 규칙으로 처리.
      const merged = [...eventItems, ...enriched];
      setDeals(merged);
      setFeatured(merged.filter((d) => d.is_featured));
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

      toast.success("혜택을 받았어요! ");
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
          .then(() => {}, () => {}); // fire-and-forget: 실패해도 무시하되 unhandled rejection 방지
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
