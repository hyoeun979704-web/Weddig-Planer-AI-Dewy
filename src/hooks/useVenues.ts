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
}

const fetchVenues = async ({ pageParam = 0, filters }: FetchVenuesParams) => {
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

export const useVenues = () => {
  const { region, maxPrice, maxGuarantee, minRating, hallTypes, mealOptions, eventOptions } = useFilterStore();
  
  const filters: FilterState = {
    region,
    maxPrice,
    maxGuarantee,
    minRating,
    hallTypes,
    mealOptions,
    eventOptions,
  };

  return useInfiniteQuery({
    queryKey: ["venues", filters],
    queryFn: ({ pageParam }) => fetchVenues({ pageParam, filters }),
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
