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
  // Array fields vary by category
  [key: string]: unknown;
}

interface CategoryConfig {
  tableName: string;
  arrayField1: string;
  arrayField2: string;
  arrayField3: string;
  locationField: string;
}

const categoryConfigs: Record<CategoryType, CategoryConfig> = {
  venues: {
    tableName: 'venues',
    arrayField1: 'hall_types',
    arrayField2: 'meal_options',
    arrayField3: 'event_options',
    locationField: 'address',
  },
  studios: {
    tableName: 'studios',
    arrayField1: 'package_types',
    arrayField2: 'style_options',
    arrayField3: 'service_options',
    locationField: 'address',
  },
  honeymoon: {
    tableName: 'honeymoon',
    arrayField1: 'trip_types',
    arrayField2: 'included_services',
    arrayField3: 'accommodation_types',
    locationField: 'destination',
  },
  honeymoon_gifts: {
    tableName: 'honeymoon_gifts',
    arrayField1: 'category_types',
    arrayField2: 'brand_options',
    arrayField3: 'delivery_options',
    locationField: 'brand',
  },
  appliances: {
    tableName: 'appliances',
    arrayField1: 'category_types',
    arrayField2: 'brand_options',
    arrayField3: 'feature_options',
    locationField: 'brand',
  },
  suits: {
    tableName: 'suits',
    arrayField1: 'suit_types',
    arrayField2: 'brand_options',
    arrayField3: 'service_options',
    locationField: 'address',
  },
  hanbok: {
    tableName: 'hanbok',
    arrayField1: 'hanbok_types',
    arrayField2: 'style_options',
    arrayField3: 'service_options',
    locationField: 'address',
  },
  invitation_venues: {
    tableName: 'invitation_venues',
    arrayField1: 'venue_types',
    arrayField2: 'amenity_options',
    arrayField3: 'cuisine_options',
    locationField: 'address',
  },
};

const PAGE_SIZE = 10;

async function fetchCategoryItems(
  category: CategoryType,
  filters: {
    region: string | null;
    minRating: number | null;
    filterOptions1: string[];
    filterOptions2: string[];
    filterOptions3: string[];
  },
  pageParam: number
) {
  const config = categoryConfigs[category];
  const tableName = config.tableName as 'venues' | 'studios' | 'honeymoon' | 'honeymoon_gifts' | 'appliances' | 'suits' | 'hanbok' | 'invitation_venues';
  
  let query = supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .order('is_partner', { ascending: false })
    .order('rating', { ascending: false })
    .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

  // Apply region filter
  if (filters.region) {
    query = query.ilike(config.locationField as never, `%${filters.region}%` as never);
  }

  // Apply rating filter
  if (filters.minRating) {
    query = query.gte('rating', filters.minRating);
  }

  // Apply array filters
  if (filters.filterOptions1.length > 0) {
    query = query.overlaps(config.arrayField1 as never, filters.filterOptions1 as never);
  }

  if (filters.filterOptions2.length > 0) {
    query = query.overlaps(config.arrayField2 as never, filters.filterOptions2 as never);
  }

  if (filters.filterOptions3.length > 0) {
    query = query.overlaps(config.arrayField3 as never, filters.filterOptions3 as never);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data as CategoryItem[],
    nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
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
    queryFn: ({ pageParam = 0 }) => fetchCategoryItems(category, { region, minRating, filterOptions1, filterOptions2, filterOptions3 }, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}

export function getCategoryConfig(category: CategoryType) {
  return categoryConfigs[category];
}
