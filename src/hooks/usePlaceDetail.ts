import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Two-step fetch: places first, then the matching place_<category> card.
// We switch on category instead of dynamic .from() because Supabase's typed
// client requires a literal table name.
async function fetchCard(category: string, placeId: string): Promise<unknown> {
  // PostgrestBuilder is PromiseLike, not Promise — use that to keep types simple.
  const tables: Record<string, () => PromiseLike<{ data: unknown }>> = {
    wedding_hall: () =>
      supabase.from("place_wedding_halls").select("*").eq("place_id", placeId).maybeSingle(),
    studio: () =>
      supabase.from("place_studios").select("*").eq("place_id", placeId).maybeSingle(),
    dress_shop: () =>
      supabase.from("place_dress_shops").select("*").eq("place_id", placeId).maybeSingle(),
    makeup_shop: () =>
      supabase.from("place_makeup_shops").select("*").eq("place_id", placeId).maybeSingle(),
    hanbok: () =>
      supabase.from("place_hanboks").select("*").eq("place_id", placeId).maybeSingle(),
    tailor_shop: () =>
      supabase.from("place_tailor_shops").select("*").eq("place_id", placeId).maybeSingle(),
    honeymoon: () =>
      supabase.from("place_honeymoons").select("*").eq("place_id", placeId).maybeSingle(),
    appliance: () =>
      supabase.from("place_appliances").select("*").eq("place_id", placeId).maybeSingle(),
    invitation_venue: () =>
      supabase.from("place_invitation_venues").select("*").eq("place_id", placeId).maybeSingle(),
    planner: () =>
      supabase.from("place_planners").select("*").eq("place_id", placeId).maybeSingle(),
  };
  const fn = tables[category];
  if (!fn) return null;
  const { data } = await fn();
  return data;
}

/**
 * Fetches a places row + its matching place_<category> card and synthesizes
 * the legacy detail shape that the existing detail pages (HanbokDetail,
 * StudioDetail, etc) consume. Two round-trips total (places, then card).
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
    case "planner":
      return { service_options: card.service_packages ?? [] };
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
        .select("*")
        .eq("place_id", placeId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const card = (await fetchCard(data.category, placeId)) as any;

      const address = [data.city, data.district].filter(Boolean).join(" ");
      const cardPrice = card?.price_per_person ?? null;
      const price = cardPrice ?? data.min_price ?? 0;

      return {
        id: data.place_id,
        name: data.name,
        address,
        thumbnail_url: data.main_image_url,
        rating: data.avg_rating ?? 0,
        review_count: data.review_count ?? 0,
        is_partner: data.is_partner ?? false,
        price_range: fmtPrice(price || null),
        price_per_person: price,
        min_guarantee: 0,
        destination: address,
        brand: address,
        created_at: data.created_at ?? "",
        updated_at: data.updated_at ?? "",
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
        ...mergeCard(data, card),
      };
    },
    enabled: !!placeId,
  });
};
