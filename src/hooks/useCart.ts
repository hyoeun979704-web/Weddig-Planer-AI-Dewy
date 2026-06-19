import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const cartKey = (userId: string | undefined) => ["cart", userId ?? null] as const;

const fetchCartItems = async (userId: string): Promise<CartItem[]> => {
  const { data, error } = await (supabase
    .from("cart_items" as any)
    .select("id, product_id, quantity, products(id, name, price, sale_price, thumbnail_url, stock)") as any)
    .eq("user_id", userId);

  if (error) throw error;

  // 삭제된 상품은 임베드 조인이 null 을 반환한다 → null 행을 제외하지 않으면
  // 이후 item.product.sale_price 접근에서 카트 페이지 전체가 크래시한다.
  return (data || [])
    .filter((item: any) => item.products != null)
    .map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product: item.products,
    }));
};

export const useCart = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: cartKey(userId),
    enabled: !!userId,
    queryFn: () => fetchCartItems(userId!),
    staleTime: 30_000,
  });

  const items = cartQuery.data ?? [];
  const isLoading = !!userId && cartQuery.isLoading;
  const refreshCart = useCallback(async () => {
    if (!userId) return [];
    const next = await queryClient.fetchQuery({
      queryKey: cartKey(userId),
      queryFn: () => fetchCartItems(userId),
      staleTime: 0,
    });
    return next;
  }, [queryClient, userId]);

  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      return false;
    }

    const existing = items.find((i) => i.product_id === productId);

    // Supabase 는 에러를 throw 하지 않으므로 { error } 를 직접 확인. 안 그러면
    // 실패해도 "담았어요" + true 를 반환해 거짓 성공이 된다(바로구매 등에서 위험).
    const { error } = existing
      ? await (supabase.from("cart_items" as any) as any)
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id)
      : await (supabase.from("cart_items" as any) as any)
          .insert({ user_id: user.id, product_id: productId, quantity });

    if (error) {
      console.error("Error adding to cart:", error);
      toast.error("장바구니 추가에 실패했습니다");
      return false;
    }

    toast.success("장바구니에 담았어요");
    await refreshCart();
    return true;
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return removeItem(cartItemId);

    // Supabase 는 에러를 throw 하지 않으므로 { error } 를 직접 확인. 안 그러면
    // 실패해도 낙관적 업데이트가 적용돼 화면과 DB 가 어긋난다.
    const { error } = await (supabase.from("cart_items" as any) as any)
      .update({ quantity })
      .eq("id", cartItemId);
    if (error) {
      console.error("Error updating quantity:", error);
      toast.error("수량 변경에 실패했어요");
      return;
    }
    queryClient.setQueryData<CartItem[]>(cartKey(userId), (prev) =>
      (prev ?? []).map((i) => (i.id === cartItemId ? { ...i, quantity } : i))
    );
  };

  const removeItem = async (cartItemId: string) => {
    const { error } = await (supabase.from("cart_items" as any) as any)
      .delete()
      .eq("id", cartItemId);
    if (error) {
      console.error("Error removing item:", error);
      toast.error("삭제에 실패했어요");
      return;
    }
    queryClient.setQueryData<CartItem[]>(cartKey(userId), (prev) =>
      (prev ?? []).filter((i) => i.id !== cartItemId)
    );
    toast.success("삭제되었습니다");
  };

  const clearCart = async () => {
    if (!user) return;
    const { error } = await (supabase.from("cart_items" as any) as any)
      .delete()
      .eq("user_id", user.id);
    if (error) {
      console.error("Error clearing cart:", error);
      return;
    }
    queryClient.setQueryData<CartItem[]>(cartKey(userId), []);
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
    refetch: refreshCart,
  };
};
