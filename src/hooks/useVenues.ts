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
    .select("*", { count: "exact" })
    .eq("category", "wedding_hall")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (partnersOnly) {
    query = query.eq("is_partner", true);
  }

  if (filters.region) {
    query = query.ilike("city", `%${filters.region}%`);
  }

  if (filters.maxPrice) {
    query = query.lte("min_price", filters.maxPrice);
  }

  if (filters.minRating) {
    query = query.gte("avg_rating", filters.minRating);
  }

  // 신뢰도(채움도) 우선, 같으면 평점 — null 데이터 적은 곳이 먼저 노출.
  const { data, error, count } = await query
    .order("data_completeness", { ascending: false })
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw error;

  return {
    venues: (data ?? []).map(placeToVenue),
    nextPage: to < (count ?? 0) - 1 ? pageParam + 1 : undefined,
    totalCount: count ?? 0,
  };
};

export const useVenues = (partnersOnly: boolean = false) => {
  const { region, maxPrice, maxGuarantee, minRating, hallTypes, mealOptions, eventOptions } = useFilterStore();
  const hasFilters = !!(region || maxPrice || maxGuarantee || minRating || hallTypes.length || mealOptions.length || eventOptions.length);

  const filters: FilterState = {
    region,
    maxPrice,
    maxGuarantee,
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
