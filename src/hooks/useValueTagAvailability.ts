import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLACE_VALUE_TAG_OPTIONS } from "@/lib/placeValueTags";

/**
 * 카테고리별로 각 가치 태그가 places.tags 에 실제로 몇 건 있는지 1회 조회.
 * 페르소나 v2 회고의 W1 가드 — 데이터 0건인 칩을 disabled 로 표시해
 * "필터 켜도 결과 0" 으로 인한 신뢰 손상을 막는다.
 *
 * 결과는 react-query 캐시에 카테고리 단위로 보관되어 페이지 전환마다
 * 다시 쿼리되지 않는다. 백오피스에서 태그를 추가하면 stale-time(60초) 후
 * 자동으로 다시 받아오므로 별도 invalidation 없이도 곧 활성화된다.
 */
export const useValueTagAvailability = (placeCategory: string) => {
  return useQuery({
    queryKey: ["value-tag-availability", placeCategory],
    staleTime: 60_000,
    queryFn: async () => {
      // tag별 COUNT 를 한 번에 받기 위해 4건의 head: true 카운트 쿼리를
      // 병렬 실행. 데이터 페치 없이 count 만 받아 round-trip 4번이지만
      // 가벼움. UNION 으로 묶을 수도 있지만 가독성을 위해 분리.
      const results = await Promise.all(
        PLACE_VALUE_TAG_OPTIONS.map(async (opt) => {
          const { count, error } = await supabase
            .from("places")
            .select("place_id", { count: "exact", head: true })
            .eq("category", placeCategory)
            .eq("is_active", true)
            .is("deleted_at", null)
            .overlaps("tags", [opt.value]);
          if (error) throw error;
          return [opt.value, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(results) as Record<string, number>;
    },
  });
};
