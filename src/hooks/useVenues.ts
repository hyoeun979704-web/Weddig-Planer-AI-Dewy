import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFilterStore, FilterState } from "@/stores/useFilterStore";
import { placeToVenue, Venue } from "@/lib/placeMappers";

export type { Venue };

const VENUES_PER_PAGE = 10;

interface FetchVenuesParams {
  pageParam: number;
  filters: FilterState;
  partnersOnly?: boolean;
}

const fetchVenues = async ({ pageParam = 0, filters, partnersOnly = false }: FetchVenuesParams) => {
  const from = pageParam * VENUES_PER_PAGE;
  const to = from + VENUES_PER_PAGE - 1;

  // Round 13 P0 fix — 보증인원/홀스타일/식사옵션 등 detail 컬럼으로 places 를 거르려면
  // PostgREST embedded resource 의 inner join 필요. 평소엔 detail 없는 row 도 노출하므로
  // 필터 켰을 때만 !inner 로 전환. 기존 코드는 places.guarantee_count 라는 존재하지 않는
  // 컬럼을 쿼리해 SQL error → 사용자가 보증인원 슬라이더 만지면 결과가 전부 사라졌음.
  // Round 15 P1 fix — falsy-zero. `!!(null || 0) === false` 라 사용자가 슬라이더를
  // 0 으로 설정 시 hasGuaranteeFilter=false → outer join → 그러나 line ~52 의 query
  // .gte(`place_wedding_halls.min_guarantee`, 0) 는 그대로 발화 → PostgREST 가 embedded
  // resource filter 적용하려는데 inner 없어 parse 깨짐. null check 명시.
  const hasGuaranteeFilter = filters.maxGuarantee != null || filters.minGuarantee != null;
  const detailSelect = hasGuaranteeFilter
    ? "place_wedding_halls!inner(*)"
    : "place_wedding_halls(*)";

  let query = supabase
    .from("places")
    .select(`*, ${detailSelect}`, { count: "exact" })
    .eq("category", "wedding_hall")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (partnersOnly) {
    query = query.eq("is_partner", true);
  }

  if (filters.region) {
    query = query.ilike("city", `%${filters.region}%`);
  }

  // 시군구 — places.district ILIKE. 시도+시군구 조합으로 P6·P11·P12 페르소나 권역 큐레이션.
  if (filters.sigungu) {
    query = query.ilike("district", `%${filters.sigungu}%`);
  }

  if (filters.maxPrice) {
    query = query.lte("min_price", filters.maxPrice);
  }

  // 보증인원 상·하한 — place_wedding_halls.max_guarantee / min_guarantee 와 매칭.
  // - maxGuarantee 칩(상한): "300명 이하" → DB max_guarantee <= 300
  // - minGuarantee 칩(하한): "50명 이상" → DB min_guarantee >= 50
  // 이전엔 places.guarantee_count(없는 컬럼)로 쿼리해 슬라이더 켜면 결과 전멸.
  // Round 15 — null 명시 가드. 0 은 valid 값(small persona 가 0~ 슬라이더 가능).
  if (filters.maxGuarantee != null) {
    query = query.lte("place_wedding_halls.max_guarantee", filters.maxGuarantee);
  }
  if (filters.minGuarantee != null) {
    query = query.gte("place_wedding_halls.min_guarantee", filters.minGuarantee);
  }

  if (filters.minRating) {
    query = query.gte("avg_rating", filters.minRating);
  }

  // Tag-array filters. `overlaps` ⇒ tags && selectedTags (Postgres &&),
  // so a row matches when its tags share ANY element with the selection
  // — the natural semantic for multi-select within one category. Different
  // categories AND together (e.g. hallType=호텔 AND meal=뷔페).
  if (filters.hallTypes && filters.hallTypes.length > 0) {
    query = query.overlaps("tags", filters.hallTypes);
  }
  if (filters.mealOptions && filters.mealOptions.length > 0) {
    query = query.overlaps("tags", filters.mealOptions);
  }
  if (filters.eventOptions && filters.eventOptions.length > 0) {
    query = query.overlaps("tags", filters.eventOptions);
  }

  // 신뢰도(채움도) 우선, 같으면 평점 — null 데이터 적은 곳이 먼저 노출.
  const { data, error, count } = await query
    .order("data_completeness", { ascending: false })
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw error;

  return {
    venues: ((data ?? []) as unknown as Parameters<typeof placeToVenue>[0][]).map(placeToVenue),
    nextPage: to < (count ?? 0) - 1 ? pageParam + 1 : undefined,
    totalCount: count ?? 0,
  };
};

export const useVenues = (partnersOnly: boolean = false) => {
  const { region, sigungu, maxPrice, maxGuarantee, minGuarantee, minRating, hallTypes, mealOptions, eventOptions } = useFilterStore();
  const hasFilters = !!(
    region || sigungu || maxPrice || maxGuarantee || minGuarantee || minRating ||
    hallTypes.length || mealOptions.length || eventOptions.length
  );

  const filters: FilterState = {
    region,
    sigungu,
    maxPrice,
    maxGuarantee,
    minGuarantee,
    minRating,
    hallTypes,
    mealOptions,
    eventOptions,
  };

  const showPartnersOnly = partnersOnly && !hasFilters;

  return useInfiniteQuery({
    queryKey: ["venues", filters, showPartnersOnly],
    queryFn: ({ pageParam }) => fetchVenues({ pageParam, filters, partnersOnly: showPartnersOnly }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
};

// Single venue (place) by uuid
export const useVenue = (id: string) => {
  return useInfiniteQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("place_id", id)
        .maybeSingle();

      if (error) throw error;
      const venue = data ? placeToVenue(data) : null;
      return { venues: venue ? [venue] : [], nextPage: undefined, totalCount: venue ? 1 : 0 };
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
    enabled: !!id,
  });
};
