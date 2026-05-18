import { useState, useEffect, useMemo } from "react";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { useNavigate, useLocation } from "react-router-dom";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import BottomNav from "@/components/BottomNav";
import { Plus, MapPin, AlertTriangle, ChevronRight, Trash2, Sparkles, Download, Bell, Check, Share2, Users, CalendarClock, Sparkle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBudget } from "@/hooks/useBudget";
import { useAuth } from "@/contexts/AuthContext";
import {
  categories, categoryKeys, regions, paidByOptions, paymentStageOptions,
  scheduleCategoryToBudget, resolveRegionKey,
  FULL_MAPPED_SCHEDULE_CATEGORIES, PARTIAL_MAPPED_SCHEDULE_CATEGORIES,
  type BudgetCategory,
} from "@/data/budgetData";
import BudgetSetupSheet from "@/components/budget/BudgetSetupSheet";
import BudgetAddSheet from "@/components/budget/BudgetAddSheet";
import PayBalanceSheet from "@/components/budget/PayBalanceSheet";
import PartnerLinkCard from "@/components/partner/PartnerLinkCard";
import BudgetReportSheet from "@/components/premium/BudgetReportSheet";
import UpgradeModal from "@/components/premium/UpgradeModal";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";
import { useWeddingInfoPrompt } from "@/hooks/useWeddingInfoPrompt";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { format, startOfMonth, subMonths, isSameMonth } from "date-fns";
import { parseLocalDate, daysUntilWedding } from "@/lib/schedule";
import { toast } from "@/hooks/use-toast";
import type { BudgetItem } from "@/hooks/useBudget";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { WEDDING_STYLE_PRESETS, WEDDING_STYLE_LABEL, visibleBudgetCategories } from "@/lib/weddingStyle";
import { fmt } from "@/lib/budgetFormat";

