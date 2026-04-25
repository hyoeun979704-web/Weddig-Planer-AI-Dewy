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

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_KO = ["월", "화", "수", "목", "금", "토", "일"] as const;

function buildBusinessHours(details: Record<string, unknown>): string | null {
  const lines: string[] = [];
  for (let i = 0; i < DAY_KEYS.length; i++) {
    const v = details[`hours_${DAY_KEYS[i]}`];
    if (typeof v === "string" && v.trim()) lines.push(`${DAY_KO[i]}: ${v.trim()}`);
  }
  return lines.length > 0 ? lines.join(", ") : null;
}

function buildSnsInfo(details: Record<string, unknown>): Record<string, string> | null {
  const map: Record<string, string> = {};
  const entries: Array<[string, string]> = [
    ["instagram", "instagram_url"],
    ["facebook", "facebook_url"],
    ["kakao", "kakao_channel_url"],
    ["naver_blog", "naver_blog_url"],
    ["naver_place", "naver_place_url"],
    ["youtube", "youtube_url"],
    ["website", "website_url"],
  ];
  for (const [key, col] of entries) {
    const v = details[col];
    if (typeof v === "string" && v.trim()) map[key] = v;
  }
  return Object.keys(map).length > 0 ? map : null;
}

// Fetch single vendor by id (uuid). Joins place_details so the detail page
// gets tel/business_hours/parking/SNS instead of the placeholders that
// placeToVendor leaves on the bare place row.
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
      if (!data) return null;
      const base = placeToVendor(data);

      const { data: details } = await supabase
        .from("place_details")
        .select("*")
        .eq("place_id", vendorId)
        .maybeSingle();
      if (!details) return base;
      const d = details as Record<string, unknown>;

      const parkingHours = [d.parking_free_guest, d.parking_free_parents]
        .filter((x): x is string => typeof x === "string" && !!x.trim())
        .join(" · ") || null;

      return {
        ...base,
        tel: typeof d.tel === "string" ? d.tel : base.tel,
        business_hours: buildBusinessHours(d) ?? base.business_hours,
        parking_location:
          typeof d.parking_location === "string" ? d.parking_location : base.parking_location,
        parking_hours: parkingHours ?? base.parking_hours,
        sns_info: buildSnsInfo(d) ?? base.sns_info,
        amenities:
          Array.isArray(d.pros) && d.pros.length > 0
            ? (d.pros as string[]).join(", ")
            : base.amenities,
      };
    },
    enabled: !!vendorId,
  });
};

// events table removed during schema cleanup. Stub preserved for callers.
export const useEvents = (_category?: string) => {
  return useQuery({
    queryKey: ["events", _category],
    queryFn: async (): Promise<VendorEvent[]> => [],
    enabled: false,
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
