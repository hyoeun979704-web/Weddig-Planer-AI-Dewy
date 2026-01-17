import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
}

const fetchVenues = async ({ pageParam = 0 }: { pageParam: number }) => {
  const from = pageParam * VENUES_PER_PAGE;
  const to = from + VENUES_PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from("venues")
    .select("*", { count: "exact" })
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
  return useInfiniteQuery({
    queryKey: ["venues"],
    queryFn: fetchVenues,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
};
