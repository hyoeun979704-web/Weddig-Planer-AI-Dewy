import type { Database } from "@/integrations/supabase/types";
import type { ItemType } from "@/hooks/useFavorites";
import { formatManwonRange } from "@dewy/lib";
import {
  buildVendorInfoLines,
  collectKeywordTags,
  collectStyleTags,
  type PlaceWithCategory,
  type VendorInfoLine,
} from "./vendorInfoLines";

export type PlaceRow = Database["public"]["Tables"]["places"]["Row"];

export type { VendorInfoLine };

// Map places.category slug → favorites.item_type so cards rendered anywhere
// (home recommendations, category list, etc.) can sync hearts with the
// favorites page. dress_shop / makeup_shop have no slot in the favorites
// schema yet — callers fall back to non-persistent local state for those.
export const PLACE_CATEGORY_TO_ITEM_TYPE: Record<string, ItemType> = {
  wedding_hall: "venue",
  studio: "studio",
  dress_shop: "dress",
  makeup_shop: "makeup",
  hanbok: "hanbok",
  tailor_shop: "suit",
  honeymoon: "honeymoon",
  appliance: "appliance",
  jewelry: "jewelry",
  invitation_venue: "invitation_venues",
  etc: "etc",
};

// Korean UI category label ↔ places.category snake_case (9 vendor categories)
// 웨딩플래너는 이 앱의 핵심 제품(AI 플래너)이라 vendor 카테고리에서 제외.
export const KOREAN_TO_PLACE_CATEGORY: Record<string, string> = {
  "웨딩홀": "wedding_hall",
  "스튜디오": "studio",
  "드레스샵": "dress_shop",
  "메이크업샵": "makeup_shop",
  "한복": "hanbok",
  "예복": "tailor_shop",
  "허니문": "honeymoon",
  "혼수": "appliance",
  "청첩장": "invitation_venue",
  // 기타 — 본식DVD·스냅(본식/서브/야외/웨딩/아이폰)·네일아트·피부/체형관리·축가·
  // 축의대·부케·브라이덜샤워·장소대여 등 잔여 웨딩 업체. 세부 유형은 places.tags 로
  // 구분하고, 업체가 충분히 모이면 단일 카테고리로 분리한다(분리 시 이 매핑만 추가).
  "기타": "etc",
  // Backward-compat aliases
  "스드메": "studio",
};

export const PLACE_TO_KOREAN_CATEGORY: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스샵",
  makeup_shop: "메이크업샵",
  hanbok: "한복",
  tailor_shop: "예복",
  honeymoon: "허니문",
  appliance: "혼수",
  invitation_venue: "청첩장",
  etc: "기타",
  // Video-only categories (no places attached). Used by TipVideoCard for
  // the category badge — see koreanCategoryLabel().
  family_meeting: "상견례",
  newlywed_home: "신혼집",
  wedding_gifts: "예단·예물",
  legal_paperwork: "혼인신고",
  bridal_care: "신부 관리",
  ceremony: "본식 진행",
};

// Maps a free-text Korean query (e.g. "예단", "본식", "혼인신고") to every
// category slug whose Korean label contains the query. Used by tip-video
// search so a user typing "예단" also pulls in videos tagged
// `wedding_gifts`, not just videos whose title literally says "예단".
//
// Queries shorter than 2 chars are skipped — a single character like "스"
// would match too many labels to be useful as a signal.
export const koreanQueryToCategorySlugs = (rawQuery: string): string[] => {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const out: string[] = [];
  for (const [slug, label] of Object.entries(PLACE_TO_KOREAN_CATEGORY)) {
    if (label.includes(q)) out.push(slug);
  }
  return out;
};

// Mapping from place category slug → category-specific card table name
export const CATEGORY_CARD_TABLE: Record<string, string> = {
  wedding_hall: "place_wedding_halls",
  studio: "place_studios",
  dress_shop: "place_dress_shops",
  makeup_shop: "place_makeup_shops",
  hanbok: "place_hanboks",
  tailor_shop: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  appliance: "place_appliances",
  jewelry: "place_jewelry",
  invitation_venue: "place_invitation_venues",
};

export interface Vendor {
  vendor_id: string;
  name: string;
  category_type: string;
  category_slug: string;
  region: string | null;
  address: string | null;
  thumbnail_url: string | null;
  tel: string | null;
  business_hours: string | null;
  parking_location: string | null;
  parking_hours: string | null;
  sns_info: Record<string, string> | null;
  keywords: string | null;
  amenities: string | null;
  avg_rating: number;
  review_count: number;
  min_price: number | null;
  is_partner: boolean;
  /** place_details.instagram_url — main_image_url 없을 때 placeholder 에 안내
   *  표시. 옵셔널 — fetch hook 이 SELECT 안 하면 그냥 카테고리 placeholder 로 fallback. */
  instagram_url?: string | null;
  info_lines: VendorInfoLine[];
  style_tags: string[];
  keyword_tags: string[];
}

