import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Vendor {
  vendor_id: number;
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

export interface WeddingHallDetail {
  vendor_id: number;
  meal_cost_range: string | null;
  rental_cost_range: string | null;
  meal_type: string | null;
  parking_info: string | null;
}

export interface VendorReview {
  review_id: number;
  user_id: number | null;
  vendor_id: number | null;
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

// All vendor category types from external data
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

// Category type to route mapping
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

// Fetch vendors by category
export const useVendors = (categoryType?: string) => {
  return useQuery({
    queryKey: ["vendors", categoryType],
    queryFn: async (): Promise<Vendor[]> => {
      let query = supabase
        .from("vendors" as any)
        .select("*")
        .order("avg_rating", { ascending: false });

      if (categoryType) {
        query = query.eq("category_type", categoryType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Vendor[];
    },
  });
};

// Fetch single vendor by id
export const useVendor = (vendorId: number | string) => {
  return useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: async (): Promise<Vendor | null> => {
      const { data, error } = await supabase
        .from("vendors" as any)
        .select("*")
        .eq("vendor_id", Number(vendorId))
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Vendor | null;
    },
    enabled: !!vendorId,
  });
};

// Fetch wedding hall details for a vendor
export const useWeddingHallDetail = (vendorId: number | string) => {
  return useQuery({
    queryKey: ["wedding-hall-detail", vendorId],
    queryFn: async (): Promise<WeddingHallDetail | null> => {
      const { data, error } = await supabase
        .from("ext_wedding_halls" as any)
        .select("*")
        .eq("vendor_id", Number(vendorId))
        .maybeSingle();
      if (error) throw error;
      return data as unknown as WeddingHallDetail | null;
    },
    enabled: !!vendorId,
  });
};

// Fetch reviews for a vendor
export const useVendorReviews = (vendorId: number | string) => {
  return useQuery({
    queryKey: ["vendor-reviews", vendorId],
    queryFn: async (): Promise<VendorReview[]> => {
      const { data, error } = await supabase
        .from("reviews" as any)
        .select("*")
        .eq("vendor_id", Number(vendorId))
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VendorReview[];
    },
    enabled: !!vendorId,
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

// Fetch top recommended vendors for home page
export const useRecommendedVendors = (limit = 6) => {
  return useQuery({
    queryKey: ["recommended-vendors", limit],
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase
        .from("vendors" as any)
        .select("*")
        .order("avg_rating", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as Vendor[];
    },
  });
};
