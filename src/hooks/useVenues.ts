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

  let query = supabase
    .from("places")
    .select("*, place_wedding_halls(*)", { count: "exact" })
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

  // 보증인원 상한/하한. 하한(minGuarantee) 은 P13(호텔 스몰) 같은 케이스에 사용,
  // null 이면 P11(40명 진짜 스몰) 처럼 작은 인원도 포함.
  if (filters.maxGuarantee) {
    query = query.lte("guarantee_count", filters.maxGuarantee);
  }
  if (filters.minGuarantee) {
    query = query.gte("guarantee_count", filters.minGuarantee);
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
