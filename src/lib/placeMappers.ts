import type { Database } from "@/integrations/supabase/types";

export type PlaceRow = Database["public"]["Tables"]["places"]["Row"];

// Korean UI category label ↔ places.category snake_case
export const KOREAN_TO_PLACE_CATEGORY: Record<string, string> = {
  "웨딩홀": "wedding_hall",
  "스드메": "studio",
  "한복": "hanbok",
  "예복": "suit",
  "허니문": "honeymoon",
  "혼수": "appliance",
  "청첩장": "invitation",
  "웨딩플래너": "planner",
};

export const PLACE_TO_KOREAN_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(KOREAN_TO_PLACE_CATEGORY).map(([k, v]) => [v, k])
);

export interface Vendor {
  vendor_id: string;
  name: string;
  category_type: string;
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
}

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
});

export const placeToVenue = (p: PlaceRow): Venue => ({
  id: p.place_id,
  name: p.name,
  address: joinRegion(p.city, p.district) ?? "",
  thumbnail_url: p.main_image_url,
  rating: p.avg_rating ?? 0,
  review_count: p.review_count ?? 0,
  price_per_person: p.min_price ?? 0,
  min_guarantee: p.min_guarantee ?? 0,
  is_partner: p.is_partner ?? false,
  created_at: p.created_at ?? "",
  updated_at: p.updated_at ?? "",
  hall_types: null,
  meal_options: null,
  event_options: null,
});
