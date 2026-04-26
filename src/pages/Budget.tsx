import { useState, useEffect } from "react";
import LoginRequiredOverlay from "@/components/LoginRequiredOverlay";
import { useNavigate, useLocation } from "react-router-dom";
import TutorialOverlay from "@/components/TutorialOverlay";
import { usePageTutorial } from "@/hooks/usePageTutorial";
import BottomNav from "@/components/BottomNav";
import { Plus, Settings, MapPin, AlertTriangle, ChevronRight, Trash2, Sparkles, Download, Clock, Bell } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useBudget } from "@/hooks/useBudget";
import { useAuth } from "@/contexts/AuthContext";
import { categories, regions, paidByOptions, paymentStageOptions, paymentMethodOptions, type BudgetCategory } from "@/data/budgetData";
import BudgetSetupSheet from "@/components/budget/BudgetSetupSheet";
import BudgetAddSheet from "@/components/budget/BudgetAddSheet";
import BudgetReportSheet from "@/components/premium/BudgetReportSheet";
import UpgradeModal from "@/components/premium/UpgradeModal";
import WeddingInfoSetupModal from "@/components/wedding-planner/WeddingInfoSetupModal";
import { useWeddingInfoPrompt } from "@/hooks/useWeddingInfoPrompt";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { BudgetItem } from "@/hooks/useBudget";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

const regionLabelToKey = (label: string | null): string | undefined => {
  if (!label) return undefined;
  return Object.entries(regions).find(([_, r]) => r.label === label)?.[0];
};

const categoryKeys: BudgetCategory[] = ["venue", "sdm", "ring", "house", "honeymoon", "etc"];

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
  const profileRegionKey = regionLabelToKey(defaultRegion);
  const { settings, items, summary, regionalAverage, isLoading, saveSettings, addItem, updateItem, deleteItem } = useBudget(profileRegionKey);

  const [setupOpen, setSetupOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
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

  // Upcoming balances
  const upcomingBalances = items
    .filter(i => i.has_balance && i.balance_amount && i.balance_amount > 0 && i.balance_due_date)
    .map(i => ({ ...i, daysLeft: differenceInDays(new Date(i.balance_due_date!), new Date()) }))
    .filter(i => i.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const recentItems = items.slice(0, 10);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {showLoginOverlay && <LoginRequiredOverlay message="지역별 평균 비교, 양가 분담 현황까지 체계적으로 관리하세요" features={["지역별 평균 비교", "양가 분담 관리", "잔금 알림"]} />}
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
              <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
            </button>
            <h1 className="text-lg font-bold text-foreground">예산</h1>
          </div>
          <button
            data-tutorial="budget-settings"
            onClick={() => setSetupOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium"
          >
            예산 설정
          </button>
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
                    <span className="text-lg font-bold text-foreground">{totalBudget.toLocaleString()}만원</span>
                    {settings?.region && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {regions[settings.region]?.label}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground">사용</p>
                      <p className="text-sm font-bold text-foreground">{summary.totalSpent.toLocaleString()}만원</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">남은 예산</p>
                      <p className="text-sm font-bold text-foreground">{summary.remaining.toLocaleString()}만원</p>
                    </div>
                  </div>
                </div>
              </div>
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
                    <span key={key} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
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

        {/* Upcoming balance reminders */}
        {upcomingBalances.length > 0 && (
          <div className="rounded-2xl bg-accent border border-primary/15 p-4">
            <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-primary" /> 다가오는 잔금 일정
            </p>
            <div className="space-y-2">
              {upcomingBalances.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{categories[item.category as BudgetCategory]?.emoji || "📋"}</span>
                    <span className="text-xs text-foreground truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-foreground">{item.balance_amount}만원</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      item.daysLeft <= 7 ? "bg-destructive/10 text-destructive" :
                      item.daysLeft <= 30 ? "bg-yellow-100 text-yellow-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      D-{item.daysLeft}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paid-by bar */}
        {paidTotal > 0 && (
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-foreground">양가 분담 현황</p>
              <button onClick={() => navigate("/budget/split-simulator")} className="text-[10px] text-primary font-bold">시뮬레이션 →</button>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
              {paidShared > 0 && <div className="bg-muted-foreground/40 h-full transition-all" style={{ width: `${(paidShared / paidTotal) * 100}%` }} />}
              {paidGroom > 0 && <div className="h-full transition-all bg-blue-400" style={{ width: `${(paidGroom / paidTotal) * 100}%` }} />}
              {paidBride > 0 && <div className="h-full transition-all bg-primary" style={{ width: `${(paidBride / paidTotal) * 100}%` }} />}
            </div>
            <div className="flex justify-between mt-2 text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> 공동 {paidShared}만원
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" /> 신랑측 {paidGroom}만원
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" /> 신부측 {paidBride}만원
              </span>
            </div>
          </div>
        )}

        {/* Category progress */}
        <div data-tutorial="budget-categories" className="rounded-2xl bg-card border border-border p-4">
          <p className="text-xs font-semibold text-foreground mb-3">카테고리별 현황</p>
          <div className="space-y-3">
            {categoryKeys.map(key => {
              const spent = summary.categoryTotals[key] || 0;
              const budget = catBudgets[key] || 0;
              const catPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const over = spent > budget && budget > 0;

              return (
                <button key={key} className="w-full text-left group" onClick={() => navigate(`/budget/category/${key}`)}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      {categories[key].emoji} {categories[key].label}
                      {catPct >= 90 && <AlertTriangle className="w-3 h-3 text-destructive" />}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={cn("font-bold", over ? "text-destructive" : "text-foreground")}>
                        {spent}만원
                      </span>
                      {budget > 0 && <span className="text-muted-foreground">/ {budget}만원</span>}
                      {over && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">초과</span>}
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
              );
            })}
          </div>
        </div>

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
            <p className="text-xs font-semibold text-foreground">최근 지출</p>
            {items.length > 10 && (
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
                        <span className="text-sm">{cat?.emoji || "📋"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                          {format(new Date(item.item_date), "M.d")} · {pb?.emoji} {pb?.label}
                          {item.payment_stage && item.payment_stage !== "full" && (
                            <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                              {paymentStageOptions.find(s => s.value === item.payment_stage)?.label}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground flex-shrink-0">{item.amount}만원</span>
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                      onClick={() => {
                        deleteItem.mutate(item.id, {
                          onSuccess: () => toast({ title: "삭제되었습니다" }),
                        });
                      }}>
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
        onSave={data => {
          saveSettings.mutate(data, {
            onSuccess: () => toast({ title: "예산 설정이 저장되었습니다" }),
          });
        }}
      />

      <BudgetAddSheet
        open={addOpen} onOpenChange={setAddOpen}
        editItem={editItem}
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

      <BudgetReportSheet open={reportOpen} onClose={() => setReportOpen(false)} />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} trigger="pdf_feature" />

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
