import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, Plus, Settings, MapPin, AlertTriangle, ChevronRight, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useBudget } from "@/hooks/useBudget";
import { useAuth } from "@/contexts/AuthContext";
import { categories, regions, paidByOptions, paymentStageOptions, paymentMethodOptions, type BudgetCategory } from "@/data/budgetData";
import BudgetSetupSheet from "@/components/budget/BudgetSetupSheet";
import BudgetAddSheet from "@/components/budget/BudgetAddSheet";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import type { BudgetItem } from "@/hooks/useBudget";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";

// Map Korean region label to budget region key
const regionLabelToKey = (label: string | null): string | undefined => {
  if (!label) return undefined;
  return Object.entries(regions).find(([_, r]) => r.label === label)?.[0];
};

const categoryKeys: BudgetCategory[] = ["venue", "sdm", "ring", "house", "honeymoon", "etc"];

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

  // First visit: auto-open setup
  useEffect(() => {
    if (!isLoading && user && !settings) {
      setSetupOpen(true);
    }
  }, [isLoading, user, settings]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
        <div className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
            <h1 className="text-base font-bold text-foreground">웨딩 예산</h1>
            <div className="w-5" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-muted-foreground text-sm mb-4">로그인 후 예산 관리를 시작하세요</p>
          <button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold">로그인</button>
        </div>
        <BottomNav activeTab={location.pathname} onTabChange={href => navigate(href)} />
      </div>
    );
  }

  const totalBudget = settings?.total_budget || 0;
  const pct = totalBudget > 0 ? Math.min((summary.totalSpent / totalBudget) * 100, 100) : 0;
  const pctColor = pct >= 90 ? "text-destructive" : pct >= 70 ? "text-yellow-500" : "text-emerald-500";
  const catBudgets = settings?.category_budgets || {} as Record<BudgetCategory, number>;

  // Paid-by bar
  const paidShared = summary.paidByTotals["shared"] || 0;
  const paidGroom = summary.paidByTotals["groom"] || 0;
  const paidBride = summary.paidByTotals["bride"] || 0;
  const paidTotal = paidShared + paidGroom + paidBride;

  const recentItems = items.slice(0, 10);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h1 className="text-base font-bold text-foreground">웨딩 예산</h1>
          <button onClick={() => setSetupOpen(true)}><Settings className="w-5 h-5 text-foreground" /></button>
        </div>
      </div>

      <div className="px-4 py-4 pb-36 space-y-4">
        {/* Summary Card */}
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-foreground">
                {totalBudget > 0 ? `${totalBudget.toLocaleString()}만원` : "예산 미설정"}
              </span>
              {settings?.region && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {regions[settings.region]?.label}
                </span>
              )}
            </div>
            {totalBudget === 0 && (
              <button onClick={() => setSetupOpen(true)} className="text-xs text-primary font-bold">설정하기</button>
            )}
          </div>

          {totalBudget > 0 && (
            <>
              <Progress value={pct} className="h-3 mb-2" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">사용 <span className={cn("font-bold", pctColor)}>{summary.totalSpent.toLocaleString()}만원</span></span>
                <span className="text-muted-foreground">남은 예산 <span className="font-bold text-foreground">{summary.remaining.toLocaleString()}만원</span></span>
              </div>
            </>
          )}
        </div>

        {/* Paid-by bar */}
        {paidTotal > 0 && (
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">양가 분담 현황</p>
            <div className="h-4 rounded-full overflow-hidden flex bg-muted">
              {paidShared > 0 && <div className="bg-gray-400 h-full" style={{ width: `${(paidShared / paidTotal) * 100}%` }} />}
              {paidGroom > 0 && <div className="h-full" style={{ width: `${(paidGroom / paidTotal) * 100}%`, backgroundColor: "#3B82F6" }} />}
              {paidBride > 0 && <div className="h-full" style={{ width: `${(paidBride / paidTotal) * 100}%`, backgroundColor: "#F4A7B9" }} />}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
              <span>🤝 공동 {paidShared}만원</span>
              <span>🤵 신랑측 {paidGroom}만원</span>
              <span>👰 신부측 {paidBride}만원</span>
            </div>
          </div>
        )}

        {/* Category progress */}
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-xs font-semibold text-foreground mb-3">카테고리별 현황</p>
          <div className="space-y-3">
            {categoryKeys.map(key => {
              const spent = summary.categoryTotals[key] || 0;
              const budget = catBudgets[key] || 0;
              const catPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
              const over = spent > budget && budget > 0;
              const avgVal = regionalAverage ? (regionalAverage as any)[key] : 0;

              return (
                <button key={key} className="w-full text-left" onClick={() => navigate(`/budget/category/${key}`)}>
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
                      {over && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">초과</span>}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${catPct}%`,
                      backgroundColor: catPct >= 90 ? "#EF4444" : catPct >= 70 ? "#F59E0B" : categories[key].color,
                    }} />
                  </div>
                  {avgVal > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">지역 평균 {avgVal}만원</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent items */}
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-foreground">최근 지출</p>
            {items.length > 10 && (
              <button onClick={() => navigate("/budget/history")} className="text-xs text-primary">전체보기</button>
            )}
          </div>
          {recentItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              아직 기록된 지출이 없어요.<br />첫 지출을 기록해보세요!
            </p>
          ) : (
            <div className="space-y-2">
              {recentItems.map(item => {
                const cat = categories[item.category as BudgetCategory];
                const pb = paidByOptions.find(p => p.value === item.paid_by);
                return (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0 group">
                    <button className="flex-1 flex items-center gap-3 text-left"
                      onClick={() => { setEditItem(item); setAddOpen(true); }}>
                      <span className="text-lg">{cat?.emoji || "📋"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                          {format(new Date(item.item_date), "M.d")} · {pb?.emoji} {pb?.label}
                          {item.payment_stage && item.payment_stage !== "full" && (
                            <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                              {paymentStageOptions.find(s => s.value === item.payment_stage)?.label}
                            </span>
                          )}
                          {item.payment_method && item.payment_method !== "cash" && (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              {paymentMethodOptions.find(m => m.value === item.payment_method)?.emoji} {paymentMethodOptions.find(m => m.value === item.payment_method)?.label}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-foreground">{item.amount}만원</span>
                    </button>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1"
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
      <div className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto px-4 z-30">
        <button onClick={() => { setEditItem(null); setAddOpen(true); }}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm shadow-lg">
          + 지출 기록하기
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

      <BottomNav activeTab={location.pathname} onTabChange={href => navigate(href)} />
    </div>
  );
};

export default Budget;
