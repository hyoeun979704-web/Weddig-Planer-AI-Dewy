import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Check, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "daily_limit" | "pdf_feature" | "manual";
}

const triggerMessages: Record<string, string> = {
  daily_limit: "오늘의 무료 질문 3회를 모두 사용했어요",
  pdf_feature: "이 기능은 프리미엄에서 이용할 수 있어요",
  manual: "더 많은 기능을 만나보세요",
};

const benefits = [
  "AI 플래너 무제한 대화",
  "AI 견적서 자동생성 PDF",
  "예산 분석 리포트 PDF",
  "웨딩 당일 타임라인 PDF",
  "스태프 안내서 패키지",
  "하객 안내 메시지 템플릿",
];

const UpgradeModal = ({ isOpen, onClose, trigger = "manual" }: UpgradeModalProps) => {
  const { startTrial } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartTrial = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      navigate("/auth");
      onClose();
      return;
    }
    const ok = await startTrial();
    if (ok) {
      toast.success("🎉 무료 체험이 시작되었습니다!");
      onClose();
    } else {
      toast.error("체험 시작에 실패했습니다");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl pb-8">
        <SheetHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
          </div>
          <SheetTitle className="text-xl font-bold">프리미엄으로 업그레이드하세요</SheetTitle>
          <p className="text-sm text-muted-foreground mt-1">{triggerMessages[trigger]}</p>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {benefits.map((b) => (
            <div key={b} className="flex items-center gap-2.5 px-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground">{b}</span>
            </div>
          ))}
        </div>

        {/* Launch Event */}
        <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 text-center">
          <p className="text-sm font-bold text-foreground">🎉 런칭 이벤트: 첫 1개월 무료 체험!</p>
          <p className="text-xs text-muted-foreground mt-1">체험 종료 후 자동 결제 없음</p>
        </div>

        <button
          onClick={handleStartTrial}
          className="mt-4 w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold text-base"
        >
          무료 체험 시작하기
        </button>

        <p className="text-center text-xs text-muted-foreground mt-2">
          월 4,900원 / 연 39,000원 (34% 할인)
        </p>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2.5 text-sm text-muted-foreground"
        >
          다음에 할게요
        </button>
      </SheetContent>
    </Sheet>
  );
};

export default UpgradeModal;
