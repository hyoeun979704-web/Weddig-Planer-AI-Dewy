import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBudget } from "@/hooks/useBudget";
import { useAuth } from "@/contexts/AuthContext";
import { categories, type BudgetCategory } from "@/data/budgetData";
import { Slider } from "@/components/ui/slider";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { regions } from "@/data/budgetData";

const regionLabelToKey = (label: string | null): string | undefined => {
  if (!label) return undefined;
  return Object.entries(regions).find(([_, r]) => r.label === label)?.[0];
};

const categoryKeys: BudgetCategory[] = ["venue", "sdm", "ring", "house", "honeymoon", "etc"];

const traditionalSplit: Record<BudgetCategory, { groom: number; bride: number; label: string }> = {
  venue: { groom: 0, bride: 100, label: "전통적 신부측" },
  sdm: { groom: 0, bride: 100, label: "전통적 신부측" },
  ring: { groom: 50, bride: 50, label: "각자 부담" },
  house: { groom: 100, bride: 0, label: "전통적 신랑측" },
  honeymoon: { groom: 100, bride: 0, label: "전통적 신랑측" },
  etc: { groom: 50, bride: 50, label: "공동 부담" },
};

type SplitMode = "groom" | "bride" | "shared";

const presets = [
  { label: "5:5", groom: 50, bride: 50 },
  { label: "6:4", groom: 60, bride: 40 },
  { label: "7:3", groom: 70, bride: 30 },
];

const BudgetSplitSimulator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { defaultRegion } = useDefaultRegion();
  const profileRegionKey = regionLabelToKey(defaultRegion);
  const { settings } = useBudget(profileRegionKey);

  const totalBudget = settings?.total_budget || 0;
  const catBudgets = (settings?.category_budgets || {}) as Record<BudgetCategory, number>;

  const [overallRatio, setOverallRatio] = useState(50);
  const [categorySplits, setCategorySplits] = useState<Record<BudgetCategory, SplitMode>>(() => {
    const initial: Record<string, SplitMode> = {};
    categoryKeys.forEach(k => {
      const t = traditionalSplit[k];
      if (t.groom === 100) initial[k] = "groom";
      else if (t.bride === 100) initial[k] = "bride";
      else initial[k] = "shared";
    });
    return initial as Record<BudgetCategory, SplitMode>;
  });

  const handlePreset = (groom: number) => {
    setOverallRatio(groom);
  };

  const toggleSplit = (key: BudgetCategory) => {
    setCategorySplits(prev => {
      const order: SplitMode[] = ["shared", "groom", "bride"];
      const cur = prev[key];
      const next = order[(order.indexOf(cur) + 1) % 3];
      return { ...prev, [key]: next };
    });
  };

  // Calculate totals
  let groomTotal = 0;
  let brideTotal = 0;
  let sharedTotal = 0;

  categoryKeys.forEach(key => {
    const budget = catBudgets[key] || 0;
    const split = categorySplits[key];
    if (split === "groom") groomTotal += budget;
    else if (split === "bride") brideTotal += budget;
    else {
      groomTotal += Math.round(budget * overallRatio / 100);
      brideTotal += Math.round(budget * (100 - overallRatio) / 100);
      sharedTotal += budget;
    }
  });

  const grandTotal = groomTotal + brideTotal || 1;
  const groomPct = Math.round((groomTotal / grandTotal) * 100);
  const bridePct = 100 - groomPct;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">양가 분담 시뮬레이터</h1>
        </div>
      </header>

      <main className="px-4 py-4 pb-20 space-y-4">
        {/* Total Budget */}
        <div className="p-4 bg-card border border-border rounded-2xl text-center">
          <p className="text-xs text-muted-foreground">총 예산</p>
          <p className="text-2xl font-bold text-foreground">{totalBudget > 0 ? `${totalBudget.toLocaleString()}만원` : "미설정"}</p>
        </div>

        {/* Overall Ratio Slider */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <p className="text-xs font-semibold text-foreground mb-3">공동 부담 분담 비율</p>
          <div className="flex gap-2 mb-3">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.groom)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                  overallRatio === p.groom ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Slider value={[overallRatio]} onValueChange={v => setOverallRatio(v[0])} min={0} max={100} step={5} className="mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>🤵 신랑측 {overallRatio}%</span>
            <span>👰 신부측 {100 - overallRatio}%</span>
          </div>
        </div>

        {/* Category Split */}
        <div className="p-4 bg-card border border-border rounded-2xl">
          <p className="text-xs font-semibold text-foreground mb-3">카테고리별 분담</p>
          <div className="space-y-2">
            {categoryKeys.map(key => {
              const budget = catBudgets[key] || 0;
              const split = categorySplits[key];
              const splitLabel = split === "groom" ? "🤵 신랑측" : split === "bride" ? "👰 신부측" : "🤝 공동";
              const splitColor = split === "groom" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                : split === "bride" ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" 
                : "bg-muted text-muted-foreground";

              return (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{categories[key].emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{categories[key].label}</p>
                      <p className="text-[10px] text-muted-foreground">{budget}만원</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSplit(key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${splitColor}`}
                  >
                    {splitLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Result Summary */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-2xl">
          <p className="text-xs font-semibold text-foreground mb-3">분담 결과</p>
          <div className="h-5 rounded-full overflow-hidden flex bg-muted mb-3">
            {groomTotal > 0 && (
              <div className="h-full flex items-center justify-center text-[10px] font-bold text-white" 
                style={{ width: `${groomPct}%`, backgroundColor: "#3B82F6" }}>
                {groomPct}%
              </div>
            )}
            {brideTotal > 0 && (
              <div className="h-full flex items-center justify-center text-[10px] font-bold text-white" 
                style={{ width: `${bridePct}%`, backgroundColor: "#F4A7B9" }}>
                {bridePct}%
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-card rounded-xl">
              <p className="text-xs text-muted-foreground">🤵 신랑측</p>
              <p className="text-lg font-bold text-foreground">{groomTotal.toLocaleString()}만원</p>
            </div>
            <div className="text-center p-3 bg-card rounded-xl">
              <p className="text-xs text-muted-foreground">👰 신부측</p>
              <p className="text-lg font-bold text-foreground">{brideTotal.toLocaleString()}만원</p>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="p-4 bg-muted rounded-2xl">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 최근 트렌드는 항목별로 유연하게 나누는 커플이 늘고 있어요. 양가가 편하게 대화할 수 있는 분위기가 가장 중요해요.
          </p>
        </div>
      </main>
    </div>
  );
};

export default BudgetSplitSimulator;
