// 업체 비교 단일 소스 — 카테고리별로 "나란히 놓고 비교할 속성"을 정의한다.
// 표시 라벨/포맷/매칭 키 분리 원칙: category 값은 places.category(enum)와 동일해야 보드 결정
// (markBoardSlotBookedByQuoteCategory)·견적 매칭이 동작한다. 한글 라벨은 categoryLabels 단일 소스.
import type { LegacyDetail } from "@/hooks/usePlaceDetail";
import { formatManwon } from "@dewy/lib";
import { PLACE_CATEGORY_LABEL } from "@/lib/categoryLabels";
import { PLACE_CATEGORY_TO_ITEM_TYPE } from "@/lib/placeMappers";
import type { ItemType } from "@/hooks/useFavorites";

export interface CompareField {
  key: string;
  label: string;
  /** LegacyDetail 에서 비교값 추출. null = 정보 없음("—" 표시). */
  get: (d: LegacyDetail) => string | number | boolean | null;
  /** 숫자형 행의 최적값 강조 방향. 없으면 강조 안 함(텍스트/불리언). */
  better?: "low" | "high";
  /** 표시 포맷터(숫자/불리언). 기본: 불리언 O/X, 숫자 toLocaleString. */
  format?: (v: string | number | boolean) => string;
}

// ── 공용 포맷터 ──
const won = (v: string | number | boolean) => (typeof v === "number" ? `${formatManwon(v)}~` : "—");
const yesNo = (v: string | number | boolean) => (v === true ? "O" : v === false ? "X" : "—");
const count = (unit: string) => (v: string | number | boolean) => (typeof v === "number" ? `${v.toLocaleString()}${unit}` : "—");
const joinArr = (d: string[]): string | null => (d.length ? d.join(", ") : null);
// 별점 0 은 "후기 없음"이라 비교 의미가 없으니 null 로(강조·표시 제외).
const ratingOrNull = (d: LegacyDetail): number | null => (d.rating && d.rating > 0 ? d.rating : null);

// 모든 카테고리 공통 — 가격/평점/후기/지역/입점. 맨 위에 고정.
const UNIVERSAL_FIELDS: CompareField[] = [
  { key: "price", label: "시작가", get: (d) => d.price_per_person, better: "low", format: won },
  { key: "rating", label: "별점", get: ratingOrNull, better: "high", format: (v) => (typeof v === "number" ? `★ ${v.toFixed(1)}` : "—") },
  { key: "reviews", label: "후기 수", get: (d) => (d.review_count > 0 ? d.review_count : null), better: "high", format: count("개") },
  { key: "region", label: "지역", get: (d) => d.address || [d.city, d.district].filter(Boolean).join(" ") || null },
  { key: "partner", label: "Dewy 입점", get: (d) => d.is_partner, format: yesNo },
];

