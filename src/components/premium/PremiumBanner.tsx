import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Sparkles } from "lucide-react";

const PremiumBanner = () => {
  const navigate = useNavigate();
  const { plan, isPremium, isTrialActive, trialDaysLeft, expiresAt } = useSubscription();

  if (isPremium && isTrialActive) {
    return (
      <div className="px-4 py-2">
        <button
          onClick={() => navigate("/premium")}
          className="w-full p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20 flex items-center gap-3"
        >
          <span className="text-2xl">🎉</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">무료 체험 중</p>
            <p className="text-xs text-muted-foreground">체험 종료까지 {trialDaysLeft}일 남았어요</p>
          </div>
          <span className="text-xs font-medium text-primary">구독 관리</span>
        </button>
      </div>
    );
  }

  if (isPremium) {
    const planLabel = plan === "yearly" ? "연간" : "월간";
    const expiresLabel = expiresAt
      ? `${expiresAt.getFullYear()}.${String(expiresAt.getMonth() + 1).padStart(2, "0")}.${String(expiresAt.getDate()).padStart(2, "0")} 만료`
      : "";
    return (
      <div className="px-4 py-2">
        <button
          onClick={() => navigate("/premium")}
          className="w-full p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20 flex items-center gap-3"
        >
          <span className="text-2xl">💎</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">Premium 이용 중</p>
            <p className="text-xs text-muted-foreground">{planLabel} 플랜 · {expiresLabel}</p>
          </div>
          <span className="text-xs font-medium text-primary">관리</span>
        </button>
      </div>
    );
  }

  // Free user
  return (
    <div className="px-4 py-2">
      <button
        onClick={() => navigate("/premium")}
        className="w-full p-4 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20 flex items-center gap-3"
      >
        <Sparkles className="w-6 h-6 text-primary flex-shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-foreground">프리미엄으로 업그레이드</p>
          <p className="text-xs text-muted-foreground">AI 무제한 + PDF 리포트를 만나보세요</p>
        </div>
        <span className="text-xs font-medium text-primary">자세히 보기</span>
      </button>
    </div>
  );
};

export default PremiumBanner;
