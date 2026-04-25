import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_CARD_TABLE } from "@/lib/placeMappers";
import type { Database } from "@/integrations/supabase/types";

type PlaceDetailsRow = Database["public"]["Tables"]["place_details"]["Row"];

/**
 * Fetches a places row joined with place_details and the matching
 * place_<category> card table, then synthesizes the legacy card shape
 * used by existing detail pages. New rich fields are exposed under
 * `details` and `card` so pages can opt in incrementally.
 */
export interface LegacyDetail {
  id: string;
  name: string;
  category: string;
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
  details: PlaceDetailsRow | null;
  card: Record<string, unknown> | null;
}

const fmtPrice = (min: number | null): string =>
  min != null ? `${(min / 10000).toFixed(0)}만원~` : "가격 문의";

const num = (v: unknown): number | null =>
  typeof v === "number" ? v : null;

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];

export const usePlaceDetail = (placeId: string | undefined) => {
  return useQuery({
    queryKey: ["place_detail", placeId],
    queryFn: async (): Promise<LegacyDetail | null> => {
      if (!placeId) return null;

      const { data: place, error } = await supabase
        .from("places")
        .select("*, place_details(*)")
        .eq("place_id", placeId)
        .maybeSingle();
      if (error) throw error;
      if (!place) return null;

      const cardTable = CATEGORY_CARD_TABLE[place.category];
      let card: Record<string, unknown> | null = null;
      if (cardTable) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cardQuery = supabase.from(cardTable as any).select("*").eq("place_id", placeId).maybeSingle();
        const { data: cardData } = await cardQuery;
        card = (cardData as Record<string, unknown> | null) ?? null;
      }

      const details = (place.place_details as PlaceDetailsRow | null) ?? null;
      const address = [place.city, place.district].filter(Boolean).join(" ");
      const cardPrice = card ? num(card.price_per_person) : null;
      const effectivePrice = cardPrice ?? place.min_price ?? null;

      return {
        id: place.place_id,
        name: place.name,
        category: place.category,
        address,
        thumbnail_url: place.main_image_url,
        rating: place.avg_rating ?? 0,
        review_count: place.review_count ?? 0,
        is_partner: place.is_partner ?? false,
        price_range: fmtPrice(effectivePrice),
        price_per_person: effectivePrice ?? 0,
        min_guarantee: card ? num(card.min_guarantee) ?? 0 : 0,
        destination: address,
        brand: address,
        created_at: place.created_at ?? "",
        updated_at: place.updated_at ?? "",
        hanbok_types: card ? strArr(card.hanbok_types) : [],
        suit_types: card ? strArr(card.suit_types) : [],
        package_types: card ? strArr(card.package_types) : [],
        style_options: card ? strArr(card.style_options) : [],
        service_options: card ? strArr(card.service_options) : [],
        category_types: card ? strArr(card.category_types) : [],
        brand_options: card ? strArr(card.brand_options) : [],
        feature_options: card ? strArr(card.feature_options) : [],
        delivery_options: card ? strArr(card.delivery_options) : [],
        included_services: card ? strArr(card.included_services) : [],
        accommodation_types: card ? strArr(card.accommodation_types) : [],
        trip_types: card ? strArr(card.trip_types) : [],
        details,
        card,
      };
    },
    enabled: !!placeId,
  });
};
