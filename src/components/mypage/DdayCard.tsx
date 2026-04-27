import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";

interface DdayCardProps {
  weddingDate: string | null;
  /** When true, the user explicitly checked 미정 during onboarding —
   *  wedding_date is null but they DO have a seeded checklist anchored
   *  to a virtual D-day. Show different copy than "no info at all". */
  weddingDateTbd?: boolean;
}

const DdayCard = ({ weddingDate, weddingDateTbd = false }: DdayCardProps) => {
  const navigate = useNavigate();
  const [setupOpen, setSetupOpen] = useState(false);

  const daysUntilWedding = () => {
    if (!weddingDate) return null;
    const wedding = new Date(weddingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const days = daysUntilWedding();

  if (!weddingDate) {
    // Explicit "미정" — user has onboarded; nudge them to set the real
    // date so the recommended timeline becomes actionable.
    if (weddingDateTbd) {
      return (
        <div className="px-4 py-2">
          <button
            onClick={() => setSetupOpen(true)}
            className="w-full p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-amber-900">예정일 미정 · 1년 후 기준</p>
              <p className="text-xs text-amber-700 mt-0.5">날짜가 정해지면 일정이 자동으로 맞춰져요</p>
            </div>
            <span className="text-xs font-medium text-amber-700">날짜 입력</span>
          </button>
          <WeddingInfoSetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
        </div>
      );
    }
    // First-time visitor — encourage onboarding.
    return (
      <div className="px-4 py-2">
        <button
          onClick={() => setSetupOpen(true)}
          className="w-full p-4 bg-muted/50 rounded-2xl border border-dashed border-border flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">결혼식 날짜를 설정해보세요</p>
            <p className="text-xs text-muted-foreground mt-0.5">D-Day와 맞춤 일정이 준비됩니다</p>
          </div>
          <span className="text-xs font-medium text-primary">설정하기</span>
        </button>
        <WeddingInfoSetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
      </div>
    );
  }

  const formattedDate = format(new Date(weddingDate), "yyyy.MM.dd (EEEE)", { locale: ko });
  const isToday = days === 0;
  const isPast = days !== null && days < 0;

  return (
    <div className="px-4 py-2">
      <button
        onClick={() => navigate("/my-schedule")}
        className="w-full p-4 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent rounded-2xl border border-primary/20 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isToday && <Sparkles className="w-6 h-6 text-primary animate-pulse" />}
            <div className="text-left">
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
              <p className="text-2xl font-extrabold text-primary mt-0.5">
                {isToday ? "🎉 D-Day!" : isPast ? `D+${Math.abs(days!)}` : `D-${days}`}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-primary">일정 관리 →</span>
          </div>
        </div>
      </button>
    </div>
  );
};

export default DdayCard;
