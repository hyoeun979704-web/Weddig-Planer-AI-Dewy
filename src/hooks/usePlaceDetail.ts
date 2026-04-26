import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches a places row + its matching place_<category> card and synthesizes
 * the legacy detail shape that the existing detail pages (HanbokDetail,
 * StudioDetail, etc) consume. Single round-trip via PostgREST embedded selects:
 * all 9 category tables are LEFT JOINed; only the matching one is non-null.
 */
export interface LegacyDetail {
  id: string;
  name: string;
  address: string;
  thumbnail_url: string | null;
  rating: number;
  review_count: number;
  is_partner: boolean;
  price_range: string;
  price_per_person: number;
  min_guarantee: number;
  duration?: string;
  destination?: string;
  brand?: string;
  created_at: string;
  updated_at: string;
  hanbok_types?: string[] | null;
  suit_types?: string[] | null;
  package_types?: string[] | null;
  style_options?: string[] | null;
  service_options?: string[] | null;
  category_types?: string[] | null;
  brand_options?: string[] | null;
  feature_options?: string[] | null;
  delivery_options?: string[] | null;
  included_services?: string[] | null;
  accommodation_types?: string[] | null;
  trip_types?: string[] | null;
  custom_available?: boolean | null;
  includes_originals?: boolean | null;
  includes_rehearsal?: boolean | null;
}

const fmtPrice = (min: number | null): string =>
  min != null ? `${(min / 10000).toFixed(0)}만원~` : "가격 문의";

const CARD_KEY: Record<string, string> = {
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

// All 9 card tables embedded. PostgREST returns each as object-or-null; the
// 1:1 place_id PK FK guarantees at most one row per place.
const SELECT_WITH_ALL_CARDS = [
  "*",
  "place_wedding_halls(hall_styles,meal_types,min_guarantee,max_guarantee,price_per_person)",
  "place_studios(shoot_styles,includes_originals,price_per_person)",
  "place_dress_shops(dress_styles,rental_only,price_per_person)",
  "place_makeup_shops(makeup_styles,includes_rehearsal,price_per_person)",
  "place_hanboks(hanbok_types,custom_available,price_per_person)",
  "place_tailor_shops(suit_styles,custom_available,price_per_person)",
  "place_honeymoons(destinations,duration_days,price_per_person)",
  "place_appliances(product_categories,brand_options,price_per_person)",
  "place_invitation_venues(venue_types,capacity_min,capacity_max,price_per_person)",
].join(",");

// Map place + category-specific card row into the legacy field names that
// detail pages already render.
function mergeCard(place: any, card: any): Partial<LegacyDetail> {
  if (!card) return {};
  switch (place.category) {
    case "wedding_hall":
      return {
        min_guarantee: card.min_guarantee ?? 0,
        style_options: card.hall_styles ?? [],
      };
    case "studio":
      return {
        package_types: card.shoot_styles ?? [],
        style_options: card.shoot_styles ?? [],
        includes_originals: card.includes_originals ?? null,
      };
    case "hanbok":
      return {
        hanbok_types: card.hanbok_types ?? [],
        style_options: card.hanbok_types ?? [],
        custom_available: card.custom_available ?? null,
      };
    case "tailor_shop":
      return {
        suit_types: card.suit_styles ?? [],
        style_options: card.suit_styles ?? [],
        custom_available: card.custom_available ?? null,
      };
    case "honeymoon":
      return {
        destination: card.destinations?.join(", ") ?? undefined,
        duration:
          card.duration_days != null ? `${card.duration_days}일` : undefined,
        trip_types: card.destinations ?? [],
        accommodation_types: card.destinations ?? [],
      };
    case "appliance":
      return {
        brand: card.brand_options?.join(", ") ?? undefined,
        category_types: card.product_categories ?? [],
        brand_options: card.brand_options ?? [],
      };
    case "invitation_venue":
      return {
        min_guarantee: card.capacity_min ?? 0,
        category_types: card.venue_types ?? [],
      };
    case "dress_shop":
      return { style_options: card.dress_styles ?? [] };
    case "makeup_shop":
      return {
        style_options: card.makeup_styles ?? [],
        includes_rehearsal: card.includes_rehearsal ?? null,
      };
    default:
      return {};
  }
}

export const usePlaceDetail = (placeId: string | undefined) => {
  return useQuery({
    queryKey: ["place_detail", placeId],
    queryFn: async (): Promise<LegacyDetail | null> => {
      if (!placeId) return null;
      const { data, error } = await supabase
        .from("places")
        .select(SELECT_WITH_ALL_CARDS)
        .eq("place_id", placeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const placeRow = data as any;
      const cardKey = CARD_KEY[placeRow.category];
      const card = cardKey ? placeRow[cardKey] : null;

      const address = [placeRow.city, placeRow.district].filter(Boolean).join(" ");
      const cardPrice = card?.price_per_person ?? null;
      const price = cardPrice ?? placeRow.min_price ?? 0;

      return {
        id: placeRow.place_id,
        name: placeRow.name,
        address,
        thumbnail_url: placeRow.main_image_url,
        rating: placeRow.avg_rating ?? 0,
        review_count: placeRow.review_count ?? 0,
        is_partner: placeRow.is_partner ?? false,
        price_range: fmtPrice(price || null),
        price_per_person: price,
        min_guarantee: 0,
        destination: address,
        brand: address,
        created_at: placeRow.created_at ?? "",
        updated_at: placeRow.updated_at ?? "",
        hanbok_types: [],
        suit_types: [],
        package_types: [],
        style_options: [],
        service_options: [],
        category_types: [],
        brand_options: [],
        feature_options: [],
        delivery_options: [],
        included_services: [],
        accommodation_types: [],
        trip_types: [],
        ...mergeCard(placeRow, card),
      };
    },
    enabled: !!placeId,
  });
};
