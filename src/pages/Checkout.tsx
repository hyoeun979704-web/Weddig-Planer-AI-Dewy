import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string;
const formatPrice = (price: number) => price.toLocaleString() + "원";

const generateOrderNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DW${date}${rand}`;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalAmount } = useCart();
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const paymentMethodRef = useRef<ReturnType<PaymentWidgetInstance["renderPaymentMethods"]> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user || items.length === 0) return;

    (async () => {
      try {
        const widget = await loadPaymentWidget(CLIENT_KEY, user.id);
        paymentWidgetRef.current = widget;

        const methods = widget.renderPaymentMethods(
          "#payment-widget",
          { value: totalAmount },
          { variantKey: "DEFAULT" }
        );
        paymentMethodRef.current = methods;

        widget.renderAgreement("#agreement-widget", { variantKey: "AGREEMENT" });

        setIsReady(true);
      } catch (error) {
        console.error("Failed to load payment widget:", error);
        toast.error("결제 위젯을 불러오지 못했습니다");
      }
    })();
  }, [user, items.length, totalAmount]);

  const handlePayment = async () => {
    if (!paymentWidgetRef.current || isSubmitting) return;
    setIsSubmitting(true);

    const orderNumber = generateOrderNumber();
    const orderName =
      items.length === 1
        ? items[0].product.name
        : `${items[0].product.name} 외 ${items.length - 1}건`;

    try {
      await paymentWidgetRef.current.requestPayment({
        orderId: orderNumber,
        orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user?.email || undefined,
      });
    } catch (error: any) {
      if (error.code === "USER_CANCEL") {
        toast.info("결제가 취소되었습니다");
      } else {
        toast.error(error.message || "결제 요청에 실패했습니다");
      }
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
        <button onClick={() => navigate("/store")} className="text-primary font-medium">
          스토어로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">주문/결제</h1>
        </div>
      </header>

      <main className="pb-32 px-4 py-4 space-y-4">
        {/* Order Summary */}
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

        {/* TossPayments Widget */}
        <div id="payment-widget" className="min-h-[300px]" />
        <div id="agreement-widget" />
      </main>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">총 결제 금액</span>
          <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
        </div>
        <button
          onClick={handlePayment}
          disabled={!isReady || isSubmitting}
          className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {formatPrice(totalAmount)} 결제하기
        </button>
      </div>
    </div>
  );
};

export default Checkout;
