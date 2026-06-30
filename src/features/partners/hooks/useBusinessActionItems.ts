import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessQuoteFunnel } from "@/hooks/useQuotes";

// 대시보드 "오늘 할 일"(액션큐) 집계 — 분산 surface 의 미처리 건수를 한 곳으로(S2).
// 소스(전부 DB 선확인 완료):
//  - 미응답 견적: get_business_quote_funnel RPC(leads-responded, per-business)
//  - 미답변 문의: place_inquiries.status='open'
//  - 미답글 후기: place_reviews.owner_response IS NULL
//  - 진행 예정 이벤트: business_events.starts_at >= now
// count head 쿼리 4건 병렬(N+1 회피). RLS 가 본인 업체 행만 내려준다.

export interface BizActionItem {
  key: "leads" | "inquiries" | "reviews" | "events";
  label: string;
  count: number;
  href: string;
}

/** count head 쿼리 1건 → 숫자(에러·null 은 0 으로 우아하게 폴백). */
async function countOf(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await query;
  return error ? 0 : count ?? 0;
}

export function useBusinessActionItems(placeId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ["biz-action-items", placeId],
    queryFn: async () => {
      // business_events.starts_at 는 DATE 컬럼 → 날짜(YYYY-MM-DD)로 비교(시간 포함 ISO 와
      // 비교하면 '오늘 시작' 이벤트가 자정 이후 빠지는 버그). 임박/진행 예정 = 오늘 이후.
      const today = new Date().toISOString().slice(0, 10);
      const [inquiries, reviews, events, funnel] = await Promise.all([
        placeId
          ? countOf(supabase.from("place_inquiries").select("*", { count: "exact", head: true }).eq("place_id", placeId).eq("status", "open"))
          : 0,
        placeId
          ? countOf(supabase.from("place_reviews").select("*", { count: "exact", head: true }).eq("place_id", placeId).is("owner_response", null))
          : 0,
        placeId
          // 승인된(노출 중) 진행 예정 이벤트만 — pending/rejected 는 '할 일'이 아님.
          ? countOf(supabase.from("business_events").select("*", { count: "exact", head: true }).eq("place_id", placeId).eq("moderation_status", "approved").gte("starts_at", today))
          : 0,
        getBusinessQuoteFunnel().catch(() => null),
      ]);
      // 미응답 리드 = 받은 리드 중 아직 응답 안 한 건(음수 방지).
      const leads = funnel ? Math.max(0, funnel.leads - funnel.responded) : 0;
      return {
        inquiries,
        reviews,
        events,
        leads,
        totalLeads: funnel?.leads ?? 0,
        responded: funnel?.responded ?? 0,
      };
    },
    staleTime: 30_000,
  });

  const c = data ?? { inquiries: 0, reviews: 0, events: 0, leads: 0, totalLeads: 0, responded: 0 };
  const items: BizActionItem[] = [
    { key: "leads", label: "미응답 견적 요청", count: c.leads, href: "/business/leads" },
    { key: "inquiries", label: "답변 안 한 문의", count: c.inquiries, href: "/business/inquiries" },
    { key: "reviews", label: "답글 안 단 후기", count: c.reviews, href: "/business/reviews" },
    { key: "events", label: "진행 예정 이벤트", count: c.events, href: "/business/events" },
  ];
  return {
    items,
    total: items.reduce((sum, i) => sum + i.count, 0),
    isLoading,
    // 대시보드 핵심 지표(허영 스탯 대체) — 받은 리드·응답률.
    totalLeads: c.totalLeads,
    responseRate: c.totalLeads > 0 ? Math.round((c.responded / c.totalLeads) * 100) : null,
  };
}
