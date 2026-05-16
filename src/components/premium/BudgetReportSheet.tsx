import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2, Eye } from "lucide-react";
import {
  generatePdfHeader,
  generatePdfFooter,
  pdfInfoGrid,
  pdfStatRow,
  pdfSection,
} from "@/lib/pdfGenerator";
import PdfPreviewModal from "@/components/premium/PdfPreviewModal";
import { useBudget } from "@/hooks/useBudget";
import { categories, categoryKeys as ALL_CATEGORY_KEYS, regions, getRegionalAvgWithMeal, savingTips, type BudgetCategory } from "@/data/budgetData";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { WEDDING_STYLE_LABEL } from "@/lib/weddingStyle";
import { toast } from "sonner";

interface BudgetReportSheetProps {
  open: boolean;
  onClose: () => void;
  visibleCategoryKeys?: BudgetCategory[];
}

const BudgetReportSheet = ({ open, onClose, visibleCategoryKeys }: BudgetReportSheetProps) => {
  const categoryKeys = visibleCategoryKeys ?? ALL_CATEGORY_KEYS;
  const { weddingSettings } = useWeddingSchedule();
  const { settings, items, summary } = useBudget(undefined, weddingSettings.wedding_style);
  const profile = useWeddingProfile();
  const [generating, setGenerating] = useState(false);
  const [htmlResult, setHtmlResult] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const totalBudget = settings?.total_budget || 0;
      const regionKey = settings?.region || "seoul";
      const regionLabel = regions[regionKey]?.label || regionKey;
      const guestCount = settings?.guest_count || 200;
      const avg = getRegionalAvgWithMeal(regionKey, guestCount, weddingSettings.wedding_style ?? undefined);
      const catBudgets = (settings?.category_budgets || {}) as Record<BudgetCategory, number>;

      let daysLeft: number | null = null;
      if (weddingSettings.wedding_date) {
        const diff = Math.ceil((new Date(weddingSettings.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        daysLeft = diff > 0 ? diff : 0;
      }

      const usagePct = totalBudget > 0 ? Math.round((summary.totalSpent / totalBudget) * 100) : 0;
      const remaining = totalBudget - summary.totalSpent;
      const dailyBurn = daysLeft && daysLeft > 0 && summary.totalSpent > 0
        ? Math.round(summary.totalSpent / Math.max(1, 180 - daysLeft))
        : 0;

      // Health score: 100 - penalty for overspending categories - penalty for over-pace
      const overCats = categoryKeys.filter((k) => {
        const spent = summary.categoryTotals[k] || 0;
        const budget = catBudgets[k] || 0;
        return budget > 0 && spent > budget;
      });
      const overPace = daysLeft !== null && daysLeft > 60 && usagePct >= 80;
      const healthScore = Math.max(40, 100 - overCats.length * 10 - (overPace ? 15 : 0) - (usagePct > 100 ? 15 : 0));
      const healthLabel = healthScore >= 85 ? "매우 안정" : healthScore >= 70 ? "양호" : healthScore >= 55 ? "주의" : "재조정 필요";
      const healthColor = healthScore >= 70 ? "#10b981" : healthScore >= 55 ? "#f59e0b" : "#ef4444";

      const couple = profile.displayName && profile.partnerName
        ? `${profile.displayName} ♥ ${profile.partnerName}`
        : undefined;
      let html = generatePdfHeader(
        "웨딩 예산 분석 리포트",
        `${regionLabel} · 총 예산 ${totalBudget.toLocaleString()}만원 · 기록 ${items.length}건`,
        {
          couple,
          weddingDate: profile.weddingDate || undefined,
          styleLabel: WEDDING_STYLE_LABEL[profile.weddingStyle],
        },
      );

      // Overview info grid
      html += pdfInfoGrid([
        { label: "지역", value: regionLabel },
        { label: "총 예산", value: `${totalBudget.toLocaleString()}만원` },
        { label: "총 지출", value: `${summary.totalSpent.toLocaleString()}만원` },
        { label: "남은 예산", value: `${remaining.toLocaleString()}만원` },
        ...(daysLeft !== null ? [{ label: "결혼식까지", value: `D-${daysLeft}` }] : []),
        { label: "예산 사용률", value: `${usagePct}%` },
      ]);

      // Stat row: at-a-glance metrics
      html += pdfStatRow([
        { value: `${healthScore}점`, label: `예산 건강도 (${healthLabel})` },
        { value: `${overCats.length}개`, label: "초과 카테고리" },
        { value: `${items.length}건`, label: "기록된 항목" },
      ]);

      // Category breakdown
      let catTable = `<table class="pdf-table"><thead><tr><th>카테고리</th><th>예산</th><th>지출</th><th>사용률</th><th>지역 평균</th><th>평균 대비</th></tr></thead><tbody>`;
      for (const key of categoryKeys) {
        const spent = summary.categoryTotals[key] || 0;
        const budget = catBudgets[key] || 0;
        const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        const avgVal = avg ? (avg as any)[key] : 0;
        const diff = spent - avgVal;
        const diffLabel = diff > 0 ? `+${diff}만원` : diff < 0 ? `${diff}만원` : "동일";
        catTable += `<tr><td>${categories[key].emoji} ${categories[key].label}</td><td>${budget}만원</td><td>${spent}만원</td><td>${pct}%</td><td>${avgVal}만원</td><td style="color:${diff > 0 ? '#ef4444' : '#10b981'};font-weight:600">${diffLabel}</td></tr>`;
      }
      catTable += `<tr class="total-row"><td>합계</td><td>${totalBudget}만원</td><td>${summary.totalSpent}만원</td><td>${usagePct}%</td><td>${avg?.total || "-"}만원</td><td></td></tr></tbody></table>`;
      html += pdfSection("📊 카테고리별 지출 현황", catTable);

      // Health score badge area
      html += `<div class="pdf-highlight" style="border-left:4px solid ${healthColor};padding-left:14px;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px;">예산 건강도</div>
        <div style="font-size:18px;font-weight:700;color:${healthColor};">${healthScore}점 · ${healthLabel}</div>
        <div style="font-size:10.5px;color:#6b7280;margin-top:6px;line-height:1.6;">
          ${
            healthScore >= 85
              ? "초과 카테고리 없이 평균 대비 안정적으로 관리 중이에요."
              : healthScore >= 70
                ? "전체적으로 양호하지만 일부 카테고리에 주의가 필요합니다."
                : healthScore >= 55
                  ? "초과 카테고리가 있어요. 잔여 예산을 재배분해보세요."
                  : "예산 재조정이 시급합니다. 우선순위가 낮은 항목부터 정리해보세요."
          }
        </div>
      </div>`;

      // Paid-by split
      const paidShared = summary.paidByTotals["shared"] || 0;
      const paidGroom = summary.paidByTotals["groom"] || 0;
      const paidBride = summary.paidByTotals["bride"] || 0;
      const splitTotal = paidShared + paidGroom + paidBride;
      if (splitTotal > 0) {
        const splitTable = `<table class="pdf-table"><thead><tr><th>구분</th><th>금액</th><th>비율</th></tr></thead><tbody>
          <tr><td>🤝 공동</td><td>${paidShared}만원</td><td>${Math.round((paidShared / splitTotal) * 100)}%</td></tr>
          <tr><td>🤵 신랑측</td><td>${paidGroom}만원</td><td>${Math.round((paidGroom / splitTotal) * 100)}%</td></tr>
          <tr><td>👰 신부측</td><td>${paidBride}만원</td><td>${Math.round((paidBride / splitTotal) * 100)}%</td></tr>
        </tbody></table>`;
        html += pdfSection("🤝 양가 분담 현황", splitTable);
      }

      // Balance items
      const balanceItems = items
        .filter((i) => i.has_balance && i.balance_amount && i.balance_amount > 0)
        .sort((a, b) => {
          const da = a.balance_due_date ? new Date(a.balance_due_date).getTime() : Infinity;
          const db = b.balance_due_date ? new Date(b.balance_due_date).getTime() : Infinity;
          return da - db;
        });
      if (balanceItems.length > 0) {
        const totalBalance = balanceItems.reduce((s, i) => s + (i.balance_amount || 0), 0);
        let balanceTable = `<table class="pdf-table"><thead><tr><th>납부일</th><th>항목</th><th>잔금</th></tr></thead><tbody>`;
        for (const item of balanceItems) {
          balanceTable += `<tr><td>${item.balance_due_date || "-"}</td><td>${item.title}</td><td>${item.balance_amount}만원</td></tr>`;
        }
        balanceTable += `<tr class="total-row"><td>합계</td><td></td><td>${totalBalance}만원</td></tr></tbody></table>`;
        html += pdfSection("💳 잔금 납부 일정", balanceTable);
      }

      // Insights & recommendations
      const insights: string[] = [];
      const warningInsights: string[] = [];
      for (const key of categoryKeys) {
        const spent = summary.categoryTotals[key] || 0;
        const budget = catBudgets[key] || 0;
        const avgVal = avg ? (avg as any)[key] : 0;

        if (budget > 0 && spent > budget) {
          warningInsights.push(`${categories[key].emoji} ${categories[key].label}: 예산 ${budget}만원 대비 ${spent - budget}만원 초과 (${Math.round((spent / budget) * 100)}%)`);
        } else if (avgVal > 0 && spent > avgVal * 1.15) {
          insights.push(`${categories[key].label} 지출이 ${regionLabel} 평균보다 ${Math.round(((spent - avgVal) / avgVal) * 100)}% 높아요. 항목을 점검해보세요.`);
        } else if (avgVal > 0 && spent > 0 && spent < avgVal * 0.7) {
          insights.push(`${categories[key].label}은 평균 대비 ${Math.round(((avgVal - spent) / avgVal) * 100)}% 절약 중이에요.`);
        }
      }
      if (overPace) {
        warningInsights.push(`결혼식까지 ${daysLeft}일 남았는데 예산을 ${usagePct}% 사용했어요. 페이스 조절이 필요해요.`);
      }
      if (insights.length === 0 && warningInsights.length === 0) {
        insights.push("전체적으로 평균 범위 안에서 잘 관리되고 있어요. 👍");
      }

      let insightHtml = "";
      for (const w of warningInsights) insightHtml += `<div class="pdf-warning">${w}</div>`;
      for (const tip of insights) insightHtml += `<div class="pdf-tip">${tip}</div>`;
      html += pdfSection("💡 진단 및 조언", insightHtml);

      // Recommended saving tips (top categories)
      const overOrNear = categoryKeys.filter((k) => {
        const spent = summary.categoryTotals[k] || 0;
        const budget = catBudgets[k] || 0;
        return budget > 0 && spent >= budget * 0.8;
      });
      const tipCats = overOrNear.length > 0 ? overOrNear : categoryKeys.slice(0, 3);
      const tipPool: { cat: string; tip: string }[] = [];
      for (const k of tipCats) {
        for (const t of savingTips[k].slice(0, 2)) {
          tipPool.push({ cat: categories[k].label, tip: t });
        }
      }
      if (tipPool.length > 0) {
        let tipHtml = `<ul class="pdf-bullet-list">`;
        for (const t of tipPool.slice(0, 8)) {
          tipHtml += `<li><strong>${t.cat}</strong> · ${t.tip}</li>`;
        }
        tipHtml += `</ul>`;
        html += pdfSection("💰 추천 절약 포인트", tipHtml);
      }

      // Disclaimer
      html += `<div class="pdf-note">📌 이 리포트는 현재 입력된 예산/지출 데이터와 ${regionLabel} 평균값을 기반으로 자동 분석된 결과입니다. 실제 상황과 차이가 있을 수 있어요.</div>`;

      html += generatePdfFooter();

      setHtmlResult(html);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("리포트 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl pb-8">
        <SheetHeader>
          <SheetTitle>📊 예산 분석 리포트</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <div className="bg-muted rounded-2xl p-4 mb-4">
            <p className="text-sm text-foreground">현재 예산 데이터를 기반으로 분석 리포트를 PDF로 생성합니다.</p>
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-muted-foreground">총 예산: <strong className="text-foreground">{(settings?.total_budget || 0).toLocaleString()}만원</strong></p>
              <p className="text-xs text-muted-foreground">총 지출: <strong className="text-foreground">{summary.totalSpent.toLocaleString()}만원</strong></p>
              <p className="text-xs text-muted-foreground">기록 수: <strong className="text-foreground">{items.length}건</strong></p>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={generating} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {generating ? "분석 중..." : "리포트 미리보기"}
          </button>
        </div>
      </SheetContent>
    </Sheet>

    <PdfPreviewModal
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      html={htmlResult}
      filename={`듀이_예산리포트_${new Date().toISOString().split("T")[0]}.pdf`}
      title="웨딩 예산 분석 리포트 미리보기"
    />
    </>
  );
};

export default BudgetReportSheet;
