import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategoryFilterStore, CategoryType } from "@/stores/useCategoryFilterStore";
import { useWeddingVenue } from "@/hooks/useWeddingVenue";
import { APPLIANCE_PRODUCT_TYPE_LABEL, JEWELRY_STORE_TYPE_LABEL } from "@/lib/categoryLabels";
import { joinRegion } from "@/lib/placeMappers";

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
  max_guarantee?: number;
  rating: number;
  review_count: number;
  is_partner: boolean;
  thumbnail_url: string | null;
  /** 근접 거리 배지용 좌표 (places.lat/lng). NULL 가능. */
  lat?: number | null;
  lng?: number | null;
  keywords?: string[];
  tags?: string[];
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
  jewelry: "jewelry",
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
  honeymoon:
    "place_honeymoons(agency_name,agency_product_url,product_type,countries,cities,representative_city,nights,days,price_per_person,avg_budget,themes)",
  jewelry:
    "place_jewelry(brand_name,product_url,product_type,sub_category,store_type,metals,product_categories,price_per_person,price_couple_set,carat_diamond,promotion_text)",
  appliances:
    "place_appliances(product_type,product_url,store_chain,specialties,package_items,package_set_price,product_categories,brand_options,price_per_person,promotion_text)",
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
  jewelry: "place_jewelry",
  appliances: "place_appliances",
  invitation_venues: "place_invitation_venues",
};

// 1:1 PostgREST relations return an object directly. Earlier we also handled
// arrays defensively, but the UNIQUE place_id FK guarantees object-or-null.
function pickCard<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

// filterOptions1/2/3(다중 선택 칩)를 각 카테고리 detail 테이블의 backing 컬럼에
// 매핑. Round 12 — 실제 DB 컬럼 분포 검증 후 매핑 재정렬:
//   - array: overlaps (선택값 중 하나라도 포함)
//   - scalar (text/enum): in (선택값 중 하나라도 매칭)
//   - boolean: 사용자가 칩 켜면 = "예(true)" 의미. 다중 선택 시 모두 true(AND).
//     (NULL/false 인 row 는 제외 — 정보 누락된 곳은 노출 안 함.)
//   - boolean_cols: UI value 자체가 컬럼명. 사용자 칩 = 해당 컬럼 = true. 다중 선택 AND.
// detail 컬럼이 없는 슬롯은 생략 — 정의되지 않은 f2/f3 는 클릭해도 무시되므로
// UI 에 노출하지 않는 것이 옳음 (CategoryFilterBar 의 filterConfigs 와 동기화).
type FilterCol =
  | { col: string; type: "array" }
  | { col: string; type: "scalar" }
  | { col: string; type: "boolean" }
  | { type: "boolean_cols"; allowed: readonly string[] };
const FILTER_COLUMN_MAP: Record<
  CategoryType,
  { f1?: FilterCol; f2?: FilterCol; f3?: FilterCol }
> = {
  // Round 12 self-review fix — 단일 boolean 슬롯도 boolean_cols 로 통일.
  // 'boolean' type 은 col 이 고정이라 슬롯에 옵션 1개 이상 추가되면 silent wrong
  // (모든 칩이 같은 컬럼=true 만 보냄). boolean_cols 는 allowlist 안의 어떤 컬럼이든
  // UI value(=컬럼명) 로 분기. 슬롯이 단일이어도 미래 옵션 확장 시 안전.
  venues: {
    f1: { col: "hall_styles", type: "array" },
    f2: { col: "meal_types", type: "array" },
    f3: { type: "boolean_cols", allowed: ["outdoor_available"] },
  },
  studios: {
    f1: { col: "package_types", type: "array" },
    f2: { col: "shoot_styles", type: "array" },
    f3: { type: "boolean_cols", allowed: ["video_included"] },
  },
  dress_shops: { f1: { col: "dress_styles", type: "array" } },
  makeup_shops: { f1: { col: "makeup_styles", type: "array" } },
  hanbok: {
    f1: { col: "hanbok_types", type: "array" },
    f2: { type: "boolean_cols", allowed: ["custom_available"] },
  },
  suits: {
    f1: { col: "suit_styles", type: "array" },
    f2: { type: "boolean_cols", allowed: ["custom_available"] },
  },
  honeymoon: {
    f1: { col: "themes", type: "array" },
    f2: { col: "product_type", type: "scalar" },
    f3: { col: "hotel_grade", type: "scalar" },
  },
  jewelry: {
    f1: { col: "product_categories", type: "array" },
    f2: { col: "metals", type: "array" },
    f3: { col: "store_type", type: "scalar" },
  },
  appliances: {
    f1: { col: "product_categories", type: "array" },
    f2: { col: "brand_options", type: "array" },
    f3: {
      type: "boolean_cols",
      // 보안: UI 가 보낼 수 있는 컬럼명을 명시 allowlist. 다른 값은 무시.
      allowed: ["free_delivery", "free_installation", "old_appliance_pickup", "card_discount_available"],
    },
  },
  invitation_venues: { f1: { col: "venue_types", type: "array" } },
};

