import type { Database } from "@/integrations/supabase/types";

export type PlaceRow = Database["public"]["Tables"]["places"]["Row"];

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
  const won = v.min_price;
  const amount =
    won >= 10000
      ? `${(won / 10000).toFixed(0)}만원~`
      : `${won.toLocaleString()}원~`;
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
  is_partner: boolean;
  created_at: string;
  updated_at: string;
  hall_types: string[] | null;
  meal_options: string[] | null;
  event_options: string[] | null;
}

const joinRegion = (city: string | null, district: string | null) =>
  [city, district].filter(Boolean).join(" ") || null;

export const placeToVendor = (p: PlaceRow): Vendor => ({
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
});

export const placeToVenue = (p: PlaceRow): Venue => ({
  id: p.place_id,
  name: p.name,
  address: joinRegion(p.city, p.district) ?? "",
  thumbnail_url: p.main_image_url,
  rating: p.avg_rating ?? 0,
  review_count: p.review_count ?? 0,
  price_per_person: p.min_price ?? 0,
  min_guarantee: 0,
  is_partner: p.is_partner ?? false,
  created_at: p.created_at ?? "",
  updated_at: p.updated_at ?? "",
  hall_types: null,
  meal_options: null,
  event_options: null,
});

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