/** SVG donut chart for budget usage */
const DonutChart = ({ pct, size = 80, strokeWidth = 8 }: { pct: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  const color = pct >= 90 ? "hsl(var(--destructive))" : pct >= 70 ? "#F59E0B" : "#10B981";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
};

const Budget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { defaultRegion } = useDefaultRegion();
  const profileRegionKey = resolveRegionKey(defaultRegion);
  const { settings, items, summary, regionalAverage, isLoading, saveSettings, addItem, updateItem, deleteItem } = useBudget(profileRegionKey);
  const { weddingSettings, scheduleItems } = useWeddingSchedule();
  // Sheets get the filtered list; main page itself iterates all 10 with
  // dimming for hidden ones (visible without forcing edits).
  const visibleSheetCategories = visibleBudgetCategories(weddingSettings.excluded_categories || []) as BudgetCategory[];

  const [setupOpen, setSetupOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetItem | null>(null);
  const [payBalanceTarget, setPayBalanceTarget] = useState<BudgetItem | null>(null);
  const [addPrefill, setAddPrefill] = useState<{ title: string; category: BudgetCategory } | null>(null);
  const tutorial = usePageTutorial("budget");
  const { isPremium } = useSubscription();
  const weddingInfoPrompt = useWeddingInfoPrompt();

  useEffect(() => {
    if (!isLoading && user && !settings) {
      setSetupOpen(true);
    }
  }, [isLoading, user, settings]);

  const showLoginOverlay = !user;

  const totalBudget = settings?.total_budget || 0;
  const pct = totalBudget > 0 ? Math.min((summary.totalSpent / totalBudget) * 100, 100) : 0;
  const catBudgets = settings?.category_budgets || {} as Record<BudgetCategory, number>;

  // Paid-by
  const paidShared = summary.paidByTotals["shared"] || 0;
  const paidGroom = summary.paidByTotals["groom"] || 0;
  const paidBride = summary.paidByTotals["bride"] || 0;
  const paidTotal = paidShared + paidGroom + paidBride;

  // Upcoming balances (overdue items appear first).
  // Uses daysUntilWedding (which parses YYYY-MM-DD as local midnight) so the
  // D-day count matches the user's local calendar, not UTC.
  const upcomingBalances = items
    .filter(i => i.has_balance && i.balance_amount && i.balance_amount > 0 && i.balance_due_date)
    .map(i => ({ ...i, daysLeft: daysUntilWedding(i.balance_due_date) ?? 0 }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const recentItems = items.slice(0, 10);

  // Monthly trend — last 6 months including current. Memoized on items so
  // we don't rebuild the 6-bucket array on every unrelated render.
  const monthlyTrend = useMemo(() => {
    const today = new Date();
    const buckets: { monthDate: Date; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(today, i));
      buckets.push({ monthDate, label: format(monthDate, "M월"), total: 0 });
    }
    for (const item of items) {
      const d = parseLocalDate(item.item_date);
      const bucket = buckets.find(b => isSameMonth(b.monthDate, d));
      if (bucket) bucket.total += item.amount;
    }
    return buckets;
  }, [items]);
  const trendMax = Math.max(...monthlyTrend.map(b => b.total), 1);
  const trendActiveCount = monthlyTrend.filter(b => b.total > 0).length;

  /**
   * Schedule tasks that map to a budget category, are still open, due within
   * 30 days (or already overdue), and not in the user's excluded list. These
   * surface as "next payments" so the user can record them in budget without
   * retyping. Schedule items the user already turned off via the style picker
   * shouldn't nag them here.
   */
  const excludedSet = useMemo(
    () => new Set(weddingSettings.excluded_categories || []),
    [weddingSettings.excluded_categories]
  );
  const upcomingExpenseTasks = useMemo(() =>
    scheduleItems
      .filter(t => !t.completed && !excludedSet.has(t.category || ""))
      .map(t => ({ task: t, budgetCat: scheduleCategoryToBudget(t.category) }))
      .filter((x): x is { task: typeof scheduleItems[number]; budgetCat: BudgetCategory } => x.budgetCat !== null)
      .map(x => ({
        ...x,
        daysLeft: daysUntilWedding(x.task.scheduled_date) ?? 0,
      }))
      .filter(x => x.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 4),
    [scheduleItems, excludedSet]
  );

  const planningStageGuide: Record<string, { icon: string; text: string }> = {
    just_started: { icon: "", text: "이제 시작했다면 총 예산부터 잡아보세요" },
    researching: { icon: "", text: "지역 평균과 비교하며 카테고리별로 배분해보세요" },
    contracting: { icon: "", text: "계약금/잔금 일정을 빠짐없이 기록해두세요" },
    wrapping_up: { icon: "", text: "결제 완료 표시로 마무리하고 최종 합계를 확인해보세요" },
  };
  const stageGuide = weddingSettings.planning_stage
    ? planningStageGuide[weddingSettings.planning_stage]
    : null;

  /**
   * Budget categories the user has implicitly opted out of via excluded
   * full-mapped schedule categories. Partial-mapped ones (hanbok,
   * invitation_venue) are handled separately because they only cover part
   * of their target budget row.
   */
  const dimmedBudgetCategories = useMemo(() => {
    const groupedByBudget: Partial<Record<BudgetCategory, string[]>> = {};
    for (const scheduleCat of FULL_MAPPED_SCHEDULE_CATEGORIES) {
      const bc = scheduleCategoryToBudget(scheduleCat);
      if (!bc) continue;
      (groupedByBudget[bc] ||= []).push(scheduleCat);
    }
    const dim = new Set<BudgetCategory>();
    for (const [bc, scheduleCats] of Object.entries(groupedByBudget) as [BudgetCategory, string[]][]) {
      if (scheduleCats.length > 0 && scheduleCats.every(c => excludedSet.has(c))) {
        dim.add(bc);
      }
    }
    return dim;
  }, [excludedSet]);

  /**
   * Budget categories partially affected by excluded schedule categories
   * (e.g. hanbok excluded but rings + 예단 still buyable). We surface a
   * small "X 제외" label rather than dimming the whole row.
   */
  const partialExclusionLabels = useMemo<Partial<Record<BudgetCategory, string>>>(() => {
    const out: Partial<Record<BudgetCategory, string>> = {};
    for (const cat of PARTIAL_MAPPED_SCHEDULE_CATEGORIES) {
      if (!excludedSet.has(cat)) continue;
      const bc = scheduleCategoryToBudget(cat);
      if (!bc) continue;
      const label = cat === "hanbok" ? "한복 제외" : "청첩장 제외";
      out[bc] = out[bc] ? `${out[bc]} · ${label}` : label;
    }
    return out;
  }, [excludedSet]);

  const openAddWithPrefill = (title: string, category: BudgetCategory) => {
    setEditItem(null);
    setAddPrefill({ title, category });
    setAddOpen(true);
  };

  // D-day pace — local-midnight parsing so the count matches the user's
  // wall calendar even in negative-UTC timezones.
  const daysToWedding = daysUntilWedding(weddingSettings?.wedding_date);
  const remainingBudget = summary.remaining;
  const dailyPace = daysToWedding !== null && daysToWedding > 0 && remainingBudget > 0
    ? Math.round(remainingBudget / daysToWedding)
    : null;

  /**
   * Builds a plain-text summary and shares via Web Share API; falls back to
   * clipboard copy when share is unavailable (most desktop browsers).
   */
  const handleShare = async () => {
    const lines: string[] = [];
    lines.push(` 우리 결혼 예산 현황${settings?.region ? ` (${regions[settings.region]?.label})` : ""}`);
    lines.push(`총 예산: ${fmt(totalBudget)}만원`);
    lines.push(`사용: ${fmt(summary.totalSpent)}만원 (${Math.round(pct)}%)`);
    lines.push(`남은 예산: ${fmt(summary.remaining)}만원`);
    if (daysToWedding !== null && daysToWedding >= 0) {
      lines.push(`결혼식까지: D-${daysToWedding}일`);
    }
    lines.push("");
    lines.push("[카테고리별 사용]");
    for (const key of categoryKeys) {
      const spent = summary.categoryTotals[key] || 0;
      const budget = catBudgets[key] || 0;
      if (spent === 0 && budget === 0) continue;
      lines.push(`${categories[key].emoji} ${categories[key].label}: ${fmt(spent)}/${fmt(budget)}만원`);
    }
    const text = lines.join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "우리 결혼 예산", text });
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "요약을 복사했어요. 카톡 등에 붙여넣기 하세요." });
    } catch {
      toast({ title: "공유에 실패했어요", variant: "destructive" });
    }
  };

  /**
   * Marks a balance as paid: creates a new "잔금" expense item dated to the
   * user's chosen pay date, THEN clears has_balance on the original item.
   *
   * Two-step transaction safety: we await each step and roll back the new
   * "잔금" item if the original update fails — otherwise the user would see
   * the payment recorded twice (the new item + a still-pending balance card).
   */
  const handleMarkBalancePaid = async (
    item: BudgetItem,
    payload: { payDate: string; paymentMethod: string; memo: string | null }
  ) => {
    if (!item.balance_amount) return;
    setPayBalanceTarget(null);

    let createdItemId: string | null = null;
    try {
      const created = await addItem.mutateAsync({
        category: item.category,
        title: `${item.title} 잔금`,
        amount: item.balance_amount,
        paid_by: item.paid_by,
        payment_stage: "balance",
        payment_method: payload.paymentMethod,
        item_date: payload.payDate,
        memo: payload.memo,
        has_balance: false,
        balance_amount: null,
        balance_due_date: null,
      });
      createdItemId = (created as { id?: string } | undefined)?.id ?? null;

      await updateItem.mutateAsync({
        id: item.id,
        has_balance: false,
        balance_amount: null,
        balance_due_date: null,
      } as any);
      toast({ title: "잔금 결제가 기록되었습니다" });
    } catch (err) {
      console.error("Balance payment failed:", err);
      if (createdItemId) {
        // Compensate: roll back the new 잔금 item so the user doesn't see
        // a double-recorded payment with a still-pending balance card.
        try { await deleteItem.mutateAsync(createdItemId); } catch { /* best effort */ }
      }
      toast({ title: "잔금 결제 기록에 실패했어요", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {showLoginOverlay && <LoginRequiredOverlay message="지역별 평균 비교, 양가 분담 현황까지 체계적으로 관리하세요" features={["지역별 평균 비교", "양가 분담 관리", "잔금 알림"]} />}
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
              <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
            </button>
            <h1 className="text-lg font-bold text-foreground">예산</h1>
          </div>
          <div className="flex items-center gap-2">
            {totalBudget > 0 && (
              <button
                onClick={handleShare}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
                aria-label="예산 요약 공유"
              >
                <Share2 className="w-4 h-4 text-foreground" />
              </button>
            )}
            <button
              data-tutorial="budget-settings"
              onClick={() => setSetupOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium active:scale-95 transition-transform"
            >
              예산 설정
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 pb-36 space-y-4">
        {/* Summary Card with Donut */}
        <div data-tutorial="budget-summary" className="rounded-2xl bg-card border border-border p-5">
          {totalBudget > 0 ? (
            <>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <DonutChart pct={pct} size={80} strokeWidth={7} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-lg font-black tabular-nums",
                      pct >= 90 ? "text-destructive" : pct >= 70 ? "text-yellow-500" : "text-emerald-500"
                    )}>{Math.round(pct)}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg font-bold text-foreground tabular-nums">{fmt(totalBudget)}만원</span>
                    {settings?.region && (
                      <span className="text-caption bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {regions[settings.region]?.label}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div>
                      <p className="text-caption text-muted-foreground">사용</p>
                      <p className="text-sm font-bold text-foreground tabular-nums">{fmt(summary.totalSpent)}만원</p>
                    </div>
                    <div>
                      <p className="text-caption text-muted-foreground">남은 예산</p>
                      <p className={cn(
                        "text-sm font-bold tabular-nums",
                        summary.remaining < 0 ? "text-destructive" : "text-foreground"
                      )}>{fmt(summary.remaining)}만원</p>
                    </div>
                  </div>
                </div>
              </div>
              {daysToWedding !== null && daysToWedding >= 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-caption">
                  <span className="text-muted-foreground">결혼식까지 <span className="font-bold text-foreground">D-{daysToWedding}일</span></span>
                  {dailyPace !== null ? (
                    <span className="text-muted-foreground">
                      남은 예산 페이스 <span className="font-bold text-foreground tabular-nums">{fmt(dailyPace)}만원/일</span>
                    </span>
                  ) : summary.remaining < 0 ? (
                    <span className="text-destructive font-medium">예산 초과 상태</span>
                  ) : null}
                </div>
              )}
              {/* Mini category bar */}
              <div className="mt-4 flex h-2 rounded-full overflow-hidden bg-muted">
                {categoryKeys.map(key => {
                  const spent = summary.categoryTotals[key] || 0;
                  if (spent <= 0 || summary.totalSpent <= 0) return null;
                  return (
                    <div key={key} className="h-full transition-all"
                      style={{ width: `${(spent / summary.totalSpent) * 100}%`, backgroundColor: categories[key].color }} />
                  );
                })}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {categoryKeys.map(key => {
                  const spent = summary.categoryTotals[key] || 0;
                  if (spent <= 0) return null;
                  return (
                    <span key={key} className="text-caption text-muted-foreground flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categories[key].color }} />
                      {categories[key].label}
                    </span>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-foreground font-semibold mb-1">예산을 설정해주세요</p>
              <p className="text-xs text-muted-foreground mb-3">지역 평균과 비교하며 체계적으로 관리할 수 있어요</p>
              <button onClick={() => setSetupOpen(true)} className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-bold">
                예산 설정하기
              </button>
            </div>
          )}
        </div>

        {/* Planning stage guide */}
        {stageGuide && totalBudget > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 flex items-center gap-2">
            <span className="text-base">{stageGuide.icon}</span>
            <p className="text-xs text-foreground flex-1">{stageGuide.text}</p>
          </div>
        )}

        {/* Wedding info gap — surface when budget is set but the user hasn't
            filled in their wedding date/region/stage yet. Tapping opens the
            shared onboarding modal so the two pages stay in sync. */}
        {totalBudget > 0 && !weddingSettings.wedding_date && !weddingSettings.wedding_date_tbd && (
          <button
            onClick={() => weddingInfoPrompt.openManually()}
            className="w-full rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2.5 flex items-center gap-2 text-left active:scale-[0.99] transition-transform"
          >
            <CalendarClock className="w-4 h-4 text-yellow-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-yellow-900">결혼식 날짜를 알려주세요</p>
              <p className="text-caption text-yellow-800">D-day 페이스와 다가오는 일정이 함께 표시돼요</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-yellow-700 shrink-0" />
          </button>
        )}

        {/* Wedding style banner — small/self get specific budget tips.
            Click to re-open the shared onboarding modal (which contains the
            WeddingStylePicker) so the user can adjust without leaving Budget. */}
        {weddingSettings.wedding_style && weddingSettings.wedding_style !== "general" && weddingSettings.wedding_style !== "custom" && (
          <button
            onClick={() => weddingInfoPrompt.openManually()}
            className="w-full text-left rounded-xl bg-card border border-border px-3 py-2.5 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkle className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-bold text-foreground flex-1">
                {WEDDING_STYLE_LABEL[weddingSettings.wedding_style]} 모드
              </p>
              <span className="text-caption text-muted-foreground">변경 →</span>
            </div>
            <p className="text-caption text-muted-foreground leading-relaxed">
              {weddingSettings.wedding_style === "small"
                ? "하객 수가 적으니 식대 부담이 크게 줄어요. 대신 가까운 분들에게 답례품·식대 단가는 더 신경 쓰는 게 좋아요."
                : "스튜디오·드레스·메이크업을 직접 진행하시면 스드메 예산을 30~50% 절감할 수 있어요. 셀프 진행에 필요한 소품 비용은 기타에 잡아두세요."}
            </p>
          </button>
        )}

        {/* No-style hint — encourage user to pick a style when they have a
            budget but haven't chosen one. Helps general-wedding personas
            discover the small/self optimizations. */}
        {totalBudget > 0 && !weddingSettings.wedding_style && (
          <button
            onClick={() => weddingInfoPrompt.openManually()}
            className="w-full rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 flex items-center gap-2 text-left active:scale-[0.99] transition-transform"
          >
            <Sparkle className="w-3.5 h-3.5 text-primary shrink-0" />
            <p className="text-xs text-foreground flex-1">결혼 스타일을 정하면 예산 추천이 더 정확해져요</p>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Upcoming schedule payments — open tasks with budget mapping due ≤ 30 days */}
        {upcomingExpenseTasks.length > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-primary" /> 다가오는 결제 예정
              </p>
              <button onClick={() => navigate("/schedule")} className="text-caption text-muted-foreground">
                일정 →
              </button>
            </div>
            <div className="space-y-2.5">
              {upcomingExpenseTasks.map(({ task, budgetCat, daysLeft }) => {
                const cat = categories[budgetCat];
                const overdue = daysLeft < 0;
                return (
                  <div key={task.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                        aria-hidden
                      />
                      <span className="text-xs text-foreground truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn("text-caption px-1.5 py-0.5 rounded-full font-medium",
                        overdue ? "bg-destructive/15 text-destructive" :
                        daysLeft <= 7 ? "bg-destructive/10 text-destructive" :
                        daysLeft <= 30 ? "bg-yellow-100 text-yellow-700" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {overdue ? `${-daysLeft}일 지남` : `D-${daysLeft}`}
                      </span>
                      <button
                        onClick={() => openAddWithPrefill(task.title, budgetCat)}
                        className="text-caption bg-primary/10 text-primary px-2 py-1 rounded-full font-bold flex items-center gap-0.5 active:scale-95 transition-transform"
                        aria-label="예산 기록"
                      >
                        <Plus className="w-2.5 h-2.5" />기록
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming balance reminders */}
        {upcomingBalances.length > 0 && (
          <div className="rounded-2xl bg-accent border border-primary/15 p-4">
            <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-primary" /> 다가오는 잔금 일정
            </p>
            <div className="space-y-2.5">
              {upcomingBalances.map(item => {
                const overdue = item.daysLeft < 0;
                const catColor = categories[item.category as BudgetCategory]?.color || "#6B7280";
                return (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: catColor }}
                        aria-hidden
                      />
                      <span className="text-xs text-foreground truncate">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs font-bold text-foreground tabular-nums">{fmt(item.balance_amount!)}만원</span>
                      <span className={cn("text-caption px-1.5 py-0.5 rounded-full font-medium",
                        overdue ? "bg-destructive/15 text-destructive" :
                        item.daysLeft <= 7 ? "bg-destructive/10 text-destructive" :
                        item.daysLeft <= 30 ? "bg-yellow-100 text-yellow-700" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {overdue ? `${-item.daysLeft}일 연체` : `D-${item.daysLeft}`}
                      </span>
                      <button
                        onClick={() => setPayBalanceTarget(item)}
                        className="text-caption bg-primary text-primary-foreground px-2 py-1 rounded-full font-bold flex items-center gap-0.5 active:scale-95 transition-transform"
                        aria-label="잔금 결제 완료"
                      >
                        <Check className="w-2.5 h-2.5" />결제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Partner link — surfaces here because 양가 분담 is the budget-side
            payoff of linking. Hidden for guests (the login overlay covers them). */}
        <PartnerLinkCard variant="budget" hideWhenLoggedOut />

        {/* Paid-by bar — whole card is clickable to open the simulator */}
        {paidTotal > 0 ? (
          <button
            onClick={() => navigate("/budget/split-simulator")}
            className="w-full text-left rounded-2xl bg-card border border-border p-4 active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />양가 분담 현황
              </p>
              <span className="text-caption text-primary font-bold flex items-center gap-0.5">
                시뮬레이션 <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            {/* Per-side cards — easier to show to family at a glance */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl bg-muted/50 p-2.5 text-center">
                <p className="text-caption text-muted-foreground"> 공동</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{fmt(paidShared)}<span className="text-caption font-normal">만원</span></p>
                <p className="text-caption text-muted-foreground">{Math.round((paidShared / paidTotal) * 100)}%</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-center">
                <p className="text-caption text-blue-700"> 신랑측</p>
                <p className="text-sm font-bold text-blue-900 mt-0.5">{fmt(paidGroom)}<span className="text-caption font-normal">만원</span></p>
                <p className="text-caption text-blue-700">{Math.round((paidGroom / paidTotal) * 100)}%</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-center">
                <p className="text-caption text-primary"> 신부측</p>
                <p className="text-sm font-bold text-primary mt-0.5">{fmt(paidBride)}<span className="text-caption font-normal">만원</span></p>
                <p className="text-caption text-primary">{Math.round((paidBride / paidTotal) * 100)}%</p>
              </div>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
              {paidShared > 0 && <div className="bg-muted-foreground/40 h-full transition-all" style={{ width: `${(paidShared / paidTotal) * 100}%` }} />}
              {paidGroom > 0 && <div className="h-full transition-all bg-blue-400" style={{ width: `${(paidGroom / paidTotal) * 100}%` }} />}
              {paidBride > 0 && <div className="h-full transition-all bg-primary" style={{ width: `${(paidBride / paidTotal) * 100}%` }} />}
            </div>
          </button>
        ) : items.length > 0 && (
          <button
            onClick={() => navigate("/budget/split-simulator")}
            className="w-full rounded-2xl bg-card border border-border p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">양가 분담 시뮬레이션</p>
              <p className="text-xs text-muted-foreground">미리 가상으로 분담안 맞춰보기</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Category progress — sorted: over-budget first, then by spent desc, then by budget desc */}
        <div data-tutorial="budget-categories" className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground">카테고리별 현황</p>
            {dimmedBudgetCategories.size > 0 && (
              <p className="text-caption text-muted-foreground">
                흐린 카테고리는 스케줄에서 제외
              </p>
            )}
          </div>
          <div className="space-y-3">
            {[...categoryKeys]
              .map(key => {
                const spent = summary.categoryTotals[key] || 0;
                const rawBudget = catBudgets[key] || 0;
                const dimmed = dimmedBudgetCategories.has(key) && spent === 0;
                // Hide stale budget residue on dimmed (fully-excluded with
                // no spend) rows — the next save through BudgetSetupSheet
                // zeros these in the DB; this keeps the display in sync
                // in the meantime instead of showing "0 / 200만원".
                const budget = dimmed ? 0 : rawBudget;
                const catPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                const over = spent > budget && budget > 0;
                return { key, spent, budget, catPct, over, dimmed };
              })
              .sort((a, b) => {
                if (a.dimmed !== b.dimmed) return a.dimmed ? 1 : -1;
                if (a.over !== b.over) return a.over ? -1 : 1;
                if (b.spent !== a.spent) return b.spent - a.spent;
                return b.budget - a.budget;
              })
              .map(({ key, spent, budget, catPct, over, dimmed }) => (
                <button key={key} className={cn("w-full text-left group", dimmed && "opacity-40")} onClick={() => navigate(`/budget/category/${key}`)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      {categories[key].emoji} {categories[key].label}
                      {partialExclusionLabels[key] && (
                        <span className="text-[9px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded-full">
                          {partialExclusionLabels[key]}
                        </span>
                      )}
                      {catPct >= 90 && <AlertTriangle className="w-3 h-3 text-destructive" />}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={cn("font-bold tabular-nums", over ? "text-destructive" : "text-foreground")}>
                        {fmt(spent)}만원
                      </span>
                      {budget > 0 && <span className="text-muted-foreground tabular-nums">/ {fmt(budget)}만원</span>}
                      {over && <span className="text-caption bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">초과</span>}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${catPct}%`,
                      backgroundColor: catPct >= 90 ? "hsl(var(--destructive))" : catPct >= 70 ? "#F59E0B" : categories[key].color,
                    }} />
                  </div>
                </button>
              ))}
          </div>
        </div>

        {/* Monthly trend */}
        {trendActiveCount >= 2 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-foreground">월별 지출 추이</p>
              <p className="text-caption text-muted-foreground">최근 6개월</p>
            </div>
            <div className="flex items-end justify-between gap-2 h-24">
              {monthlyTrend.map((b, i) => {
                const isCurrent = i === monthlyTrend.length - 1;
                const heightPct = trendMax > 0 ? (b.total / trendMax) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className={cn("text-[9px] tabular-nums",
                      b.total > 0 ? "text-foreground font-bold" : "text-muted-foreground"
                    )}>
                      {b.total > 0 ? fmt(b.total) : "·"}
                    </span>
                    <div className="w-full flex items-end h-14">
                      <div
                        className={cn("w-full rounded-t-md transition-all duration-500",
                          isCurrent ? "bg-primary" : "bg-primary/30"
                        )}
                        style={{ height: `${Math.max(heightPct, b.total > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <span className={cn("text-caption",
                      isCurrent ? "text-foreground font-bold" : "text-muted-foreground"
                    )}>{b.label}</span>
                  </div>
                );
              })}
            </div>
            {(() => {
              const cur = monthlyTrend[monthlyTrend.length - 1].total;
              const prev = monthlyTrend[monthlyTrend.length - 2].total;
              if (prev === 0) return null;
              const diff = cur - prev;
              const diffPct = Math.round((Math.abs(diff) / prev) * 100);
              return (
                <p className={cn("text-caption mt-2 text-center",
                  diff > 0 ? "text-destructive" : diff < 0 ? "text-emerald-600" : "text-muted-foreground"
                )}>
                  이번 달은 지난 달보다 {diff === 0 ? "동일" : `${diffPct}% ${diff > 0 ? "더 썼어요" : "덜 썼어요"}`}
                </p>
              );
            })()}
          </div>
        )}

        {/* Premium Report Banner */}
        <button
          onClick={() => isPremium ? setReportOpen(true) : setUpgradeOpen(true)}
          className="w-full rounded-2xl bg-card border border-border p-4 flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {isPremium
              ? <Download className="w-5 h-5 text-primary" />
              : <Sparkles className="w-5 h-5 text-primary" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">예산 분석 리포트 PDF</p>
            <p className="text-xs text-muted-foreground">
              {isPremium ? "현재 지출 데이터 기반 PDF 다운로드" : "프리미엄 전용"}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Recent items */}
        <div className="rounded-2xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground">
              최근 지출 {items.length > 0 && <span className="text-muted-foreground font-normal">({items.length})</span>}
            </p>
            {items.length > 0 && (
              <button onClick={() => navigate("/budget/history")} className="text-xs text-primary font-medium">전체보기 →</button>
            )}
          </div>
          {recentItems.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground font-medium mb-1">아직 기록된 지출이 없어요</p>
              <p className="text-xs text-muted-foreground">아래 버튼으로 첫 지출을 기록해보세요</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {recentItems.map(item => {
                const cat = categories[item.category as BudgetCategory];
                const pb = paidByOptions.find(p => p.value === item.paid_by);
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                    <button className="flex-1 flex items-center gap-3 text-left min-w-0"
                      onClick={() => { setEditItem(item); setAddOpen(true); }}>
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat?.color || "#6B7280" }}
                          aria-hidden
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-caption text-muted-foreground flex items-center gap-1 flex-wrap">
                          {format(new Date(item.item_date), "M.d")} · {pb?.emoji} {pb?.label}
                          {item.payment_stage && item.payment_stage !== "full" && (
                            <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                              {paymentStageOptions.find(s => s.value === item.payment_stage)?.label}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground flex-shrink-0 tabular-nums">{fmt(item.amount)}만원</span>
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                      onClick={() => setDeleteTarget(item)}
                      aria-label="삭제">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom button */}
      <div data-tutorial="budget-add" className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto px-4 z-30">
        <button onClick={() => { setEditItem(null); setAddOpen(true); }}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
          <Plus className="w-4 h-4" /> 지출 기록하기
        </button>
      </div>

      <BudgetSetupSheet
        open={setupOpen} onOpenChange={setSetupOpen}
        initialRegion={settings?.region || profileRegionKey}
        initialGuestCount={settings?.guest_count}
        initialTotalBudget={settings?.total_budget}
        initialCategoryBudgets={settings?.category_budgets}
        weddingStyle={weddingSettings.wedding_style}
        excludedCategories={weddingSettings.excluded_categories}
        visibleCategoryKeys={visibleSheetCategories}
        onSave={data => {
          saveSettings.mutate(data, {
            onSuccess: () => toast({ title: "예산 설정이 저장되었습니다" }),
          });
        }}
      />

      <BudgetAddSheet
        open={addOpen}
        onOpenChange={open => {
          setAddOpen(open);
          if (!open) setAddPrefill(null);
        }}
        editItem={editItem}
        initialCategory={addPrefill?.category}
        initialTitle={addPrefill?.title}
        weddingDate={weddingSettings.wedding_date}
        visibleCategoryKeys={visibleSheetCategories}
        onSave={data => {
          if (editItem) {
            updateItem.mutate({ id: editItem.id, ...data } as any, {
              onSuccess: () => toast({ title: "수정되었습니다" }),
            });
          } else {
            addItem.mutate(data, {
              onSuccess: () => toast({ title: "지출이 기록되었습니다" }),
            });
          }
        }}
      />

      <BudgetReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        visibleCategoryKeys={categoryKeys}
      />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="pdf_feature" />

      <PayBalanceSheet
        item={payBalanceTarget}
        onOpenChange={open => { if (!open) setPayBalanceTarget(null); }}
        onConfirm={payload => {
          if (payBalanceTarget) handleMarkBalancePaid(payBalanceTarget, payload);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 지출을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.title}</span>
                  {" "}({fmt(deleteTarget.amount)}만원)을 삭제하면 복구할 수 없어요.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) return;
                deleteItem.mutate(deleteTarget.id, {
                  onSuccess: () => toast({ title: "삭제되었습니다" }),
                });
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WeddingInfoSetupModal
        isOpen={weddingInfoPrompt.open}
        onClose={weddingInfoPrompt.dismiss}
      />

      <BottomNav activeTab={location.pathname} onTabChange={href => navigate(href)} />

      {tutorial.isActive && tutorial.currentStep && (
        <TutorialOverlay
          isActive={tutorial.isActive}
          currentStep={tutorial.currentStep}
          currentStepIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onPrev={tutorial.prevStep}
          onSkip={tutorial.skipTutorial}
        />
      )}
    </div>
  );
};

export default Budget;
