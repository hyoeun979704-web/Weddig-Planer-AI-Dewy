import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { loadPaymentWidget, PaymentWidgetInstance } from "@tosspayments/payment-widget-sdk";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CLIENT_KEY = "test_ck_jExPeJWYVQw9OlkxqkGP849R5gvN";

const generateOrderId = (type: string) => {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SUB_${type.toUpperCase()}_${date}${rand}`;
};

const SubscriptionCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const type = searchParams.get("type") || "trial"; // trial | monthly | yearly
  const amount = type === "trial" ? 100 : type === "yearly" ? 39000 : 4900;
  const label =
    type === "trial"
      ? "무료 체험 (카드 등록)"
      : type === "yearly"
      ? "연간 구독 (39,000원/년)"
      : "월간 구독 (4,900원/월)";

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const widget = await loadPaymentWidget(CLIENT_KEY, user.id);
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#subscription-payment-widget", { value: amount }, { variantKey: "DEFAULT" });
        widget.renderAgreement("#subscription-agreement-widget", { variantKey: "AGREEMENT" });

        setIsReady(true);
      } catch (error) {
        console.error("Failed to load payment widget:", error);
        toast.error("결제 위젯을 불러오지 못했습니다");
      }
    })();
  }, [user, amount]);

  const handlePayment = async () => {
    if (!paymentWidgetRef.current || isSubmitting) return;
    setIsSubmitting(true);

    const orderId = generateOrderId(type);

    try {
      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName: label,
        successUrl: `${window.location.origin}/premium/payment/success?type=${type}`,
        failUrl: `${window.location.origin}/premium/payment/fail`,
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

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">
            {type === "trial" ? "결제 정보 등록" : "구독 결제"}
          </h1>
        </div>
      </header>

      <main className="pb-32 px-4 py-4 space-y-4">
        {/* Plan Info */}
        <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">{label}</p>
              {type === "trial" && (
                <p className="text-xs text-muted-foreground mt-1">
                  100원 인증 후 즉시 환불 · 1개월 무료 이용
                </p>
              )}
            </div>
            <p className="text-lg font-bold text-primary">
              {type === "trial" ? "0원" : `${amount.toLocaleString()}원`}
            </p>
          </div>
          {type === "trial" && (
            <p className="text-[11px] text-muted-foreground mt-2 bg-background/50 rounded-lg p-2">
              💡 카드 유효성 확인을 위해 100원이 결제 후 즉시 환불됩니다. 체험 종료 후 자동 결제는 없습니다.
            </p>
          )}
        </div>

        {/* TossPayments Widget */}
        <div id="subscription-payment-widget" className="min-h-[300px]" />
        <div id="subscription-agreement-widget" />
      </main>

      {/* Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
        <button
          onClick={handlePayment}
          disabled={!isReady || isSubmitting}
          className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {type === "trial" ? "결제 정보 등록 후 무료 체험 시작" : `${amount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
