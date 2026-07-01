import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Heart, Sparkles } from "lucide-react";
import { usePlanningRewards } from "@/hooks/usePlanningRewards";
import { PLANNING_MILESTONE_AMOUNT } from "@/lib/planningRewards";
import { cn } from "@/lib/utils";

/**
 * 준비 진행 리워드 카드 — 준비 마일스톤(예산·식장·첫견적·체크리스트)을 1회 하트로 보상.
 * 서버(check_planning_milestones)가 검증·멱등 지급하고, 여기선 진행/보상 상태와 다음
 * 할 일 넛지만 표시(스펜드 아닌 행동 보상 → 유인·리텐션).
 */
const PlanningRewardsCard = () => {
  const navigate = useNavigate();
  const { summary, isLoading } = usePlanningRewards();

  if (isLoading) return null;

  return (
    <div className="w-full p-4 bg-card border border-border rounded-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="font-bold text-foreground text-sm">준비하고 하트 받기</p>
        <span className="ml-auto text-xs text-muted-foreground">
          {summary.rewardedCount}/{summary.totalCount}
          {summary.earnedHearts > 0 && ` · ${summary.earnedHearts}하트 받음`}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        각 단계 완료 시 {PLANNING_MILESTONE_AMOUNT}하트 · 자동 적립돼요
      </p>

      <div className="space-y-1.5">
        {summary.items.map((m) => {
          const isNext = !m.done && summary.nextPending?.key === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => navigate(m.href)}
              disabled={m.done}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                m.done ? "bg-muted/50" : isNext ? "bg-primary/5 border border-primary/20" : "bg-background border border-border",
              )}
            >
              <span
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                  m.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {m.done ? <Check className="w-3.5 h-3.5" /> : <Heart className="w-3 h-3" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[13px] font-semibold", m.done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {m.label}
                </p>
                {!m.done && <p className="text-[11px] text-muted-foreground">{m.desc}</p>}
              </div>
              {m.done ? (
                <span className="text-[11px] text-primary font-medium shrink-0">
                  {m.rewarded ? `+${PLANNING_MILESTONE_AMOUNT}하트` : "지급 중"}
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[11px] text-primary font-semibold shrink-0">
                  +{PLANNING_MILESTONE_AMOUNT}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {summary.allDone && (
        <p className="text-[12px] text-primary font-medium text-center mt-3">
          준비 단계 보상을 모두 받았어요! 🎉
        </p>
      )}
    </div>
  );
};

export default PlanningRewardsCard;
