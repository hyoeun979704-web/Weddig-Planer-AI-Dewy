import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFilterStore, FilterState } from "@/stores/useFilterStore";

const VENUES_PER_PAGE = 10;

export interface Venue {
  id: string;
  name: string;
  address: string;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  price_per_person: number;
  min_guarantee: number;
  is_partner: boolean;
  created_at: string;
  updated_at: string;
  hall_types: string[] | null;
  meal_options: string[] | null;
  event_options: string[] | null;
}

interface PlaceRow {
  place_id: string;
  category: string;
  name: string;
  city: string | null;
  district: string | null;
  main_image_url: string | null;
  tags: string[] | null;
  avg_rating: string | number | null;
  review_count: number | null;
  min_price: string | number | null;
  min_guarantee: number | null;
  is_partner: boolean | null;
  created_at: string;
  updated_at: string;
}

const placeToVenue = (p: PlaceRow): Venue => ({
  id: p.place_id,
  name: p.name,
  address: [p.city, p.district].filter(Boolean).join(" "),
  thumbnail_url: p.main_image_url,
  rating: Number(p.avg_rating) || 0,
  review_count: p.review_count || 0,
  price_per_person: Number(p.min_price) || 0,
  min_guarantee: p.min_guarantee || 0,
  is_partner: p.is_partner ?? false,
  created_at: p.created_at,
  updated_at: p.updated_at,
  hall_types: null,
  meal_options: null,
  event_options: null,
});

interface FetchVenuesParams {
  pageParam: number;
  filters: FilterState;
  partnersOnly?: boolean;
}

const fetchVenues = async ({ pageParam = 0, filters, partnersOnly = false }: FetchVenuesParams) => {
  const from = pageParam * VENUES_PER_PAGE;
  const to = from + VENUES_PER_PAGE - 1;

  let query = supabase
    .from("places" as any)
    .select("*", { count: "exact" })
    .eq("category", "wedding_hall")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (partnersOnly) {
    query = query.eq("is_partner", true);
  }

  if (filters.region) {
    query = query.or(`city.ilike.%${filters.region}%,district.ilike.%${filters.region}%`);
  }

  if (filters.maxPrice) {
    query = query.lte("min_price", filters.maxPrice);
  }

  if (filters.minRating) {
    query = query.gte("avg_rating", filters.minRating);
  }

  const { data, error, count } = await query
    .order("avg_rating", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const venues = ((data || []) as unknown as PlaceRow[]).map(placeToVenue);

  return {
    venues,
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
        .from("places" as any)
        .select("*")
        .eq("place_id", id)
        .maybeSingle();

      if (error) throw error;
      const venue = data ? placeToVenue(data as unknown as PlaceRow) : null;
      return { venues: venue ? [venue] : [], nextPage: undefined, totalCount: venue ? 1 : 0 };
    },
    getNextPageParam: () => undefined,
    initialPageParam: 0,
    enabled: !!id,
  });
};