const PRICE_LABEL_PREFIX: Record<string, string> = {
  wedding_hall: "인당",
  studio: "패키지",
  dress_shop: "대여",
  makeup_shop: "이용",
  hanbok: "대여",
  tailor_shop: "대여",
  honeymoon: "패키지",
  appliance: "최저",
  invitation_venue: "최저",
};

// Category-aware price preview shown on home recommendation cards.
// Splits prefix vs amount so the UI can style them separately.
export const formatVendorPrice = (
  v: Pick<Vendor, "category_slug" | "min_price">
): { prefix: string; amount: string } | null => {
  if (v.min_price == null || v.min_price <= 0) return null;
  const amount = formatManwonRange(v.min_price);
  return {
    prefix: PRICE_LABEL_PREFIX[v.category_slug] ?? "",
    amount,
  };
};

export interface Venue {
  id: string;
  name: string;
  address: string;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  price_per_person: number;
  min_guarantee: number;
  max_guarantee: number;
  is_partner: boolean;
  created_at: string;
  updated_at: string;
  hall_types: string[] | null;
  meal_options: string[] | null;
  event_options: string[] | null;
  tags: string[];
}

// 시/구 결합("서울 강남구"). 둘 다 비면 null. 여러 곳에서 인라인 복붙되던 패턴.
export const joinRegion = (city: string | null, district: string | null) =>
  [city, district].filter(Boolean).join(" ") || null;

export const placeToVendor = (p: PlaceRow | PlaceWithCategory): Vendor => {
  const withCat = p as PlaceWithCategory;
  return {
    vendor_id: p.place_id,
    name: p.name,
    category_type: PLACE_TO_KOREAN_CATEGORY[p.category] || p.category,
    category_slug: p.category,
    region: joinRegion(p.city, p.district),
    address: joinRegion(p.city, p.district),
    thumbnail_url: p.main_image_url,
    tel: null,
    business_hours: null,
    parking_location: null,
    parking_hours: null,
    sns_info: null,
    keywords: p.tags && p.tags.length > 0 ? p.tags.join(", ") : null,
    amenities: null,
    avg_rating: p.avg_rating ?? 0,
    review_count: p.review_count ?? 0,
    min_price: p.min_price ?? null,
    is_partner: p.is_partner ?? false,
    info_lines: buildVendorInfoLines(withCat),
    style_tags: collectStyleTags(withCat),
    keyword_tags: collectKeywordTags(withCat),
  };
};

export const placeToVenue = (p: PlaceRow | PlaceWithCategory): Venue => {
  const wh = (p as PlaceWithCategory).place_wedding_halls ?? null;
  return {
    id: p.place_id,
    name: p.name,
    address: joinRegion(p.city, p.district) ?? "",
    thumbnail_url: p.main_image_url,
    rating: p.avg_rating ?? 0,
    review_count: p.review_count ?? 0,
    price_per_person: wh?.price_per_person ?? p.min_price ?? 0,
    min_guarantee: wh?.min_guarantee ?? 0,
    max_guarantee: wh?.max_guarantee ?? 0,
    is_partner: p.is_partner ?? false,
    created_at: p.created_at ?? "",
    updated_at: p.updated_at ?? "",
    hall_types: wh?.hall_styles ?? null,
    meal_options: wh?.meal_types ?? null,
    event_options: null,
    tags: p.tags ?? [],
  };
};

// Generic adapter for legacy detail pages (Hanbok/Studio/Suit/etc)
// Synthesizes the old standalone-table shape from places + place_<category> data.
export interface LegacyVendorShape {
  id: string;
  name: string;
  address: string;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  is_partner: boolean;
  price_range: string;
  created_at: string;
  updated_at: string;
}

export const placeToLegacyVendor = (
  p: PlaceRow,
  pricePerPerson?: number | null
): LegacyVendorShape => ({
  id: p.place_id,
  name: p.name,
  address: joinRegion(p.city, p.district) ?? "",
  thumbnail_url: p.main_image_url,
  rating: p.avg_rating ?? 0,
  review_count: p.review_count ?? 0,
  is_partner: p.is_partner ?? false,
  price_range:
    pricePerPerson != null
      ? `${(pricePerPerson / 10000).toFixed(0)}만원~`
      : p.min_price != null
        ? `${(p.min_price / 10000).toFixed(0)}만원~`
        : "가격 문의",
  created_at: p.created_at ?? "",
  updated_at: p.updated_at ?? "",
});
