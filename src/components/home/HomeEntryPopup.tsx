import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@/contexts/AuthContext";
import { useTutorialProgress } from "@/hooks/useTutorialProgress";

const STORAGE_KEY = "dewy.home_entry_popup_dismissed_until";

const tomorrowMidnightISO = (from: Date = new Date()) => {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
};

// 첫 진입 1회 모달. 비로그인 사용자에겐 신규 가입 혜택을, 로그인 사용자에겐
// 진행 중인 이벤트를 안내한다(가입자에게 "지금 가입하면" 카피는 거짓이 되므로
// 카피·CTA 를 분기). "오늘 하루 보지 않기"로 하루 단위 스킵 가능.
// shadcn Dialog 를 써서 ESC/focus trap/body scroll lock 자동 처리.
const HomeEntryPopup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const progress = useTutorialProgress();
  const homeTourDone = progress.isCompleted("home-tour");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 로그인 사용자는 홈 투어를 끝낸 뒤에만 노출 — 첫 방문에 튜토리얼 코치마크와
    // 동시에 뜨는 것을 막는다(스플래시 뒤에서 타이머가 겹치는 문제).
    if (user && !homeTourDone) return;
    try {
      const until = localStorage.getItem(STORAGE_KEY);
      if (until && new Date(until).getTime() > Date.now()) return;
    } catch {
      // localStorage 차단 환경 — fail open
    }
    const timer = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(timer);
  }, [user, homeTourDone]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setOpen(false);
  };

  const handleDismissForToday = () => {
    try {
      localStorage.setItem(STORAGE_KEY, tomorrowMidnightISO());
    } catch {
      // best effort
    }
    setOpen(false);
  };

  const handleCTA = () => {
    setOpen(false);
    navigate(user ? "/events" : "/auth");
  };

  const headline = user ? (
    <>진행 중인 이벤트를<br />확인해보세요</>
  ) : (
    <>지금 가입하면<br />Premium 1달 무료</>
  );
  const sub = user
    ? "출석·초대·후기로 받는 포인트와 하트 혜택을 모아뒀어요"
    : "AI 플래너 무제한 · 예산 분석 PDF\n결혼 스타일별 맞춤 가이드까지";
  const badge = user ? "이벤트" : "신규 가입 한정";
  const ctaLabel = user ? "이벤트 보러가기" : "지금 시작하기";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[330px] p-0 overflow-hidden rounded-3xl gap-0 border-0 shadow-2xl"
        // Radix가 기본 X 버튼을 자동 렌더 — 우리 영역과 시각 충돌 없도록 유지
      >
        <VisuallyHidden asChild>
          <DialogTitle>Premium 1달 무료 가입 안내</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden asChild>
          <DialogDescription>
            신규 가입 시 AI 플래너, 예산 분석 PDF, 맞춤 가이드 제공
          </DialogDescription>
        </VisuallyHidden>

        {/* Hero */}
        <div
          className="px-6 pt-10 pb-6 flex flex-col items-center"
          style={{
            background: "linear-gradient(135deg, #FFD4DC 0%, #F69BAA 60%, #E04562 110%)",
          }}
        >
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/85 text-[11px] font-bold text-primary">
            {badge}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-4 flex flex-col items-center text-center">
          <h2 className="text-xl font-extrabold text-foreground leading-snug">
            {headline}
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {sub}
          </p>
          <button
            onClick={handleCTA}
            className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] active:scale-[0.98] transition-transform"
          >
            {ctaLabel}
          </button>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between border-t border-border/60">
          <button
            onClick={handleDismissForToday}
            className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            오늘 하루 보지 않기
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-[12px] font-semibold text-muted-foreground"
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HomeEntryPopup;
