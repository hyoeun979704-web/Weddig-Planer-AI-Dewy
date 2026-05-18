import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "dewy.home_entry_popup_dismissed_until";

const tomorrowMidnightISO = (from: Date = new Date()) => {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
};

// 첫 진입 1회 모달 — 신규 가입 1달 프리미엄 무료. 비로그인 사용자만
// 노출(이미 가입한 사용자에게 "지금 가입하면" 카피가 거짓이 되기 때문).
// shadcn Dialog 를 써서 ESC/focus trap/body scroll lock 자동 처리.
const HomeEntryPopup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) return; // 가입자는 노출 X
    try {
      const until = localStorage.getItem(STORAGE_KEY);
      if (until && new Date(until).getTime() > Date.now()) return;
    } catch {
      // localStorage 차단 환경 — fail open
    }
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, [user]);

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
    navigate("/auth");
  };

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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/85 text-caption font-bold text-primary">
            신규 가입 한정
          </span>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-4 flex flex-col items-center text-center">
          <h2 className="text-xl font-extrabold text-foreground leading-snug">
            지금 가입하면<br />Premium 1달 무료
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
            AI 플래너 무제한 · 예산 분석 PDF<br />결혼 스타일별 맞춤 가이드까지
          </p>
          <button
            onClick={handleCTA}
            className="mt-5 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-[15px] active:scale-[0.98] transition-transform"
          >
            지금 시작하기
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
