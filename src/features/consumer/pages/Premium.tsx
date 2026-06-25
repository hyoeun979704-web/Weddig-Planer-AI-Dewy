import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { Check, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const featureGroups = [
  {
    title: "AI 기능",
    items: [
      { icon: "", text: "AI 플래너 무제한 대화", free: "5회/일", premium: "무제한" },
      { icon: "", text: "AI 견적서 자동생성", free: "✕", premium: "PDF" },
      { icon: "", text: "예산 분석 리포트", free: "✕", premium: "PDF" },
    ],
  },
  {
    title: "웨딩 당일 준비",
    items: [
      { icon: "", text: "촬영 타임라인", free: "✕", premium: "PDF" },
      { icon: "", text: "본식 당일 타임라인", free: "✕", premium: "PDF" },
      { icon: "", text: "하객 안내 타임라인", free: "✕", premium: "PDF" },
    ],
  },
  {
    title: "스태프 안내서",
    items: [
      { icon: "", text: "가방순이 전달사항", free: "✕", premium: "PDF" },
      { icon: "", text: "축의대 전달사항", free: "✕", premium: "PDF" },
      { icon: "", text: "사회자 큐시트", free: "✕", premium: "PDF" },
      { icon: "", text: "부모님 안내서", free: "✕", premium: "PDF" },
      { icon: "", text: "하객 안내 메시지", free: "✕", premium: "템플릿" },
    ],
  },
];

const faqs = [
  { q: "무료 체험 후 자동 결제되나요?", a: "아니요. 체험 종료 후 직접 구독을 선택하셔야 합니다." },
  { q: "구독을 취소하면 어떻게 되나요?", a: "만료일까지 프리미엄을 이용하실 수 있고, 이후 무료로 전환됩니다." },
  { q: "플랜을 변경할 수 있나요?", a: "언제든 월간 ↔ 연간 변경이 가능합니다." },
];

const Premium = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan, isPremium, isTrialActive, trialDaysLeft, expiresAt, cancelSubscription, isLoading } = useSubscription();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  const handleStartTrial = () => {
    if (!user) { navigate("/auth"); return; }
    navigate("/premium/subscribe?type=trial");
  };

  const handleSubscribe = () => {
    if (!user) { navigate("/auth"); return; }
    navigate(`/premium/subscribe?type=${selectedPlan}`);
  };

  const handleCancel = async () => {
    const ok = await cancelSubscription();
    if (ok) toast.success("구독이 취소되었습니다. 만료일까지 이용 가능합니다.");
    else toast.error("구독 취소에 실패했습니다");
  };

  const expiresLabel = expiresAt
    ? `${expiresAt.getFullYear()}.${String(expiresAt.getMonth() + 1).padStart(2, "0")}.${String(expiresAt.getDate()).padStart(2, "0")}`
    : "";

  const trialExpired = plan !== "free" && !isPremium;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative flex flex-col">
      <Seo title="Dewy 프리미엄 — AI 무제한·결혼 준비 PDF 9종" description="AI 플래너 무제한 대화, 본식 타임라인·견적서 등 9종 PDF, 첫 1개월 무료 체험. 결혼 준비를 든든하게." path="/premium" />
      <PageHeader title="프리미엄" />

      <main className="flex-1 pb-20 overflow-y-auto">
        {/* Current Plan Card */}
        <div className="px-4 pt-6 pb-2">
          {isPremium ? (
            <div className="p-5 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl"></span>
                <p className="font-bold text-foreground">
                  현재 플랜: {isTrialActive ? "무료 체험" : plan === "yearly" ? "연간" : "월간"} 프리미엄
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {isTrialActive ? `체험 종료까지 ${trialDaysLeft}일 남았어요` : `만료일: ${expiresLabel}`}
              </p>
              <button
                onClick={() => navigate("/premium/content")}
                className="mt-3 w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
              >
                 프리미엄 콘텐츠 바로가기
              </button>
            </div>
          ) : (
            <div className="p-5 bg-muted rounded-2xl border border-border">
              <p className="font-bold text-foreground">현재 플랜: 무료</p>
              <p className="text-sm text-muted-foreground">AI 질문 5회/일</p>
              {trialExpired && (
                <p className="text-sm text-primary font-medium mt-2">체험이 종료되었어요. 구독을 시작해보세요!</p>
              )}
            </div>
          )}
        </div>

        {/* Launch Event */}
        {!isPremium && (
          <div className="px-4 py-3">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/30 text-center">
              <p className="text-lg font-bold text-foreground"> 초기 이용자 특전</p>
              <p className="text-sm text-foreground mt-1">첫 1개월 무료 체험 + 구독 시 AI 스튜디오 하트 보너스</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <span> 월간 10 / 연간 180 (6개월치 보너스)</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">2026년 7월까지 월간·연간 구독 시 한정 · 체험 종료 후 자동 결제 없음</p>
              <button onClick={handleStartTrial} className="mt-3 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm">
                무료 체험 시작하기
              </button>
            </div>
          </div>
        )}

        {/* Plan Selection */}
        {(!isPremium || trialExpired) && (
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Monthly */}
              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`p-4 rounded-2xl border-2 text-left transition-colors relative ${
                  selectedPlan === "monthly" ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                  50% 할인
                </div>
                <p className="font-bold text-foreground text-sm">월간</p>
                <p className="text-[11px] text-muted-foreground line-through mt-1">9,900원</p>
                <p className="text-lg font-bold text-foreground">4,900원</p>
                <p className="text-xs text-muted-foreground">/월</p>
              </button>
              {/* Yearly */}
              <button
                onClick={() => setSelectedPlan("yearly")}
                className={`p-4 rounded-2xl border-2 text-left transition-colors relative ${
                  selectedPlan === "yearly" ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                  추천
                </div>
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                  67% 할인
                </div>
                <p className="font-bold text-foreground text-sm">연간</p>
                <p className="text-[11px] text-muted-foreground line-through mt-1">118,800원</p>
                <p className="text-lg font-bold text-foreground">39,000원</p>
                <p className="text-xs text-muted-foreground">/년 · 월 3,250원</p>
              </button>
            </div>
            <button onClick={handleSubscribe} className="w-full mt-3 py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold text-sm">
              구독하기
            </button>
          </div>
        )}

        {/* Feature Comparison */}
        <div className="px-4 py-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-bold text-foreground">프리미엄 혜택 상세</h3>
            <p className="text-[11px] text-muted-foreground">9개의 PDF · 1개의 메시지 템플릿</p>
          </div>

          {/* Column header */}
          <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-xl bg-muted/60">
            <span className="w-5" aria-hidden />
            <span className="flex-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">기능</span>
            <span className="w-14 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">무료</span>
            <span className="w-14 text-center text-[11px] font-semibold text-primary uppercase tracking-wide"> Premium</span>
          </div>

          {featureGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wide">{group.title}</p>
              <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                {group.items.map((item, i) => {
                  const freeUnavailable = item.free === "✕";
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                      {item.icon && <span className="text-lg w-5 text-center" aria-hidden>{item.icon}</span>}
                      <span className="flex-1 text-sm text-foreground leading-snug">{item.text}</span>
                      <span className={`w-14 text-center text-[11px] ${freeUnavailable ? "text-muted-foreground/60" : "text-muted-foreground font-medium"}`}>
                        {item.free}
                      </span>
                      <span className="w-14 text-center">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary">
                          {item.premium}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground text-center mt-2 leading-relaxed">
            모든 PDF는 입력값 기반의 정적 템플릿이며,<br />
            AI API 호출 없이 즉시 다운로드됩니다.
          </p>
        </div>

        {/* FAQ */}
        <div className="px-4 py-2">
          <h3 className="font-bold text-foreground mb-3">자주 묻는 질문</h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left bg-card border border-border rounded-2xl p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{faq.q}</p>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
                {openFaq === i && <p className="text-sm text-muted-foreground mt-2">{faq.a}</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Cancel */}
        {isPremium && !isTrialActive && (
          <div className="px-4 py-4 text-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="text-sm text-muted-foreground underline">구독 취소</button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[360px]">
                <AlertDialogHeader>
                  <AlertDialogTitle>구독을 취소하시겠어요?</AlertDialogTitle>
                  <AlertDialogDescription>만료일까지 프리미엄을 이용하실 수 있고, 이후 무료로 전환됩니다.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>유지하기</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">취소하기</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </main>

      <BottomNav activeTab="/premium" onTabChange={(h) => navigate(h)} />
    </div>
  );
};

export default Premium;
