import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  placeToVendor,
  KOREAN_TO_PLACE_CATEGORY,
  CATEGORY_CARD_TABLE,
  Vendor,
} from "@/lib/placeMappers";

export type { Vendor };

export interface VendorEvent {
  event_id: number;
  vendor_id: number | null;
  category: string | null;
  title: string;
  vendor_name: string | null;
  benefit_detail: string | null;
  description: string | null;
  conditions: string | null;
  cautions: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  view_count: number;
}

export const VENDOR_CATEGORIES = [
  "웨딩홀",
  "스드메",
  "한복",
  "예복",
  "허니문",
  "혼수",
  "청첩장",
  "웨딩플래너",
  "기타",
] as const;

export type VendorCategoryType = typeof VENDOR_CATEGORIES[number];

// detailPath maps to each category's dedicated route — all use PlaceDetailLayout
// under the hood so feature parity is maintained. "스드메" is a multi-category
// combo (studio/dress/makeup), so it lands on /vendor/:id which detects
// place.category and dispatches the right per-category extras.
export const categoryRouteMap: Record<string, { listPath: string; detailPath: string; label: string; emoji: string }> = {
  "웨딩홀": { listPath: "/vendors/웨딩홀", detailPath: "/venue", label: "웨딩홀", emoji: "" },
  "스드메": { listPath: "/vendors/스드메", detailPath: "/vendor", label: "스드메", emoji: "" },
  "한복": { listPath: "/vendors/한복", detailPath: "/hanbok", label: "한복", emoji: "" },
  "예복": { listPath: "/vendors/예복", detailPath: "/suit", label: "예복", emoji: "" },
  "허니문": { listPath: "/vendors/허니문", detailPath: "/honeymoon", label: "허니문", emoji: "" },
  "혼수": { listPath: "/vendors/혼수", detailPath: "/appliances", label: "혼수·가전", emoji: "" },
  "청첩장": { listPath: "/vendors/청첩장", detailPath: "/invitation-venues", label: "청첩장", emoji: "" },
  "웨딩플래너": { listPath: "/vendors/웨딩플래너", detailPath: "/vendor", label: "웨딩플래너", emoji: "" },
  // 기타 — 본식DVD·스냅류·네일·관리·축가·부케 등(전용 detail 테이블 없음 → /vendor 공용).
  "기타": { listPath: "/vendors/기타", detailPath: "/vendor", label: "기타", emoji: "" },
};

// Joined select used by both useVendors and useRecommendedVendors so cards
// can render category-aware info lines without an N+1 fetch per place.
const VENDOR_WITH_CATEGORY_SELECT = `
  *,
  place_wedding_halls(*),
  place_studios(*),
  place_dress_shops(*),
  place_makeup_shops(*),
  place_tailor_shops(*),
  place_hanboks(*),
  place_invitation_venues(*),
  place_appliances(*),
  place_honeymoons(*)
`;

// 지역 우선 큐레이션 — city 정확 일치(부분문자열 매칭 금지: '충남' vs '충청남도'
// 회귀 방지)를 앞으로 stable 정렬. SQL 이 이미 매긴 파트너>충실도>평점 순서는 각
// 지역 그룹 안에서 보존된다(map→sort→map 로 원래 인덱스 tie-break).
function sortRegionFirst<T extends { city: string | null }>(rows: T[], region: string): T[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const am = a.r.city === region ? 0 : 1;
      const bm = b.r.city === region ? 0 : 1;
      return am - bm || a.i - b.i;
    })
    .map(({ r }) => r);
}

// 카테고리(한글 라벨 또는 slug)로 vendors 를 조회하는 순수 fetcher. useVendors 와
// 홈 페르소나 추천 행(usePersonaRows)이 공유한다. limit 지정 시 상위 N개만 필요한
// 경우(추천 행)라 SQL 풀을 제한하되, region 재정렬이 의미 있도록 넉넉히(×4) 가져온
// 뒤 잘라낸다. limit 미지정이면 기존 useVendors 와 100% 동일(전량 조회 후 지역 정렬).
export async function fetchVendorsByCategory(
  categoryType?: string,
  region?: string | null,
  limit?: number,
): Promise<Vendor[]> {
  // 카테고리가 지정되면 그 카테고리의 detail 테이블 하나만 join (9→1).
  // 카드 렌더(buildVendorInfoLines/collectStyleTags)는 place.category 에 해당하는
  // 테이블만 읽으므로 나머지 8개 join 은 행마다 순수 over-fetch 였다. eq("category")
  // 로 단일 카테고리만 반환되므로 narrowing 은 회귀 없이 안전. 미지정/미매핑(혼합
  // 목록)일 때만 전체 join 으로 폴백. slug 를 직접 넘기면 매핑 fallback 으로 동작.
  const placeCat = categoryType
    ? KOREAN_TO_PLACE_CATEGORY[categoryType] || categoryType
    : undefined;
  const cardTable = placeCat ? CATEGORY_CARD_TABLE[placeCat] : undefined;
  // detail 테이블이 없는 카테고리(기타 등)는 join 없이 places 만 — 9-join over-fetch 방지.
  const selectClause = cardTable
    ? `*, ${cardTable}(*)`
    : placeCat
      ? "*"
      : VENDOR_WITH_CATEGORY_SELECT;

  let query = supabase
    .from("places")
    .select(selectClause)
    .eq("is_active", true)
    .is("deleted_at", null)
    // 파트너 등급(베프>프렌즈>일반)은 카테고리 필터 안에서의 정렬일 뿐
    .order("partner_rank", { ascending: false })
    .order("data_completeness", { ascending: false })
    .order("avg_rating", { ascending: false, nullsFirst: false });

  if (placeCat) query = query.eq("category", placeCat);
  // region 재정렬은 클라에서 하므로, limit 시 그 재정렬이 의미 있도록 풀을 넉넉히 잡는다.
  if (limit) query = query.limit(region ? limit * 4 : limit);

  const { data, error } = await query;
  if (error) throw error;
  let rows = (data ?? []) as unknown as Parameters<typeof placeToVendor>[0][];
  if (region) rows = sortRegionFirst(rows, region);
  if (limit) rows = rows.slice(0, limit);
  return rows.map(placeToVendor);
}

