import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryTab } from "@/components/home/CategoryTabBar";

export interface RecommendedItem {
  id: string;
  name: string;
  location: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
}

interface TabConfig {
  table: string;
  locationField: string;
  priceField: string;
  priceType: "number" | "string";
  listPath: string;
  detailPath: string;
  title: string;
}

const tabConfigMap: Record<CategoryTab, TabConfig> = {
  home: {
    table: "studios",
    locationField: "address",
    priceField: "price_per_person",
    priceType: "number",
    listPath: "/studios",
    detailPath: "/studio",
    title: "인기 스드메 추천",
  },
  events: {
    table: "honeymoon",
    locationField: "destination",
    priceField: "price_range",
    priceType: "string",
    listPath: "/honeymoon",
    detailPath: "/honeymoon",
    title: "인기 허니문 추천",
  },
  shopping: {
    table: "honeymoon_gifts",
    locationField: "brand",
    priceField: "price_range",
    priceType: "string",
    listPath: "/honeymoon-gifts",
    detailPath: "/honeymoon-gifts",
    title: "인기 쇼핑 상품",
  },
  info: {
    table: "suits",
    locationField: "address",
    priceField: "price_range",
    priceType: "string",
    listPath: "/suit",
    detailPath: "/suit",
    title: "인기 예복 추천",
  },
};

const formatPrice = (value: unknown, type: "number" | "string"): string => {
  if (type === "number" && typeof value === "number") {
    if (value >= 10000) {
      return `${Math.floor(value / 10000)}만원대`;
    }
    return `${value.toLocaleString()}원`;
  }
  return String(value || "가격 문의");
};

export const getTabConfig = (tab: CategoryTab) => tabConfigMap[tab];

export const useRecommendedItems = (activeTab: CategoryTab) => {
  const config = tabConfigMap[activeTab];

  return useQuery({
    queryKey: ["recommended", activeTab],
    queryFn: async (): Promise<RecommendedItem[]> => {
      let query = supabase
        .from(config.table as any)
        .select("*");

      query = query
        .order("is_partner", { ascending: false })
        .order("rating", { ascending: false });

      const { data, error } = await query.limit(6);

      if (error) throw error;
      if (!data) return [];

      return (data as any[]).map((item) => ({
        id: item.id || String(item.number),
        name: item.name,
        location: item[config.locationField] || "",
        priceRange: formatPrice(item[config.priceField], config.priceType),
        rating: parseFloat(item.rating) || 4.0,
        reviewCount: item.review_count || 0,
        imageUrl: item.thumbnail_url || "/placeholder.svg",
      }));
    },
  });
};
