import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFilterStore, FilterState } from "@/stores/useFilterStore";

const VENUES_PER_PAGE = 10;

export interface Venue {
  number: number;
  name: string;
  address: string;
  phone: string | null;
  rating: string | null;
  thumbnail_url: string | null;
  opening_hour: string | null;
  parking_info: string | null;
  region: string | null;
  price_min: number | null;
  price_max: number | null;
  created_at: string;
  public_transit: string | null;
  parking_time: string | null;
  keyword: string | null;
  venue_id: number | null;
}

// Helper: venues 테이블의 PK는 number(int4)입니다
// venue_halls, venue_special_points는 venue_id(int4)로 연결됩니다

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

  // Apply filters
  if (filters.region) {
    query = query.ilike("address", `%${filters.region}%`);
  }

  if (filters.maxPrice) {
    query = query.lte("price_min", filters.maxPrice);
  }

  if (filters.minRating) {
    query = query.gte("rating", filters.minRating);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
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
        .eq("number", parseInt(id))
        .maybeSingle();

      if (error) throw error;
      return { venues: data ? [data as Venue] : [], nextPage: undefined, totalCount: data ? 1 : 0 };
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
    enabled: !!id,
  });
};
