import { useState } from "react";
import { Check, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SavableBudgetPlan, SavableTimelinePlan } from "@/lib/chatbot/handlers/quickQuestionHandlers";

/**
 * Renders below an assistant message that produced a savable plan and gives
 * the user a single tap to apply it to their real budget_settings /
 * user_schedule_items. Preview shows every line that would be written so the
 * user can opt out before anything persists — per product requirement
 * "확인 후 저장" (vs. silent auto-save).
 */

interface BaseProps {
  /** Closes the card after a successful save. Card reopens on next session. */
  onSaved: () => void;
}

interface BudgetProps extends BaseProps {
  kind: "budget";
  plan: SavableBudgetPlan;
  onApply: (plan: SavableBudgetPlan) => Promise<void>;
}

interface TimelineProps extends BaseProps {
  kind: "timeline";
  plan: SavableTimelinePlan;
  /** YYYY-MM-DD. Required to anchor schedule items; if unset, the card
   *  surfaces a hint and disables the save button instead of guessing. */
  weddingDate: string | null;
  onApply: (plan: SavableTimelinePlan, weddingDate: string) => Promise<void>;
}

type Props = BudgetProps | TimelineProps;

const fmt = (n: number) => n.toLocaleString();

const AIPlanApplyCard = (props: Props) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      if (props.kind === "budget") {
        await props.onApply(props.plan);
      } else {
        if (!props.weddingDate) return;
        await props.onApply(props.plan, props.weddingDate);
      }
      setSaved(true);
      // Brief celebration before collapsing — gives the user visual
      // confirmation the action landed before the card auto-closes.
      setTimeout(() => props.onSaved(), 1200);
    } finally {
      setSaving(false);
    }
  };

  if (props.kind === "budget") {
    const { plan } = props;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-11 mt-2 bg-gradient-to-br from-primary/5 to-accent/30 border border-primary/20 rounded-2xl p-3.5"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-xs font-semibold text-foreground">이 분배안을 내 예산으로 저장할까요?</p>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2 hover:text-foreground"
        >
          저장될 내용 {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {expanded && (
          <div className="space-y-1 mb-3 text-[11px] text-foreground/80 max-h-40 overflow-y-auto pr-1">
            <div className="flex justify-between font-medium">
              <span>총 예산</span>
              <span>{fmt(plan.totalBudget)}만원</span>
            </div>
            {plan.allocations.map((a) => (
              <div key={a.category} className="flex justify-between">
                <span>{a.label}{a.isPriority ? " ⭐" : ""}</span>
                <span className="tabular-nums">{fmt(a.amount)}만원</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={cn(
            "w-full py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]",
            saved
              ? "bg-green-100 text-green-700"
              : "bg-primary text-primary-foreground disabled:opacity-60"
          )}
        >
          {saved ? (
            <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 예산에 반영되었어요</span>
          ) : saving ? (
            <span className="inline-flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 저장 중…</span>
          ) : (
            "내 예산에 저장하기"
          )}
        </button>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          기존 카테고리별 금액은 새 분배로 덮어쓰여요. 항목별 지출 기록은 유지됩니다.
        </p>
      </motion.div>
    );
  }

  // Timeline
  const { plan, weddingDate } = props;
  const dateUnset = !weddingDate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="ml-11 mt-2 bg-gradient-to-br from-primary/5 to-accent/30 border border-primary/20 rounded-2xl p-3.5"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">이 타임라인을 내 일정에 추가할까요?</p>
      </div>

      {dateUnset ? (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-2">
          결혼식 날짜를 먼저 등록해주세요. 일정은 결혼식 당일에 저장돼요.
        </p>
      ) : (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2 hover:text-foreground"
        >
          저장될 일정 {plan.events.length}개 {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}

      {expanded && !dateUnset && (
        <div className="space-y-1 mb-3 text-[11px] text-foreground/80 max-h-40 overflow-y-auto pr-1">
          {plan.events.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="font-medium min-w-[44px]">{e.time}</span>
              <span className={cn(e.emphasis && "font-semibold")}>{e.title}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || saved || dateUnset}
        className={cn(
          "w-full py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]",
          saved
            ? "bg-green-100 text-green-700"
            : "bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {saved ? (
          <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 일정에 추가되었어요</span>
        ) : saving ? (
          <span className="inline-flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> 저장 중…</span>
        ) : (
          "내 일정에 저장하기"
        )}
      </button>
    </motion.div>
  );
};

export default AIPlanApplyCard;
