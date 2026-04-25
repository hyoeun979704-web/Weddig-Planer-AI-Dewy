import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches a places row by place_id and synthesizes a legacy card shape
 * used by the existing detail pages (HanbokDetail, StudioDetail, etc).
 * Category-specific extras should be fetched separately by the page
 * from the matching place_<category> table.
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
}

const fmtPrice = (min: number | null): string =>
  min != null ? `${(min / 10000).toFixed(0)}만원~` : "가격 문의";

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
      const address = [data.city, data.district].filter(Boolean).join(" ");
      return {
        id: data.place_id,
        name: data.name,
        address,
        thumbnail_url: data.main_image_url,
        rating: data.avg_rating ?? 0,
        review_count: data.review_count ?? 0,
        is_partner: data.is_partner ?? false,
        price_range: fmtPrice(data.min_price),
        price_per_person: data.min_price ?? 0,
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
      };
    },
    enabled: !!placeId,
  });
};
