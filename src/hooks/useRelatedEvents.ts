import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * 이벤트 상세 하단 "관련 이벤트" — **큐레이션 필터링 적용**(추천 섹션 공통 규칙).
 *
 * 원천 덤프 금지. 큐레이션 기준:
 *  1) 활성 업체(places.is_active) + 같은 카테고리
 *  2) 승인된 이벤트(moderation_status = approved) + 진행 중(ends_at 미지정 또는 오늘 이후)
 *  3) 제휴 등급(partner_rank) 우선 정렬 — 기존 추천(usePlaceRecommendations)과 동일 패턴
 * 현재 이벤트는 제외. 결과 없으면 호출부에서 섹션 숨김.
 */

const pub = (url?: string | null): string | null => {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  try { return supabase.storage.from("vendor-images").getPublicUrl(url).data.publicUrl || url; } catch { return url; }
};

export interface RelatedEvent {
  id: string;
  place_id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  thumb: string | null;
  placeName: string | null;
  partner_rank: number;
}

const LIMIT = 6;

export function useRelatedEvents(opts: { category?: string | null; excludeEventId?: string | null }) {
  const { category, excludeEventId } = opts;
  return useQuery({
    queryKey: ["related-events", category, excludeEventId],
    enabled: !!category && !!excludeEventId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RelatedEvent[]> => {
      // 1) 같은 카테고리 활성 업체 (큐레이션 게이트 + 제휴등급 우선)
      const { data: places } = await (supabase
        .from("places")
        .select("place_id, name, main_image_url, partner_rank")
        .eq("is_active", true)
        .eq("category", category as string)
        .order("partner_rank", { ascending: false })
        .limit(40) as any);
      const rows = (places ?? []) as { place_id: string; name: string | null; main_image_url: string | null; partner_rank: number | null }[];
      if (rows.length === 0) return [];
      const pmap = new Map(rows.map((p) => [p.place_id, p]));
      const ids = rows.map((p) => p.place_id);

      // 2) 승인 + 진행 중 이벤트(현재 제외)
      const { data: evs } = await (supabase
        .from("business_events" as any)
        .select("id, place_id, title, starts_at, ends_at, banner_image_url")
        .in("place_id", ids)
        .eq("moderation_status", "approved")
        .neq("id", excludeEventId as string)
        .order("created_at", { ascending: false })
        .limit(24) as any);

      const today = new Date().toISOString().slice(0, 10);
      return ((evs ?? []) as any[])
        .filter((e) => e.id !== excludeEventId)                 // 현재 이벤트 제외(방어적)
        .filter((e) => !e.ends_at || e.ends_at >= today)        // 진행 중만
        .map((e) => {
          const p = pmap.get(e.place_id);
          return {
            id: e.id, place_id: e.place_id, title: e.title,
            starts_at: e.starts_at ?? null, ends_at: e.ends_at ?? null,
            // 배너 없으면 업체 대표이미지 폴백(빈 썸네일 방지).
            thumb: pub(e.banner_image_url) ?? pub(p?.main_image_url ?? null),
            placeName: p?.name ?? null,
            partner_rank: p?.partner_rank ?? 0,
          } as RelatedEvent;
        })
        // 큐레이션 정렬: 제휴 등급 우선(stable → 같은 등급은 최신순 유지)
        .sort((a, b) => b.partner_rank - a.partner_rank)
        .slice(0, LIMIT);
    },
  });
}
