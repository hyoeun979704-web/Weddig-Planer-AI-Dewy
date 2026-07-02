import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { readySubscription } from "@/features/consumer/data/payments";
import { openExternal } from "@/lib/native/openExternal";
import { toast } from "sonner";
import { safeSessionStorage } from "@/lib/safeSessionStorage";
import { getPaymentProvider, purchaseSubscriptionIap, subscriptionIapPrice, iapStoreName } from "@/lib/payments";
import { MINOR_PAYMENT_NOTICE } from "@/lib/legalNotices";

type PlanType = "trial" | "monthly" | "yearly";

const KAKAO_PAY_SESSION_KEY = "kakao_pay_session";

const SubscriptionCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

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

  // 결제수단: 웹=카카오페이, 네이티브(Android·iOS)=IAP(+10%).
  const provider = getPaymentProvider();
  const isIap = provider === "iap";
  const displayAmount = isIap && type !== "trial" ? subscriptionIapPrice(type) : amount;

  // 무료체험 안내 문구는 결제수단별로 사실관계가 다르다(3.1.1/3.1.2 — 거짓 설명 금지).
  // 웹(카카오) = 100원 카드 인증 후 즉시 환불(자동결제 없음). 네이티브(IAP) = 스토어 무료체험 →
  // 종료 후 자동 갱신(스토어 설정에서 해지 가능). iOS 빌드에 카드 인증 문구를 노출하면 안 된다.
  const trialSubtitle = isIap
    ? `첫 1개월 무료 · 무료 기간이 끝나면 자동 갱신돼요`
    : `100원 인증 후 즉시 환불 · 1개월 무료 이용`;
  const trialNote = isIap
    ? `${iapStoreName()}의 무료체험으로 1개월간 무료 이용 후, 해지하지 않으면 다음 기간 요금이 자동 청구됩니다. 무료 기간 중 ${iapStoreName()} 구독 메뉴에서 언제든 해지할 수 있어요.`
    : `카드 유효성 확인을 위해 100원이 결제 후 즉시 환불됩니다. 체험 종료 후 자동 결제는 없습니다.`;

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  const handlePayment = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await readySubscription({ type, origin: window.location.origin });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "결제 준비에 실패했습니다");
      }

      safeSessionStorage.setItem(
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
      const redirectUrl = (isMobile ? data.next_redirect_mobile_url : data.next_redirect_pc_url) as string;
      // 네이티브: Custom Tabs 로 띄워 카카오페이 → 은행/카드 앱 → 복귀 흐름 보존.
      await openExternal(redirectUrl, { target: '_self' });
    } catch (err: any) {
      console.error("Kakao pay ready failed:", err);
      toast.error(err.message || "결제 요청에 실패했습니다");
      setIsSubmitting(false);
    }
  };

  // 네이티브 구독 IAP — Android=Google Play / iOS=App Store. 서버(iap-verify-google|apple)가
  // 검증 후 구독 활성·보너스 하트 지급.
  const handleIapSubscribe = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await purchaseSubscriptionIap(user.id, type);
      if (result.ok) {
        toast.success("구독이 시작되었어요");
        navigate("/premium");
      } else {
        toast.error(result.message || "구독 결제에 실패했어요");
      }
    } catch (err: any) {
      console.error("IAP subscribe failed:", err);
      toast.error(err?.message || "구독 결제에 실패했어요");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title={type === "trial" ? "결제 정보 등록" : "구독 결제"} />

      <main className="pb-32 px-4 py-4 space-y-4">
        <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-foreground">{label}</p>
              {type === "trial" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {trialSubtitle}
                </p>
              )}
            </div>
            <p className="text-lg font-bold text-primary">
              {type === "trial" ? "0원" : `${displayAmount.toLocaleString()}원`}
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
               {trialNote}
            </p>
          )}
        </div>

        {isEarlyBird && (
          <div className="p-4 rounded-2xl border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <span className="text-base"></span>
              <p className="font-semibold text-foreground text-sm">초기 이용자 특전</p>
            </div>
            <p className="text-sm text-foreground mt-2">
              결제 완료 시 AI 스튜디오 하트 <span className="font-bold text-primary">{heartBonus}개</span> 즉시 지급
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              2026년 7월까지 결제 시 한정 · 가입 기념 혜택과 별도 지급
            </p>
            <p className="text-[11px] text-destructive mt-2 bg-destructive/5 rounded-lg p-2">
               보너스 하트를 1개라도 사용하면 해당 결제는 환불이 제한됩니다.
            </p>
          </div>
        )}

        {provider !== "unavailable" && (
          <div className="p-4 bg-card rounded-2xl border border-border">
            <p className="text-sm font-semibold text-foreground mb-2">결제 수단</p>
            {provider === "iap" ? (
              <>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white ${provider === "iap" && iapStoreName() === "App Store" ? "bg-black" : "bg-[#01875F]"}`}>
                    {iapStoreName() === "App Store" ? "" : "▶"}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{iapStoreName()} 인앱결제</p>
                    <p className="text-xs text-muted-foreground">스토어 계정으로 안전하게 결제</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">
                  {type === "trial"
                    ? `${label} · 무료체험 종료 후 자동 갱신`
                    : `${label} · 자동 갱신 구독`}
                  {" "}— 구독은 현재 기간이 끝나기 전 자동으로 갱신되며, 갱신 24시간 전까지 {iapStoreName()}의 구독 설정에서 해지하지 않으면 다음 기간 요금이 청구됩니다. 구독 관리·해지는 {iapStoreName()}의 구독 메뉴에서 할 수 있어요.
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {provider !== "unavailable" && (
          <p className="text-[11px] text-muted-foreground px-1">{MINOR_PAYMENT_NOTICE}</p>
        )}

        {/* 구독 필수 고지 링크(App Store 3.1.2 / Google Play) — 약관·개인정보처리방침 인앱 기능 링크. */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground pt-1">
          <Link to="/terms" className="underline underline-offset-2">이용약관</Link>
          <span aria-hidden>·</span>
          <Link to="/privacy" className="underline underline-offset-2">개인정보처리방침</Link>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 app-col mx-auto px-4 pt-4 pb-[calc(1rem+var(--safe-bottom))] bg-background border-t border-border">
        {provider === "unavailable" ? (
          // iOS: StoreKit IAP 선반영 전까지 결제 UI 숨김(anti-steering — 웹 안내/링크 미노출).
          <p className="text-[12px] text-muted-foreground text-center py-2">
            구독 결제 기능을 준비 중이에요.
          </p>
        ) : provider === "iap" ? (
          <>
            <label className="flex items-start gap-2 mb-2 text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>프리미엄은 디지털 서비스로 결제 즉시 이용이 시작되며, 이용을 개시하면 청약철회가 제한될 수 있음에 동의합니다. (전자상거래법 제17조)</span>
            </label>
            <button
              onClick={handleIapSubscribe}
              disabled={isSubmitting || !agreed}
              className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {type === "trial" ? "무료 체험 시작" : `${iapStoreName()}로 ${displayAmount.toLocaleString()}원 구독`}
            </button>
          </>
        ) : (
          <>
            <label className="flex items-start gap-2 mb-2 text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>프리미엄은 디지털 서비스로 결제 즉시 이용이 시작되며, 이용을 개시하면 청약철회가 제한될 수 있음에 동의합니다. (전자상거래법 제17조)</span>
            </label>
            <button
              onClick={handlePayment}
              disabled={isSubmitting || !agreed}
              className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {type === "trial" ? "카카오페이로 인증하기" : `카카오페이로 ${amount.toLocaleString()}원 결제`}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionCheckout;
