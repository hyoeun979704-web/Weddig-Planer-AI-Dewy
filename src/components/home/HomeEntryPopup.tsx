import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "dewy.home_entry_popup_dismissed_until";

// Returns the ISO date string at the next 00:00 KST after `from`.
const tomorrowMidnightISO = (from: Date = new Date()) => {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return next.toISOString();
};

// Shown once per session entry to surface the strongest current promotion
// (신규 가입 1달 프리미엄 무료). "오늘 하루 보지 않기" defers re-display
// until next midnight via localStorage; close just clears the in-memory
// flag so it appears again next session. Logged-in users see it max once
// per day; logged-out users see it once per session to nudge signup.
const HomeEntryPopup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Logged-in premium-already users could be skipped here once we expose
    // subscription state from a top-level context. For now, gate on
    // localStorage dismiss-until.
    try {
      const until = localStorage.getItem(STORAGE_KEY);
      if (until && new Date(until).getTime() > Date.now()) return;
    } catch {
      // localStorage unavailable (SSR / privacy mode) — fail open.
    }
    // Brief delay so the popup doesn't fight the initial page paint.
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, []);

  if (!open) return null;

  const handleClose = () => setOpen(false);

  const handleDismissForToday = () => {
    try {
      localStorage.setItem(STORAGE_KEY, tomorrowMidnightISO());
    } catch {
      // Best effort — if storage is blocked the popup will reappear on
      // next visit, which is acceptable.
    }
    setOpen(false);
  };

  const handleCTA = () => {
    setOpen(false);
    navigate(user ? "/premium" : "/auth");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-entry-popup-title"
      className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-black/45 backdrop-blur-[2px] animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[330px] bg-card rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground/70 active:scale-95 transition-transform"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero */}
        <div
          className="px-6 pt-10 pb-6 flex flex-col items-center"
          style={{
            background: "linear-gradient(135deg, #FFD4DC 0%, #F69BAA 60%, #E04562 110%)",
          }}
        >
          <div className="text-[56px] leading-none mb-3" aria-hidden>🎁</div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/85 text-[11px] font-bold text-primary">
            신규 가입 한정
          </span>
        </div>

        {/* Body */}
        <div className="px-6 pt-5 pb-4 flex flex-col items-center text-center">
          <h2 id="home-entry-popup-title" className="text-xl font-extrabold text-foreground leading-snug">
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
            onClick={handleClose}
            className="text-[12px] font-semibold text-muted-foreground"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeEntryPopup;