function toCategoryItem(p: any, category: CategoryType): CategoryItem {
  const card = pickCard<any>(p[CARD_KEY[category]]);
  const price = card?.price_per_person ?? p.min_price ?? undefined;
  const base: CategoryItem = {
    id: p.place_id,
    name: p.name,
    address: joinRegion(p.city, p.district) ?? "",
    price_per_person: price,
    rating: p.avg_rating ?? 0,
    review_count: p.review_count ?? 0,
    is_partner: p.is_partner ?? false,
    thumbnail_url: p.main_image_url,
    lat: (p.lat as number | null) ?? null,
    lng: (p.lng as number | null) ?? null,
    keywords: [],
    tags: p.tags ?? [],
  };

  switch (category) {
    case "venues":
      base.keywords = card?.hall_styles ?? [];
      base.min_guarantee = card?.min_guarantee ?? 0;
      base.max_guarantee = card?.max_guarantee ?? 0;
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
    case "honeymoon": {
      // 행 단위 = 여행 "상품". 패키지명은 places.name, 여행사는 agency_name.
      const PRODUCT_TYPE_LABEL: Record<string, string> = {
        package: "패키지",
        free_travel: "자유여행",
        flight: "항공권",
        pass: "이용권",
      };
      const country = (card?.countries as string[] | undefined)?.[0];
      const cities = (card?.cities as string[] | undefined) ?? [];
      const cityList = cities.join(", ");
      base.brand = card?.agency_name ?? undefined;
      base.destination =
        country && cityList ? `${country} · ${cityList}` : country ?? cityList ?? undefined;
      base.duration =
        card?.nights != null && card?.days != null
          ? `${card.nights}박${card.days}일`
          : undefined;
      const typeLabel = card?.product_type ? PRODUCT_TYPE_LABEL[card.product_type] : undefined;
      base.keywords = [
        typeLabel,
        card?.representative_city,
        ...((card?.themes as string[] | undefined) ?? []),
      ].filter((x): x is string => Boolean(x));
      base.avg_budget = card?.avg_budget ?? undefined;
      base.agency_product_url = card?.agency_product_url ?? undefined;
      break;
    }
    case "jewelry": {
      // jewelry — 한 행 = 1 브랜드 베스트셀러 컬렉션
      const STORE_TYPE_LABEL = JEWELRY_STORE_TYPE_LABEL;
      base.brand = card?.brand_name ?? card?.metals?.join(", ");
      base.product_url = card?.product_url ?? undefined;
      base.product_type = card?.product_type ?? undefined;
      base.sub_category = card?.sub_category ?? undefined;
      base.store_type = card?.store_type ?? undefined;
      base.price_couple_set = card?.price_couple_set ?? undefined;
      base.carat_diamond = card?.carat_diamond ?? undefined;
      base.promotion_text = card?.promotion_text ?? undefined;
      const storeTypeLabel = card?.store_type
        ? STORE_TYPE_LABEL[card.store_type]
        : undefined;
      base.keywords = [
        card?.product_type,
        card?.sub_category,
        storeTypeLabel,
        ...((card?.metals as string[] | undefined) ?? []),
      ].filter((x): x is string => Boolean(x));
      break;
    }
    case "appliances": {
      // hybrid: product_type ∈ {store, package, single}
      const APPL_TYPE_LABEL = APPLIANCE_PRODUCT_TYPE_LABEL;
      base.product_type = card?.product_type ?? undefined;
      base.product_url = card?.product_url ?? undefined;
      base.store_chain = card?.store_chain ?? undefined;
      base.package_set_price = card?.package_set_price ?? undefined;
      base.promotion_text = card?.promotion_text ?? undefined;
      // store: 체인을 brand로 / package·single: brand_options 첫 항목
      base.brand =
        card?.product_type === "store"
          ? card?.store_chain
          : card?.brand_options?.[0] ?? card?.brand_options?.join(", ");
      const typeLabel = card?.product_type ? APPL_TYPE_LABEL[card.product_type] : undefined;
      base.keywords = [
        typeLabel,
        ...((card?.product_categories as string[] | undefined) ?? []),
        ...((card?.specialties as string[] | undefined) ?? []),
      ].filter((x): x is string => Boolean(x));
      break;
    }
    case "invitation_venues":
      base.keywords = card?.venue_types ?? [];
      base.min_guarantee = card?.capacity_min ?? 0;
      base.max_guarantee = card?.capacity_max ?? 0;
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
  /** 결혼식장 anchor — 같은 시·시군구 업체 우선 매칭. v2 §6 위치 전략. */
  venueCity?: string | null;
  venueDistrict?: string | null;
}

async function fetchCategoryItems(
  category: CategoryType,
  filters: FetchParams,
  pageParam: number
) {
  const placeCategory = CATEGORY_TYPE_TO_PLACE[category] ?? category;
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const cardKey = CARD_KEY[category];
  const fmap = FILTER_COLUMN_MAP[category];
  const activeFilters: { col: FilterCol; values: string[] }[] = [];
  if (fmap.f1 && filters.filterOptions1?.length) activeFilters.push({ col: fmap.f1, values: filters.filterOptions1 });
  if (fmap.f2 && filters.filterOptions2?.length) activeFilters.push({ col: fmap.f2, values: filters.filterOptions2 });
  if (fmap.f3 && filters.filterOptions3?.length) activeFilters.push({ col: fmap.f3, values: filters.filterOptions3 });

  // detail 컬럼으로 부모(places)를 거르려면 inner join 이 필요하다. 필터가 있을
  // 때만 !inner 로 바꿔, 평소엔 detail 행이 없는 장소도 그대로 노출(기존 동작).
  const detailSelect = activeFilters.length > 0
    ? CATEGORY_DETAIL_SELECT[category].replace(`${cardKey}(`, `${cardKey}!inner(`)
    : CATEGORY_DETAIL_SELECT[category];

  let query = supabase
    .from("places")
    .select(`*, ${detailSelect}`, { count: "exact" })
    .eq("category", placeCategory)
    .eq("is_active", true)
    .is("deleted_at", null);

  for (const f of activeFilters) {
    if (f.col.type === "array") {
      query = query.overlaps(`${cardKey}.${f.col.col}`, f.values);
    } else if (f.col.type === "scalar") {
      query = query.in(`${cardKey}.${f.col.col}`, f.values);
    } else if (f.col.type === "boolean") {
      // 사용자가 칩 켜면 "예" 의미. NULL/false 모두 제외.
      query = query.eq(`${cardKey}.${f.col.col}`, true);
    } else if (f.col.type === "boolean_cols") {
      // UI value = 컬럼명. 다중 선택은 AND (모든 조건 만족). allowlist 외 값은 무시.
      for (const colName of f.values) {
        if (f.col.allowed.includes(colName)) {
          query = query.eq(`${cardKey}.${colName}`, true);
        }
      }
    }
  }

  if (filters.region) {
    if (category === "jewelry") {
      // jewelry: places.city는 매장 도시(서울 등). region 칩은 brand_tier로 필터.
      query = query.eq("place_jewelry.brand_tier", filters.region);
    } else if (category === "appliances") {
      // appliance: hybrid (store/package/single). region 칩 = product_type.
      query = query.eq("place_appliances.product_type", filters.region);
    } else {
      query = query.ilike("city", `%${filters.region}%`);
    }
  } else if (
    filters.venueCity &&
    category !== "jewelry" &&
    category !== "appliances" &&
    // F#6 — honeymoon 은 places.city 가 한국 시도가 아닌 destination("일본","동남아" 등).
    // venue anchor city("서울특별시") 로 ILIKE 매칭 시 항상 0 results. Honeymoon.tsx 가
    // 의도적으로 region=null 로 두는 이유와 일관.
    category !== "honeymoon" &&
    // invitation_venues 도 식장 부속 상견례 장소라 식장 city 매칭이 의미 있지만,
    // 데이터 형태가 식장과 다를 수 있어 일단 제외 (분리 작업으로 검토).
    category !== "invitation_venues"
  ) {
    // 사용자가 명시 region 필터 없으면 venue anchor 의 city 로 자동 좁힘.
    // venue 가 없으면 전국 노출 (기존 동작). v2 §6: 사용자 명시 식장이 primary anchor.
    query = query.ilike("city", `%${filters.venueCity}%`);
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
  // 결혼식장 anchor — 명시 region 필터가 없으면 자동 큐레이션 기준점.
  // jewelry/appliances 는 위치보단 카테고리 의미가 강해 venue 매칭 안 함.
  const venue = useWeddingVenue();

  return useInfiniteQuery({
    // 배열 필터(filterOptions1~3)는 join 으로 안정 직렬화 — 배열 참조가 바뀌어도
    // 내용이 같으면 같은 key 가 되어 불필요한 refetch 를 막는다.
    queryKey: [
      category, region, minRating,
      filterOptions1.join(","), filterOptions2.join(","), filterOptions3.join(","),
      venue.city, venue.district,
    ],
    queryFn: ({ pageParam = 0 }) =>
      fetchCategoryItems(
        category,
        {
          region,
          minRating,
          filterOptions1,
          filterOptions2,
          filterOptions3,
          venueCity: venue.city,
          venueDistrict: venue.district,
        },
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
