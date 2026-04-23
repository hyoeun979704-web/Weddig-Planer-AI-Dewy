import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Vendor {
  vendor_id: string; // mapped from places.place_id (uuid)
  name: string;
  category_type: string; // Korean label
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

export interface WeddingHallDetail {
  vendor_id: string;
  meal_cost_range: string | null;
  rental_cost_range: string | null;
  meal_type: string | null;
  parking_info: string | null;
}

export interface VendorReview {
  review_id: number;
  user_id: number | null;
  vendor_id: string | null;
  item_id: number | null;
  rating: number;
  content: string | null;
  ai_summary: string | null;
  created_at: string;
}

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
] as const;

export type VendorCategoryType = typeof VENDOR_CATEGORIES[number];

export const categoryRouteMap: Record<string, { listPath: string; detailPath: string; label: string; emoji: string }> = {
  "웨딩홀": { listPath: "/vendors/웨딩홀", detailPath: "/vendor", label: "웨딩홀", emoji: "🏛️" },
  "스드메": { listPath: "/vendors/스드메", detailPath: "/vendor", label: "스드메", emoji: "📸" },
  "한복": { listPath: "/vendors/한복", detailPath: "/vendor", label: "한복", emoji: "👗" },
  "예복": { listPath: "/vendors/예복", detailPath: "/vendor", label: "예복", emoji: "👔" },
  "허니문": { listPath: "/vendors/허니문", detailPath: "/vendor", label: "허니문", emoji: "🌴" },
  "혼수": { listPath: "/vendors/혼수", detailPath: "/vendor", label: "혼수·가전", emoji: "🎁" },
  "청첩장": { listPath: "/vendors/청첩장", detailPath: "/vendor", label: "청첩장", emoji: "✉️" },
  "웨딩플래너": { listPath: "/vendors/웨딩플래너", detailPath: "/vendor", label: "웨딩플래너", emoji: "💐" },
};

// Korean category label ↔ places.category (English snake_case)
const KOREAN_TO_PLACE_CATEGORY: Record<string, string> = {
  "웨딩홀": "wedding_hall",
  "스드메": "studio",
  "한복": "hanbok",
  "예복": "suit",
  "허니문": "honeymoon",
  "혼수": "appliance",
  "청첩장": "invitation",
  "웨딩플래너": "planner",
};

const PLACE_TO_KOREAN_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(KOREAN_TO_PLACE_CATEGORY).map(([k, v]) => [v, k])
);

interface PlaceRow {
  place_id: string;
  category: string;
  name: string;
  city: string | null;
  district: string | null;
  main_image_url: string | null;
  tags: string[] | null;
  avg_rating: string | number | null;
  review_count: number | null;
}

const placeToVendor = (p: PlaceRow): Vendor => ({
  vendor_id: p.place_id,
  name: p.name,
  category_type: PLACE_TO_KOREAN_CATEGORY[p.category] || p.category,
  region: [p.city, p.district].filter(Boolean).join(" ") || null,
  address: [p.city, p.district].filter(Boolean).join(" ") || null,
  thumbnail_url: p.main_image_url,
  tel: null,
  business_hours: null,
  parking_location: null,
  parking_hours: null,
  sns_info: null,
  keywords: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags.join(", ") : null,
  amenities: null,
  avg_rating: Number(p.avg_rating) || 0,
  review_count: p.review_count || 0,
});

// Fetch vendors by category (Korean label)
export const useVendors = (categoryType?: string) => {
  return useQuery({
    queryKey: ["vendors", categoryType],
    queryFn: async (): Promise<Vendor[]> => {
      let query = supabase
        .from("places" as any)
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("avg_rating", { ascending: false });

      if (categoryType) {
        const placeCat = KOREAN_TO_PLACE_CATEGORY[categoryType] || categoryType;
        query = query.eq("category", placeCat);
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data || []) as unknown as PlaceRow[]).map(placeToVendor);
    },
  });
};

// Fetch single vendor by id (uuid)
export const useVendor = (vendorId: string) => {
  return useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: async (): Promise<Vendor | null> => {
      const { data, error } = await supabase
        .from("places" as any)
        .select("*")
        .eq("place_id", vendorId)
        .maybeSingle();
      if (error) throw error;
      return data ? placeToVendor(data as unknown as PlaceRow) : null;
    },
    enabled: !!vendorId,
  });
};

// Wedding hall detail (placeholder — places-based detail not yet wired)
export const useWeddingHallDetail = (vendorId: string) => {
  return useQuery({
    queryKey: ["wedding-hall-detail", vendorId],
    queryFn: async (): Promise<WeddingHallDetail | null> => null,
    enabled: false,
  });
};

// Vendor reviews (placeholder until place_reviews schema is wired)
export const useVendorReviews = (vendorId: string) => {
  return useQuery({
    queryKey: ["vendor-reviews", vendorId],
    queryFn: async (): Promise<VendorReview[]> => [],
    enabled: false,
  });
};

// Fetch all events
export const useEvents = (category?: string) => {
  return useQuery({
    queryKey: ["events", category],
    queryFn: async (): Promise<VendorEvent[]> => {
      let query = supabase
        .from("events" as any)
        .select("*")
        .order("view_count", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as VendorEvent[];
    },
  });
};

// Top recommended vendors for home page (no category filter)
export const useRecommendedVendors = (limit = 6) => {
  return useQuery({
    queryKey: ["recommended-vendors", limit],
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase
        .from("places" as any)
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("avg_rating", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data || []) as unknown as PlaceRow[]).map(placeToVendor);
    },
  });
};
