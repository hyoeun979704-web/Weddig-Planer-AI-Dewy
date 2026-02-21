import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    sale_price: number | null;
    thumbnail_url: string | null;
    stock: number;
  };
}

export const useCart = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase
        .from("cart_items" as any)
        .select("id, product_id, quantity, products(id, name, price, sale_price, thumbnail_url, stock)") as any)
        .eq("user_id", user.id);

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        product: item.products,
      }));

      setItems(mapped);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }

    try {
      const existing = items.find((i) => i.product_id === productId);

      if (existing) {
        await (supabase
          .from("cart_items" as any) as any)
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
      } else {
        await (supabase
          .from("cart_items" as any) as any)
          .insert({ user_id: user.id, product_id: productId, quantity });
      }

      toast.success("장바구니에 담았어요 🛒");
      await fetchCart();
      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("장바구니 추가에 실패했습니다");
      return false;
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return removeItem(cartItemId);

    try {
      await (supabase.from("cart_items" as any) as any).update({ quantity }).eq("id", cartItemId);
      setItems((prev) =>
        prev.map((i) => (i.id === cartItemId ? { ...i, quantity } : i))
      );
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      await (supabase.from("cart_items" as any) as any).delete().eq("id", cartItemId);
      setItems((prev) => prev.filter((i) => i.id !== cartItemId));
      toast.success("삭제되었습니다");
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const clearCart = async () => {
    if (!user) return;
    try {
      await (supabase.from("cart_items" as any) as any).delete().eq("user_id", user.id);
      setItems([]);
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const totalAmount = items.reduce((sum, item) => {
    const price = item.product.sale_price ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    isLoading,
    itemCount,
    totalAmount,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refetch: fetchCart,
  };
};