// Fetch vendors by category (Korean label).
// region(예식 지역, places.city 와 동일한 정식 명칭)이 주어지면 그 지역 업체를 목록
// 상단으로 끌어올린다(소프트 큐레이션). 홈 추천(useRecommendedVendors)은 region 으로
// 하드 게이트하지만, 브라우즈 목록은 지역에 공급이 적을 때 전부 숨으면 안 되므로
// '지역 우선 정렬'로 큐레이션하되 다른 지역도 그 아래 그대로 보여준다. region 미지정이면
// 기존 동작과 100% 동일(파트너>충실도>평점) — 호출부 회귀 없음.
export const useVendors = (categoryType?: string, region?: string | null) => {
  return useQuery({
    queryKey: ["vendors", categoryType, region ?? null],
    queryFn: () => fetchVendorsByCategory(categoryType, region),
  });
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_KO = ["월", "화", "수", "목", "금", "토", "일"] as const;

function buildBusinessHours(details: Record<string, unknown>): string | null {
  const lines: string[] = [];
  for (let i = 0; i < DAY_KEYS.length; i++) {
    const v = details[`hours_${DAY_KEYS[i]}`];
    if (typeof v === "string" && v.trim()) lines.push(`${DAY_KO[i]}: ${v.trim()}`);
  }
  return lines.length > 0 ? lines.join(", ") : null;
}

function buildSnsInfo(details: Record<string, unknown>): Record<string, string> | null {
  const map: Record<string, string> = {};
  const entries: Array<[string, string]> = [
    ["instagram", "instagram_url"],
    ["facebook", "facebook_url"],
    ["kakao", "kakao_channel_url"],
    ["naver_blog", "naver_blog_url"],
    ["naver_place", "naver_place_url"],
    ["youtube", "youtube_url"],
    ["website", "website_url"],
  ];
  for (const [key, col] of entries) {
    const v = details[col];
    if (typeof v === "string" && v.trim()) map[key] = v;
  }
  return Object.keys(map).length > 0 ? map : null;
}

// Fetch single vendor by id (uuid). Single round-trip via embedded place_details
// select; PostgREST returns details as object-or-null since place_id is UNIQUE.
export const useVendor = (vendorId: string) => {
  return useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: async (): Promise<Vendor | null> => {
      const { data, error } = await supabase
        .from("places")
        .select("*, place_details(*)")
        .eq("place_id", vendorId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      const base = placeToVendor(row);

      const details = row.place_details ?? null;
      if (!details) return base;
      const d = details as Record<string, unknown>;

      const parkingHours =
        [d.parking_free_guest, d.parking_free_parents]
          .filter((x): x is string => typeof x === "string" && !!x.trim())
          .join(" · ") || null;

      return {
        ...base,
        tel: typeof d.tel === "string" ? d.tel : base.tel,
        business_hours: buildBusinessHours(d) ?? base.business_hours,
        parking_location:
          typeof d.parking_location === "string" ? d.parking_location : base.parking_location,
        parking_hours: parkingHours ?? base.parking_hours,
        sns_info: buildSnsInfo(d) ?? base.sns_info,
        amenities:
          Array.isArray(d.pros) && d.pros.length > 0
            ? (d.pros as string[]).join(", ")
            : base.amenities,
      };
    },
    enabled: !!vendorId,
  });
};

// events table removed during schema cleanup. Stub preserved for callers.
export const useEvents = (_category?: string) => {
  return useQuery({
    queryKey: ["events", _category],
    queryFn: async (): Promise<VendorEvent[]> => [],
    enabled: false,
  });
};

// 홈 추천 — 큐레이션(예식 지역) 안에서 파트너 등급 > 데이터 충실도 > 평점.
// region 미설정이면 큐레이션 조건이 없으므로 전체에서 추천한다.
export const useRecommendedVendors = (limit = 6, region?: string | null) => {
  return useQuery({
    queryKey: ["recommended-vendors", limit, region ?? null],
    queryFn: async (): Promise<Vendor[]> => {
      let query = supabase
        .from("places")
        .select(VENDOR_WITH_CATEGORY_SELECT)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("partner_rank", { ascending: false })
        .order("data_completeness", { ascending: false })
        .order("avg_rating", { ascending: false, nullsFirst: false })
        .limit(limit);
      // 큐레이션 게이트: 예식 지역이 설정되면 그 지역 업체만 (등급으로 우회 불가).
      // places.city 와 wedding_region 은 동일한 정식 명칭(DB 확인) — 정확 일치.
      if (region) query = query.eq("city", region);
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as unknown as Parameters<typeof placeToVendor>[0][]).map(placeToVendor);
    },
    staleTime: 5 * 60_000,
  });
};