// 카테고리별 비교 속성(LegacyDetail 평탄화 필드 기준). 의사결정에 핵심적인 4~6개만.
const CATEGORY_FIELDS: Record<string, CompareField[]> = {
  wedding_hall: [
    { key: "min_guarantee", label: "최소 보증인원", get: (d) => d.min_guarantee, better: "low", format: count("명") },
    { key: "max_guarantee", label: "최대 수용", get: (d) => d.max_guarantee, better: "high", format: count("명") },
    { key: "hall_count", label: "홀 개수", get: (d) => d.hall_count, format: count("개") },
    { key: "meal_types", label: "식사 형식", get: (d) => joinArr(d.meal_types) },
    { key: "food_tasting", label: "음식 시연", get: (d) => d.food_tasting_available, format: yesNo },
    { key: "outdoor", label: "야외 예식", get: (d) => d.outdoor_available, format: yesNo },
  ],
  studio: [
    { key: "original_count", label: "원본 컷수", get: (d) => d.original_count ?? d.total_photos, better: "high", format: count("컷") },
    { key: "album", label: "앨범 페이지", get: (d) => d.photobook_pages, better: "high", format: count("p") },
    { key: "retouch", label: "보정 포함", get: (d) => d.retouching_included, format: yesNo },
    { key: "originals", label: "원본 제공", get: (d) => d.includes_originals, format: yesNo },
    { key: "dress", label: "드레스 제공", get: (d) => d.dress_provided, format: yesNo },
    { key: "styles", label: "촬영 스타일", get: (d) => joinArr(d.shoot_styles) },
  ],
  dress_shop: [
    { key: "fitting", label: "피팅 횟수", get: (d) => d.fitting_count, better: "high", format: count("회") },
    { key: "rental_only", label: "대여 전용", get: (d) => d.rental_only, format: yesNo },
    { key: "custom", label: "맞춤 제작", get: (d) => d.custom_available, format: yesNo },
    { key: "helper", label: "헬퍼 포함", get: (d) => d.helper_included, format: yesNo },
    { key: "styles", label: "드레스 스타일", get: (d) => joinArr(d.dress_styles) },
    { key: "brands", label: "디자이너", get: (d) => joinArr(d.designer_brands) },
  ],
  makeup_shop: [
    { key: "rehearsal", label: "리허설 포함", get: (d) => d.includes_rehearsal, format: yesNo },
    { key: "rehearsal_count", label: "리허설 횟수", get: (d) => d.rehearsal_count, better: "high", format: count("회") },
    { key: "travel", label: "출장비 포함", get: (d) => d.travel_fee_included, format: yesNo },
    { key: "director", label: "디렉터 급", get: (d) => d.director_level },
    { key: "styles", label: "메이크업 스타일", get: (d) => joinArr(d.makeup_styles) },
  ],
  tailor_shop: [
    { key: "fitting", label: "피팅 횟수", get: (d) => d.fitting_count, better: "high", format: count("회") },
    { key: "custom", label: "맞춤 제작", get: (d) => d.custom_available, format: yesNo },
    { key: "rental_only", label: "대여 전용", get: (d) => d.rental_only, format: yesNo },
    { key: "styles", label: "예복 스타일", get: (d) => joinArr(d.suit_styles) },
  ],
  hanbok: [
    { key: "types", label: "한복 종류", get: (d) => joinArr(d.hanbok_types) },
    { key: "rental_only", label: "대여 전용", get: (d) => d.rental_only, format: yesNo },
    { key: "delivery", label: "배송 가능", get: (d) => d.delivery_available, format: yesNo },
  ],
  honeymoon: [
    { key: "destination", label: "여행지", get: (d) => d.destination || joinArr(d.countries) },
    { key: "duration", label: "기간", get: (d) => d.duration || null },
    { key: "budget", label: "평균 예산", get: (d) => d.avg_budget, better: "low", format: won },
    { key: "direct", label: "직항", get: (d) => d.direct_flight, format: yesNo },
    { key: "hotel", label: "호텔 등급", get: (d) => d.hotel_grade },
    { key: "meal", label: "식사 플랜", get: (d) => d.meal_plan },
  ],
  jewelry: [
    { key: "brand", label: "브랜드", get: (d) => d.brand_name },
    { key: "couple_set", label: "커플 세트가", get: (d) => d.price_couple_set, better: "low", format: won },
    { key: "metals", label: "소재", get: (d) => joinArr(d.metals) },
    { key: "diamond_cert", label: "다이아 인증", get: (d) => d.diamond_certified, format: yesNo },
    { key: "warranty", label: "평생 A/S", get: (d) => d.lifetime_warranty, format: yesNo },
  ],
  invitation_venue: [
    { key: "capacity_min", label: "최소 인원", get: (d) => d.capacity_min, better: "low", format: count("명") },
    { key: "capacity_max", label: "최대 인원", get: (d) => d.capacity_max, better: "high", format: count("명") },
    { key: "atmosphere", label: "분위기", get: (d) => joinArr(d.venue_atmosphere) },
    { key: "drinks", label: "음료 포함", get: (d) => d.drinks_included, format: yesNo },
    { key: "valet", label: "발렛 파킹", get: (d) => d.valet_parking, format: yesNo },
  ],
  appliance: [
    { key: "energy", label: "에너지 등급", get: (d) => d.energy_rating },
    { key: "warranty", label: "보증 기간", get: (d) => d.warranty_years, better: "high", format: count("년") },
    { key: "delivery", label: "무료 배송", get: (d) => d.free_delivery, format: yesNo },
    { key: "install", label: "무료 설치", get: (d) => d.free_installation, format: yesNo },
    { key: "brands", label: "브랜드", get: (d) => joinArr(d.brand_options) },
  ],
};

// 비교 가능한(레지스트리에 정의된) 카테고리만 노출 — 그 외는 공통 필드만.
export function getCompareFields(category: string): CompareField[] {
  return [...UNIVERSAL_FIELDS, ...(CATEGORY_FIELDS[category] ?? [])];
}

export function categoryLabel(category: string): string {
  return PLACE_CATEGORY_LABEL[category] ?? category;
}

export function itemTypeForCategory(category: string): ItemType | undefined {
  return PLACE_CATEGORY_TO_ITEM_TYPE[category];
}

// favorites.item_type → places.category 역매핑(찜 비교에서 카테고리 그룹핑용).
const ITEM_TYPE_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(PLACE_CATEGORY_TO_ITEM_TYPE).map(([cat, type]) => [type, cat]),
);
export function categoryForItemType(itemType: string): string | undefined {
  return ITEM_TYPE_TO_CATEGORY[itemType];
}

// 비교 화면에서 노출할 카테고리 순서(보드 그룹 흐름과 유사). 위 외 카테고리는 뒤로.
export const COMPARE_CATEGORY_ORDER = [
  "wedding_hall", "studio", "dress_shop", "makeup_shop", "tailor_shop",
  "hanbok", "jewelry", "invitation_venue", "honeymoon", "appliance",
];

// 한 행에서 "가장 좋은" 셀 인덱스 집합. 동률은 모두 강조, 전부 동일하면 강조 안 함(노이즈 차단).
export function bestValueIndices(field: CompareField, details: LegacyDetail[]): Set<number> {
  const out = new Set<number>();
  if (!field.better) return out;
  const nums = details.map((d) => {
    const v = field.get(d);
    return typeof v === "number" ? v : null;
  });
  const present = nums.filter((n): n is number => n != null);
  if (present.length < 2) return out; // 비교 대상이 2개 미만이면 무의미
  const best = field.better === "low" ? Math.min(...present) : Math.max(...present);
  const allSame = present.every((n) => n === present[0]);
  if (allSame) return out;
  nums.forEach((n, i) => { if (n === best) out.add(i); });
  return out;
}

export const MAX_COMPARE = 4;
export const MIN_COMPARE = 2;
