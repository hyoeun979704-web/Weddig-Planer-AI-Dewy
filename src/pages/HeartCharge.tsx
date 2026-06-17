import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePoints } from "@/hooks/usePoints";
import { openExternal } from "@/lib/native/openExternal";
import { toast } from "sonner";
import {
  HEART_PACKAGES,
  HeartPackage,
  POINT_TO_KRW,
  krwForPoints,
  maxPointsForPackage,
} from "@/lib/heartPackages";

const SESSION_KEY = "heart_charge_session";

const HeartCharge = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balance: pointBalance } = usePoints();

  const [selected, setSelected] = useState<HeartPackage | null>(null);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [isStarterUsed, setIsStarterUsed] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("heart_transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("reason", "charge_starter")
        .limit(1);
      setIsStarterUsed((data?.length ?? 0) > 0);
    })();
  }, [user, navigate]);

  const handleSelect = (pkg: HeartPackage) => {
    if (pkg.firstOnly && isStarterUsed) return;
    setSelected(pkg);
    setPointsToUse(0);
  };

  const finalAmount = selected
    ? selected.price - krwForPoints(pointsToUse)
    : 0;

  const maxUsablePoints = selected
    ? maxPointsForPackage(selected.price, pointBalance)
    : 0;

  const handlePay = async () => {
    if (!selected || isSubmitting || !user) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "kakao-pay-charge-ready",
        {
          body: {
            packageId: selected.id,
            pointsToSpend: pointsToUse,
            origin: window.location.origin,
          },
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "결제 준비 실패");
      }

      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          tid: data.tid,
          partnerOrderId: data.partner_order_id,
          partnerUserId: data.partner_user_id,
          packageId: selected.id,
          pointsToSpend: pointsToUse,
          hearts: data.hearts,
          finalAmount: data.final_amount,
        })
      );

      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const redirectUrl = isMobile
        ? data.next_redirect_mobile_url
        : data.next_redirect_pc_url;
      // 리다이렉트 URL 누락 시 스피너가 무한 대기하는 dead-end 방지 — 명시적 에러로 전환.
      if (!redirectUrl) throw new Error("결제 페이지 주소를 받지 못했어요. 잠시 후 다시 시도해주세요");
      // 네이티브: Custom Tabs 로 결제 흐름 위임, 웹: 동일 탭 이동.
      await openExternal(redirectUrl, { target: '_self' });
    } catch (err: any) {
      console.error("Heart charge ready failed:", err);
      toast.error(err.message || "결제 요청에 실패했습니다");
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title="하트 충전" />

      <main className="pb-40 px-4 py-4 space-y-4">
        {/* Heart packages */}
        <div className="space-y-2">
          {HEART_PACKAGES.map((pkg) => {
            const disabled = pkg.firstOnly && isStarterUsed === true;
            const active = selected?.id === pkg.id;
            return (
              <button
                key={pkg.id}
                onClick={() => handleSelect(pkg)}
                disabled={disabled}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-colors relative ${
                  active
                    ? "border-primary bg-primary/5"
                    : disabled
                    ? "border-border bg-muted opacity-50"
                    : "border-border bg-card"
                }`}
              >
                {pkg.highlight && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                    추천
                  </span>
                )}
                {pkg.firstOnly && (
                  <span className="absolute -top-2 left-3 px-2 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                    {disabled ? "사용 완료" : "1회 한정"}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">{pkg.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pkg.description}
                    </p>
                    <p className="text-sm text-foreground mt-1">
                       <span className="font-bold">{pkg.hearts}</span>개
                      <span className="text-xs text-muted-foreground ml-1">
                        (1H = {Math.round(pkg.price / pkg.hearts)}원)
                      </span>
                    </p>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {pkg.price.toLocaleString()}원
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Point usage */}
        {selected && (
          <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                포인트 사용
              </p>
              <p className="text-xs text-muted-foreground">
                보유 {pointBalance.toLocaleString()}P
              </p>
            </div>
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={maxUsablePoints}
                step={50}
                value={pointsToUse}
                onChange={(e) => setPointsToUse(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">0P</span>
                <span className="font-semibold text-primary">
                  {pointsToUse.toLocaleString()}P ({krwForPoints(pointsToUse).toLocaleString()}원 할인)
                </span>
                <span className="text-muted-foreground">
                  최대 {maxUsablePoints.toLocaleString()}P
                </span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              결제액의 최대 50%까지 포인트로 결제할 수 있어요.
              1P = {POINT_TO_KRW}원 환산.
            </p>
          </div>
        )}

        {/* 결제 안내 — 무엇을 구매하고 어떻게 충전·환불되는지 명시 (앱스토어 정책) */}
        <div className="p-4 rounded-2xl border border-border bg-muted/40 space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
          <p className="text-xs font-semibold text-foreground">결제 안내</p>
          <p>• 하트는 AI 드레스·메이크업 등 콘텐츠 생성에 사용하는 충전식 이용권이에요.</p>
          <p>• 결제 완료 시 즉시 하트가 충전되며, <b>1회성 결제</b>로 정기결제(자동결제)가 아니에요.</p>
          <p>• 콘텐츠 생성에 실패한 경우 사용한 하트는 자동 환불돼요.</p>
          <p>• 미사용 하트 환불은 전자상거래법 및 <button onClick={() => navigate("/terms")} className="underline">이용약관</button>의 청약철회 규정을 따라요.</p>
        </div>
      </main>

      {selected && (
        <div className="fixed bottom-0 left-0 right-0 app-col mx-auto p-4 bg-background border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">최종 결제 금액</p>
            <p className="text-lg font-bold text-foreground">
              {finalAmount.toLocaleString()}원
            </p>
          </div>
          <button
            onClick={handlePay}
            disabled={isSubmitting}
            className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
            카카오페이로 결제하기
          </button>
        </div>
      )}
    </div>
  );
};

export default HeartCharge;
