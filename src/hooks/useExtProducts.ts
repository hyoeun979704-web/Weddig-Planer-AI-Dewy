import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShoppingProduct {
  shopping_product_id: number;
  brand_id: number | null;
  product_name: string;
  discount_rate: number;
  price: number;
  original_price: number | null;
  keywords: string | null;
  rating: number;
  review_count: number;
  sales_count: number;
  thumbnail_url: string | null;
  detail_url: string | null;
  cautions: string | null;
}

export interface ExtProduct {
  item_id: number;
  vendor_id: number | null;
  category_sub: string | null;
  name: string;
  model_no: string | null;
  price: number | null;
  original_price: number | null;
  delivery_period: string | null;
  as_warranty: string | null;
  specs: Record<string, string> | null;
  purchase_url: string | null;
}

export interface ProductOption {
  option_id: number;
  item_id: number | null;
  option_name: string | null;
  features: string | null;
  extra_price: number;
  sort_order: number;
}

export const useShoppingProducts = () => {
  return useQuery({
    queryKey: ["shopping-products"],
    queryFn: async (): Promise<ShoppingProduct[]> => {
      const { data, error } = await supabase
        .from("shopping_products" as any)
        .select("*")
        .order("sales_count", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ShoppingProduct[];
    },
  });
};

export const useExtProducts = (categorySub?: string) => {
  return useQuery({
    queryKey: ["ext-products", categorySub],
    queryFn: async (): Promise<ExtProduct[]> => {
      let query = supabase
        .from("ext_products" as any)
        .select("*");
      if (categorySub) {
        query = query.eq("category_sub", categorySub);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ExtProduct[];
    },
  });
};

export const useExtProduct = (itemId: number | string) => {
  return useQuery({
    queryKey: ["ext-product", itemId],
    queryFn: async (): Promise<ExtProduct | null> => {
      const { data, error } = await supabase
        .from("ext_products" as any)
        .select("*")
        .eq("item_id", Number(itemId))
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ExtProduct | null;
    },
    enabled: !!itemId,
  });
};

export const useProductOptions = (itemId: number | string) => {
  return useQuery({
    queryKey: ["product-options", itemId],
    queryFn: async (): Promise<ProductOption[]> => {
      const { data, error } = await supabase
        .from("product_options" as any)
        .select("*")
        .eq("item_id", Number(itemId))
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ProductOption[];
    },
    enabled: !!itemId,
  });
};
