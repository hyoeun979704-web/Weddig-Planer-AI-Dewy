import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PlanType = "trial" | "monthly" | "yearly";

const KAKAO_PAY_SESSION_KEY = "kakao_pay_session";

const SubscriptionCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const type = (searchParams.get("type") || "trial") as PlanType;
  const amount = type === "trial" ? 100 : type === "yearly" ? 39000 : 4900;
  const originalPrice = type === "yearly" ? 118800 : type === "monthly" ? 9900 : 0;
  const discountPercent = type === "yearly" ? 67 : type === "monthly" ? 50 : 0;
  const label =
    type === "trial"
      ? "무료 체험 (카드 인증)"
      : type === "yearly"
      ? "연간 구독 (39,000원/년)"
      : "월간 구독 (4,900원/월)";
  const heartBonus = type === "yearly" ? 180 : type === "monthly" ? 10 : 0;
  const isEarlyBird = heartBonus > 0 && Date.now() < new Date("2026-08-01T00:00:00+09:00").getTime();

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const handlePayment = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("kakao-pay-ready", {
        body: { type, origin: window.location.origin },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "결제 준비에 실패했습니다");
      }

      sessionStorage.setItem(
        KAKAO_PAY_SESSION_KEY,
        JSON.stringify({
          tid: data.tid,
          partnerOrderId: data.partner_order_id,
          partnerUserId: data.partner_user_id,
          type,
          amount: data.amount,
        })
      );

      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const redirectUrl = isMobile ? data.next_redirect_mobile_url : data.next_redirect_pc_url;
      window.location.href = redirectUrl;
    } catch (err: any) {
      console.error("Kakao pay ready failed:", err);
      toast.error(err.message || "결제 요청에 실패했습니다");
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

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
          {originalPrice > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-muted-foreground line-through">정상가 {originalPrice.toLocaleString()}원</span>
              <span className="text-[11px] font-bold text-destructive">{discountPercent}% 할인</span>
            </div>
          )}
          {type === "trial" && (
            <p className="text-[11px] text-muted-foreground mt-2 bg-background/50 rounded-lg p-2">
              💡 카드 유효성 확인을 위해 100원이 결제 후 즉시 환불됩니다. 체험 종료 후 자동 결제는 없습니다.
            </p>
          )}
        </div>

        {isEarlyBird && (
          <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <span className="text-base">🎉</span>
              <p className="font-semibold text-foreground text-sm">초기 이용자 특전</p>
            </div>
            <p className="text-sm text-foreground mt-2">
              결제 완료 시 AI 스튜디오 하트 <span className="font-bold text-primary">{heartBonus}개</span> 즉시 지급
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              2026년 7월까지 결제 시 한정 · 가입 기념 혜택과 별도 지급
            </p>
            <p className="text-[11px] text-destructive mt-2 bg-destructive/5 rounded-lg p-2">
              ⚠ 보너스 하트를 1개라도 사용하면 해당 결제는 환불이 제한됩니다.
            </p>
          </div>
        )}

        <div className="p-4 bg-card rounded-2xl border border-border">
          <p className="text-sm font-semibold text-foreground mb-2">결제 수단</p>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <div className="w-10 h-10 rounded-lg bg-[#FFEB00] flex items-center justify-center text-lg font-bold text-[#3C1E1E]">
              K
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">카카오페이</p>
              <p className="text-xs text-muted-foreground">카카오톡으로 간편결제</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            결제 진행 시 카카오페이 결제창으로 이동합니다.
          </p>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-background border-t border-border">
        <button
          onClick={handlePayment}
          disabled={isSubmitting}
          className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {type === "trial" ? "카카오페이로 인증하기" : `카카오페이로 ${amount.toLocaleString()}원 결제`}
        </button>
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
