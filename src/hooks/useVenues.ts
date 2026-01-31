import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFilterStore, FilterState } from "@/stores/useFilterStore";

const VENUES_PER_PAGE = 10;

export interface Venue {
  id: string;
  name: string;
  address: string;
  price_per_person: number;
  min_guarantee: number;
  rating: number;
  review_count: number;
  is_partner: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  hall_types: string[] | null;
  meal_options: string[] | null;
  event_options: string[] | null;
}

interface FetchVenuesParams {
  pageParam: number;
  filters: FilterState;
  partnersOnly?: boolean;
}

const fetchVenues = async ({ pageParam = 0, filters, partnersOnly = false }: FetchVenuesParams) => {
  const from = pageParam * VENUES_PER_PAGE;
  const to = from + VENUES_PER_PAGE - 1;

  let query = supabase
    .from("venues")
    .select("*", { count: "exact" });

  // 파트너 웨딩홀만 표시 (인기 웨딩홀 섹션)
  if (partnersOnly) {
    query = query.eq("is_partner", true);
  }

  // Apply filters
  if (filters.region) {
    query = query.ilike("address", `%${filters.region}%`);
  }

  if (filters.maxPrice) {
    query = query.lte("price_per_person", filters.maxPrice);
  }

  if (filters.maxGuarantee) {
    query = query.lte("min_guarantee", filters.maxGuarantee);
  }

  if (filters.minRating) {
    query = query.gte("rating", filters.minRating);
  }

  // Array containment filters (복수선택)
  if (filters.hallTypes.length > 0) {
    query = query.overlaps("hall_types", filters.hallTypes);
  }

  if (filters.mealOptions.length > 0) {
    query = query.overlaps("meal_options", filters.mealOptions);
  }

  if (filters.eventOptions.length > 0) {
    query = query.overlaps("event_options", filters.eventOptions);
  }

  const { data, error, count } = await query
    .order("is_partner", { ascending: false })
    .order("rating", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    venues: data as Venue[],
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

  // 필터가 활성화되면 모든 웨딩홀 표시, 아니면 partnersOnly 적용
  const showPartnersOnly = partnersOnly && !hasFilters;

  return useInfiniteQuery({
    queryKey: ["venues", filters, showPartnersOnly],
    queryFn: ({ pageParam }) => fetchVenues({ pageParam, filters, partnersOnly: showPartnersOnly }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
};

// Hook for fetching a single venue
export const useVenue = (id: string) => {
  return useInfiniteQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return { venues: data ? [data as Venue] : [], nextPage: undefined, totalCount: data ? 1 : 0 };
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
    enabled: !!id,
  });
};
