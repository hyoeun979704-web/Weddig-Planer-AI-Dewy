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
  detailPath: string;
  title: string;
}

const tabConfigMap: Record<CategoryTab, TabConfig> = {
  home: {
    table: "venues",
    locationField: "address",
    priceField: "price_per_person",
    priceType: "number",
    detailPath: "/venues",
    title: "맞춤 웨딩홀 추천",
  },
  "wedding-hall": {
    table: "venues",
    locationField: "address",
    priceField: "price_per_person",
    priceType: "number",
    detailPath: "/venues",
    title: "맞춤 웨딩홀 추천",
  },
  sdm: {
    table: "studios",
    locationField: "address",
    priceField: "price_per_person",
    priceType: "number",
    detailPath: "/studios",
    title: "인기 스드메 패키지",
  },
  "honeymoon-gifts": {
    table: "honeymoon_gifts",
    locationField: "brand",
    priceField: "price_range",
    priceType: "string",
    detailPath: "/honeymoon-gifts",
    title: "혼수 특가 상품",
  },
  honeymoon: {
    table: "honeymoon",
    locationField: "destination",
    priceField: "price_range",
    priceType: "string",
    detailPath: "/honeymoon",
    title: "인기 허니문 패키지",
  },
  appliances: {
    table: "appliances",
    locationField: "brand",
    priceField: "price_range",
    priceType: "string",
    detailPath: "/appliances",
    title: "가전·예물 베스트",
  },
  suit: {
    table: "suits",
    locationField: "address",
    priceField: "price_range",
    priceType: "string",
    detailPath: "/suit",
    title: "인기 예복샵",
  },
  hanbok: {
    table: "hanbok",
    locationField: "address",
    priceField: "price_range",
    priceType: "string",
    detailPath: "/hanbok",
    title: "인기 한복샵",
  },
  invitation: {
    table: "invitation_venues",
    locationField: "address",
    priceField: "price_range",
    priceType: "string",
    detailPath: "/invitation-venues",
    title: "인기 청첩장 모임 장소",
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
      const { data, error } = await supabase
        .from(config.table as any)
        .select("*")
        .order("is_partner", { ascending: false })
        .order("rating", { ascending: false })
        .limit(6);

      if (error) throw error;
      if (!data) return [];

      return (data as any[]).map((item) => ({
        id: item.id,
        name: item.name,
        location: item[config.locationField] || "",
        priceRange: formatPrice(item[config.priceField], config.priceType),
        rating: item.rating || 4.0,
        reviewCount: item.review_count || 0,
        imageUrl: item.thumbnail_url || "/placeholder.svg",
      }));
    },
  });
};
