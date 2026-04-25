import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategoryFilterStore, CategoryType } from "@/stores/useCategoryFilterStore";

export interface CategoryItem {
  id: string;
  name: string;
  address?: string;
  destination?: string;
  brand?: string;
  price_per_person?: number;
  price_range?: string;
  duration?: string;
  min_guarantee?: number;
  rating: number;
  review_count: number;
  is_partner: boolean;
  thumbnail_url: string | null;
  [key: string]: unknown;
}

const PAGE_SIZE = 10;

// Maps the app's CategoryType → places.category slug
const CATEGORY_TYPE_TO_PLACE: Record<CategoryType, string> = {
  venues: "wedding_hall",
  studios: "studio",
  honeymoon: "honeymoon",
  honeymoon_gifts: "appliance",
  appliances: "appliance",
  suits: "tailor_shop",
  hanbok: "hanbok",
  invitation_venues: "invitation_venue",
};

interface FetchParams {
  region?: string;
  minRating?: number;
  filterOptions1?: string[];
  filterOptions2?: string[];
  filterOptions3?: string[];
}

async function fetchCategoryItems(
  category: CategoryType,
  filters: FetchParams,
  pageParam: number
) {
  const placeCategory = CATEGORY_TYPE_TO_PLACE[category] ?? category;
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("places")
    .select("*", { count: "exact" })
    .eq("category", placeCategory)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (filters.region) {
    query = query.ilike("city", `%${filters.region}%`);
  }
  if (filters.minRating) {
    query = query.gte("avg_rating", filters.minRating);
  }

  const { data, error, count } = await query
    .order("avg_rating", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const items: CategoryItem[] = (data ?? []).map((p) => ({
    id: p.place_id,
    name: p.name,
    address: [p.city, p.district].filter(Boolean).join(" "),
    price_per_person: p.min_price ?? undefined,
    rating: p.avg_rating ?? 0,
    review_count: p.review_count ?? 0,
    is_partner: p.is_partner ?? false,
    thumbnail_url: p.main_image_url,
  }));

  return {
    data: items,
    nextPage: items.length === PAGE_SIZE ? pageParam + 1 : undefined,
    totalCount: count ?? 0,
  };
}

export function useCategoryData(category: CategoryType) {
  const region = useCategoryFilterStore((state) => state.region);
  const minRating = useCategoryFilterStore((state) => state.minRating);
  const filterOptions1 = useCategoryFilterStore((state) => state.filterOptions1);
  const filterOptions2 = useCategoryFilterStore((state) => state.filterOptions2);
  const filterOptions3 = useCategoryFilterStore((state) => state.filterOptions3);

  return useInfiniteQuery({
    queryKey: [category, region, minRating, filterOptions1, filterOptions2, filterOptions3],
    queryFn: ({ pageParam = 0 }) =>
      fetchCategoryItems(
        category,
        { region, minRating, filterOptions1, filterOptions2, filterOptions3 },
        pageParam
      ),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function getCategoryConfig(category: CategoryType) {
  return {
    tableName: CATEGORY_TYPE_TO_PLACE[category] ?? category,
    arrayField1: "",
    arrayField2: "",
    arrayField3: "",
    locationField: "address" as const,
  };
}
