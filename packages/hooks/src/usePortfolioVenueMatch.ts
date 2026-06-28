// "같은 식장 포폴 우선" 매칭용 — 주어진 업체(place_id)들의 포트폴리오 진행 장소
// (place_media.venue_place_id / venue_name)를 한 번의 벌크 쿼리로 가져와 업체별로
// 묶는다(N+1 방지). 설계: docs/260616_reference_matching_design.md §3.5.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PortfolioVenue } from "@/lib/venueMatch";

export function usePortfolioVenueMatch(placeIds: string[]) {
  // 키를 정렬·고정해 같은 집합이면 캐시 재사용.
  const key = [...placeIds].sort();
  return useQuery({
    queryKey: ["portfolio-venues", key],
    enabled: placeIds.length > 0,
    queryFn: async (): Promise<Map<string, PortfolioVenue[]>> => {
      const { data, error } = await (supabase as any)
        .from("place_media")
        .select("place_id, venue_place_id, venue_name")
        .in("place_id", key)
        .or("venue_place_id.not.is.null,venue_name.not.is.null");
      if (error) {
        console.error("usePortfolioVenueMatch load failed", error);
        return new Map();
      }
      const map = new Map<string, PortfolioVenue[]>();
      for (const row of (data ?? []) as Array<{ place_id: string; venue_place_id: string | null; venue_name: string | null }>) {
        const list = map.get(row.place_id) ?? [];
        list.push({ venuePlaceId: row.venue_place_id, venueName: row.venue_name });
        map.set(row.place_id, list);
      }
      return map;
    },
  });
}
