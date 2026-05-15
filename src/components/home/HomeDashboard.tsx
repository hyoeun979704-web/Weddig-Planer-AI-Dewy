import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useBudget } from "@/hooks/useBudget";

// Home dashboard surfaces planning state at a glance — D-day card,
// AI 플래너 + 일정 관리 buttons, and two mini progress chips (예산 진척 /
// 체크리스트). Replaces the dead-code D-day block that lived in
// TabHeroContent for ai-planner home.
const HomeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { weddingSettings, scheduleItems } = useWeddingSchedule();
  const { settings: budgetSettings, summary: budgetSummary } = useBudget();

  const dDay = (() => {
    if (!weddingSettings.wedding_date) return null;
    const target = new Date(weddingSettings.wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  })();

  // Schedule progress — completed / total of template-seeded items.
  const totalTasks = scheduleItems.length;
  const completedTasks = scheduleItems.filter((s) => s.completed).length;

  // Budget progress — spent / total, capped at 100.
  const totalBudget = budgetSettings?.total_budget ?? 0;
  const pct = totalBudget > 0
    ? Math.min(Math.round((budgetSummary.totalSpent / totalBudget) * 100), 999)
    : 0;

  return (
    <section className="px-4 pt-2 pb-4 bg-gradient-to-b from-[hsl(var(--pink-50))] to-background">
      {/* D-day card */}
      <button
        onClick={() => navigate(user ? "/schedule" : "/auth")}
        className="w-full flex items-center gap-3 p-3 bg-card rounded-2xl border border-border/60 active:scale-[0.98] transition-transform"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/12 flex items-center justify-center flex-shrink-0">
          {dDay !== null ? (
            <span className="text-sm font-extrabold text-primary leading-none">
              {dDay > 0 ? `D-${dDay}` : dDay === 0 ? "🎉" : `D+${Math.abs(dDay)}`}
            </span>
          ) : (
            <span className="text-base">📅</span>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          {dDay !== null ? (
            <>
              <p className="text-sm font-bold text-foreground truncate">
                {dDay > 0 ? `결혼식까지 ${dDay}일` : dDay === 0 ? "오늘이 결혼식이에요!" : `결혼식 후 ${Math.abs(dDay)}일`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {format(new Date(weddingSettings.wedding_date!), "yyyy.MM.dd (EEEE)", { locale: ko })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-foreground truncate">결혼식 일정을 등록해 주세요</p>
              <p className="text-[11px] text-muted-foreground">D-day와 체크리스트를 자동으로 생성해드려요</p>
            </>
          )}
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Two-up CTAs */}
      <div className="flex gap-2 mt-3">
        <Button
          onClick={() => navigate("/ai-planner")}
          className="flex-1 h-11 rounded-xl font-bold gap-1.5 text-[13px]"
        >
          <Sparkles className="w-4 h-4" />
          AI 플래너
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(user ? "/schedule" : "/auth")}
          className="flex-1 h-11 rounded-xl font-bold text-[13px] border-primary/30 text-primary hover:bg-primary/5"
        >
          📅 일정 관리
        </Button>
      </div>

      {/* Mini progress row */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => navigate(user ? "/budget" : "/auth")}
          className="flex-1 flex flex-col items-start gap-1 px-3 py-2.5 bg-card rounded-xl border border-border/60 active:scale-[0.98] transition-transform text-left"
        >
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <span>💰</span>
            <span>예산 진척</span>
          </div>
          <div className="flex items-baseline gap-1 w-full">
            <span className="text-sm font-extrabold text-foreground">
              {totalBudget > 0 ? `${pct}%` : "—"}
            </span>
            <span className="text-[10px] text-muted-foreground/80 truncate">
              {totalBudget > 0 ? `/ ${totalBudget.toLocaleString()}만` : "예산 설정 필요"}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 ml-auto flex-shrink-0" />
          </div>
        </button>

        <button
          onClick={() => navigate(user ? "/schedule" : "/auth")}
          className="flex-1 flex flex-col items-start gap-1 px-3 py-2.5 bg-card rounded-xl border border-border/60 active:scale-[0.98] transition-transform text-left"
        >
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <span>✅</span>
            <span>체크리스트</span>
          </div>
          <div className="flex items-baseline gap-1 w-full">
            <span className="text-sm font-extrabold text-foreground">
              {totalTasks > 0 ? completedTasks : "—"}
            </span>
            <span className="text-[10px] text-muted-foreground/80 truncate">
              {totalTasks > 0 ? `/ ${totalTasks}개` : "일정 미설정"}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/60 ml-auto flex-shrink-0" />
          </div>
        </button>
      </div>
    </section>
  );
};

export default HomeDashboard;
