import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/native/openExternal";
import { toast } from "sonner";

const formatPrice = (price: number) => price.toLocaleString() + "원";
// 결제 복귀 시 승인에 쓸 주문 정보(tid)를 보존.
export const ORDER_SESSION_KEY = "dewy:order:pending";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalAmount } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePayment = async () => {
    if (isSubmitting || !user || items.length === 0) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("kakao-pay-order-ready", {
        body: {
          items: items.map((it) => ({ product_id: it.product.id, quantity: it.quantity })),
          origin: window.location.origin,
        },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "결제 준비에 실패했습니다");
      }
      sessionStorage.setItem(
        ORDER_SESSION_KEY,
        JSON.stringify({ tid: data.tid, partnerOrderId: data.partner_order_id, partnerUserId: data.partner_user_id }),
      );
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const redirectUrl = isMobile ? data.next_redirect_mobile_url : data.next_redirect_pc_url;
      await openExternal(redirectUrl, { target: "_self" });
    } catch (err: any) {
      console.error("order ready failed:", err);
      toast.error(err.message || "결제 요청에 실패했습니다");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground mb-4">장바구니가 비어있습니다</p>
        <button onClick={() => navigate("/store")} className="text-primary font-medium">스토어로 이동</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <Seo title="주문·결제 | Dewy" description="주문 정보를 확인하고 결제를 진행하세요." path="/checkout" noIndex />
      <PageHeader title="주문/결제" />

      <main className="pb-32 px-4 py-4 space-y-4">
        <div>
          <h3 className="font-bold text-foreground mb-3">주문 상품</h3>
          <div className="space-y-2">
            {items.map((item) => {
              const price = item.product.sale_price ?? item.product.price;
              return (
                <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">수량: {item.quantity}개</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{formatPrice(price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <p className="text-sm font-semibold text-foreground mb-2">결제 수단</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FEE500]/20 border border-[#FEE500]">
            <span className="text-sm font-bold text-foreground">카카오페이</span>
            <span className="text-xs text-muted-foreground">카카오톡으로 간편결제</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">결제 진행 시 카카오페이 결제창으로 이동합니다.</p>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">총 결제 금액</span>
          <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
        </div>
        <button
          onClick={handlePayment}
          disabled={isSubmitting}
          className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          카카오페이로 {formatPrice(totalAmount)} 결제
        </button>
      </div>
    </div>
  );
};

export default Checkout;
