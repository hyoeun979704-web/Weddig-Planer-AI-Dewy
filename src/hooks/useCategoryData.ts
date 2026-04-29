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
  keywords?: string[];
  custom_available?: boolean | null;
  [key: string]: unknown;
}

const PAGE_SIZE = 10;

// Maps the app's CategoryType → places.category slug
const CATEGORY_TYPE_TO_PLACE: Record<CategoryType, string> = {
  venues: "wedding_hall",
  studios: "studio",
  dress_shops: "dress_shop",
  makeup_shops: "makeup_shop",
  honeymoon: "honeymoon",
  honeymoon_gifts: "jewelry",
  appliances: "appliance",
  suits: "tailor_shop",
  hanbok: "hanbok",
  invitation_venues: "invitation_venue",
};

// Per-category subquery appended to the places select. Each card table is 1:1
// with places via place_id, so Supabase returns the row as an object.
const CATEGORY_DETAIL_SELECT: Record<CategoryType, string> = {
  venues:
    "place_wedding_halls(hall_styles,meal_types,min_guarantee,max_guarantee,price_per_person)",
  studios: "place_studios(shoot_styles,includes_originals,price_per_person)",
  dress_shops: "place_dress_shops(dress_styles,rental_only,price_per_person)",
  makeup_shops: "place_makeup_shops(makeup_styles,includes_rehearsal,price_per_person)",
  hanbok: "place_hanboks(hanbok_types,custom_available,price_per_person)",
  suits: "place_tailor_shops(suit_styles,custom_available,price_per_person)",
  honeymoon: "place_honeymoons(destinations,duration_days,price_per_person)",
  honeymoon_gifts: "place_jewelry(metals,product_categories,couple_set_available,price_per_person)",
  appliances: "place_appliances(product_categories,brand_options,price_per_person)",
  invitation_venues:
    "place_invitation_venues(venue_types,capacity_min,capacity_max,price_per_person)",
};

const CARD_KEY: Record<CategoryType, string> = {
  venues: "place_wedding_halls",
  studios: "place_studios",
  dress_shops: "place_dress_shops",
  makeup_shops: "place_makeup_shops",
  hanbok: "place_hanboks",
  suits: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  honeymoon_gifts: "place_jewelry",
  appliances: "place_appliances",
  invitation_venues: "place_invitation_venues",
};

// 1:1 PostgREST relations return an object directly. Earlier we also handled
// arrays defensively, but the UNIQUE place_id FK guarantees object-or-null.
function pickCard<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function toCategoryItem(p: any, category: CategoryType): CategoryItem {
  const card = pickCard<any>(p[CARD_KEY[category]]);
  const price = card?.price_per_person ?? p.min_price ?? undefined;
  const base: CategoryItem = {
    id: p.place_id,
    name: p.name,
    address: [p.city, p.district].filter(Boolean).join(" "),
    price_per_person: price,
    rating: p.avg_rating ?? 0,
    review_count: p.review_count ?? 0,
    is_partner: p.is_partner ?? false,
    thumbnail_url: p.main_image_url,
    keywords: [],
  };

  switch (category) {
    case "venues":
      base.keywords = card?.hall_styles ?? [];
      base.min_guarantee = card?.min_guarantee ?? 0;
      break;
    case "studios":
      base.keywords = card?.shoot_styles ?? [];
      break;
    case "dress_shops":
      base.keywords = card?.dress_styles ?? [];
      break;
    case "makeup_shops":
      base.keywords = card?.makeup_styles ?? [];
      break;
    case "hanbok":
      base.keywords = card?.hanbok_types ?? [];
      base.custom_available = card?.custom_available ?? null;
      break;
    case "suits":
      base.keywords = card?.suit_styles ?? [];
      base.custom_available = card?.custom_available ?? null;
      break;
    case "honeymoon":
      base.keywords = card?.destinations ?? [];
      base.destination = card?.destinations?.join(", ");
      base.duration =
        card?.duration_days != null ? `${card.duration_days}일` : undefined;
      break;
    case "honeymoon_gifts":
      // jewelry: product_categories=결혼반지/예물세트, metals=골드/플래티넘
      base.keywords = card?.product_categories ?? [];
      base.brand = card?.metals?.join(", ");
      break;
    case "appliances":
      base.keywords = card?.product_categories ?? [];
      base.brand = card?.brand_options?.join(", ");
      break;
    case "invitation_venues":
      base.keywords = card?.venue_types ?? [];
      base.min_guarantee = card?.capacity_min ?? 0;
      break;
  }
  return base;
}

interface FetchParams {
  region?: string | null;
  minRating?: number | null;
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
    .select(`*, ${CATEGORY_DETAIL_SELECT[category]}`, { count: "exact" })
    .eq("category", placeCategory)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (filters.region) {
    query = query.ilike("city", `%${filters.region}%`);
  }
  if (filters.minRating) {
    query = query.gte("avg_rating", filters.minRating);
  }

  // 신뢰도(채움도) 우선, 같으면 평점.
  const { data, error, count } = await query
    .order("data_completeness", { ascending: false })
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw error;

  const items: CategoryItem[] = (data ?? []).map((p) => toCategoryItem(p, category));

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
