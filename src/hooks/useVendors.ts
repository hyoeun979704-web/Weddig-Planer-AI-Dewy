import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  placeToVendor,
  KOREAN_TO_PLACE_CATEGORY,
  Vendor,
} from "@/lib/placeMappers";

export type { Vendor };

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

// Fetch vendors by category (Korean label)
export const useVendors = (categoryType?: string) => {
  return useQuery({
    queryKey: ["vendors", categoryType],
    queryFn: async (): Promise<Vendor[]> => {
      let query = supabase
        .from("places")
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
      return (data ?? []).map(placeToVendor);
    },
  });
};

// Fetch single vendor by id (uuid)
export const useVendor = (vendorId: string) => {
  return useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: async (): Promise<Vendor | null> => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("place_id", vendorId)
        .maybeSingle();
      if (error) throw error;
      return data ? placeToVendor(data) : null;
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
        .from("events")
        .select("*")
        .order("view_count", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as VendorEvent[];
    },
  });
};

// Top recommended vendors for home page (no category filter)
export const useRecommendedVendors = (limit = 6) => {
  return useQuery({
    queryKey: ["recommended-vendors", limit],
    queryFn: async (): Promise<Vendor[]> => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("avg_rating", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(placeToVendor);
    },
  });
};
