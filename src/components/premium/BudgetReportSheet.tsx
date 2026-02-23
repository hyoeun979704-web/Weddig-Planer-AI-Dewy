import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { generatePdfHeader, generatePdfFooter, downloadPdf } from "@/lib/pdfGenerator";
import { useBudget } from "@/hooks/useBudget";
import { categories, regions, regionalAverages, type BudgetCategory } from "@/data/budgetData";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { toast } from "sonner";

interface BudgetReportSheetProps {
  open: boolean;
  onClose: () => void;
}

const categoryKeys: BudgetCategory[] = ["venue", "sdm", "ring", "house", "honeymoon", "etc"];

const BudgetReportSheet = ({ open, onClose }: BudgetReportSheetProps) => {
  const { settings, items, summary } = useBudget();
  const { weddingSettings } = useWeddingSchedule();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const totalBudget = settings?.total_budget || 0;
      const regionKey = settings?.region || "seoul";
      const regionLabel = regions[regionKey]?.label || regionKey;
      const avg = regionalAverages[regionKey];
      const catBudgets = (settings?.category_budgets || {}) as Record<BudgetCategory, number>;

      // D-Day
      let daysLeft: number | null = null;
      if (weddingSettings.wedding_date) {
        const diff = Math.ceil((new Date(weddingSettings.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        daysLeft = diff > 0 ? diff : 0;
      }

      const usagePct = totalBudget > 0 ? Math.round((summary.totalSpent / totalBudget) * 100) : 0;

      let html = generatePdfHeader("웨딩 예산 분석 리포트");
      html += `<div class="pdf-subtitle">${regionLabel} 기준 · 생성일 기준</div>`;

      // Summary
      html += `<div class="pdf-section"><div class="pdf-section-title">📊 요약</div>
        <div class="pdf-info-grid">
          <div class="pdf-info-item"><div class="pdf-info-label">총 예산</div><div class="pdf-info-value">${totalBudget.toLocaleString()}만원</div></div>
          <div class="pdf-info-item"><div class="pdf-info-label">총 지출</div><div class="pdf-info-value">${summary.totalSpent.toLocaleString()}만원</div></div>
          <div class="pdf-info-item"><div class="pdf-info-label">남은 예산</div><div class="pdf-info-value">${summary.remaining.toLocaleString()}만원</div></div>
          <div class="pdf-info-item"><div class="pdf-info-label">사용률</div><div class="pdf-info-value" style="color:${usagePct >= 90 ? '#ef4444' : usagePct >= 70 ? '#f59e0b' : '#10b981'}">${usagePct}%</div></div>
          ${daysLeft !== null ? `<div class="pdf-info-item"><div class="pdf-info-label">결혼식까지</div><div class="pdf-info-value">D-${daysLeft}</div></div>` : ""}
        </div></div>`;

      // Category table
      html += `<div class="pdf-section"><div class="pdf-section-title">카테고리별 지출 현황</div>
        <table class="pdf-table"><thead><tr><th>카테고리</th><th>예산</th><th>지출</th><th>사용률</th><th>지역 평균</th><th>평균 대비</th></tr></thead><tbody>`;
      for (const key of categoryKeys) {
        const spent = summary.categoryTotals[key] || 0;
        const budget = catBudgets[key] || 0;
        const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        const avgVal = avg ? (avg as any)[key] : 0;
        const diff = spent - avgVal;
        const diffLabel = diff > 0 ? `+${diff}만원` : diff < 0 ? `${diff}만원` : "동일";
        html += `<tr><td>${categories[key].emoji} ${categories[key].label}</td><td>${budget}만원</td><td>${spent}만원</td><td>${pct}%</td><td>${avgVal}만원</td><td style="color:${diff > 0 ? '#ef4444' : '#10b981'}">${diffLabel}</td></tr>`;
      }
      html += `<tr class="total-row"><td>합계</td><td>${totalBudget}만원</td><td>${summary.totalSpent}만원</td><td>${usagePct}%</td><td>${avg?.total || "-"}만원</td><td></td></tr>`;
      html += `</tbody></table></div>`;

      // Paid-by split
      const paidShared = summary.paidByTotals["shared"] || 0;
      const paidGroom = summary.paidByTotals["groom"] || 0;
      const paidBride = summary.paidByTotals["bride"] || 0;
      if (paidShared + paidGroom + paidBride > 0) {
        html += `<div class="pdf-section"><div class="pdf-section-title">양가 분담 현황</div>
          <table class="pdf-table"><thead><tr><th>구분</th><th>금액</th><th>비율</th></tr></thead><tbody>
          <tr><td>🤝 공동</td><td>${paidShared}만원</td><td>${summary.totalSpent > 0 ? Math.round((paidShared / summary.totalSpent) * 100) : 0}%</td></tr>
          <tr><td>🤵 신랑측</td><td>${paidGroom}만원</td><td>${summary.totalSpent > 0 ? Math.round((paidGroom / summary.totalSpent) * 100) : 0}%</td></tr>
          <tr><td>👰 신부측</td><td>${paidBride}만원</td><td>${summary.totalSpent > 0 ? Math.round((paidBride / summary.totalSpent) * 100) : 0}%</td></tr>
          </tbody></table></div>`;
      }

      // Balance items
      const balanceItems = items.filter(i => i.has_balance && i.balance_amount && i.balance_amount > 0);
      if (balanceItems.length > 0) {
        html += `<div class="pdf-section"><div class="pdf-section-title">잔금 일정</div>
          <table class="pdf-table"><thead><tr><th>항목</th><th>잔금</th><th>납부일</th></tr></thead><tbody>`;
        for (const item of balanceItems) {
          html += `<tr><td>${item.title}</td><td>${item.balance_amount}만원</td><td>${item.balance_due_date || "-"}</td></tr>`;
        }
        html += `</tbody></table></div>`;
      }

      // Tips
      const tips: string[] = [];
      for (const key of categoryKeys) {
        const spent = summary.categoryTotals[key] || 0;
        const avgVal = avg ? (avg as any)[key] : 0;
        if (spent > avgVal * 1.15 && avgVal > 0) {
          tips.push(`${categories[key].label} 지출이 지역 평균보다 ${Math.round(((spent - avgVal) / avgVal) * 100)}% 높아요. 항목을 확인해보세요.`);
        }
      }
      if (usagePct >= 80 && daysLeft && daysLeft > 60) {
        tips.push("현재 지출 속도라면 결혼식 전에 예산이 부족할 수 있어요.");
      }
      if (tips.length === 0) tips.push("전체적으로 예산 관리를 잘 하고 계세요! 👍");

      html += `<div class="pdf-section"><div class="pdf-section-title">💡 AI 진단 및 조언</div>`;
      for (const tip of tips) {
        html += `<div class="pdf-tip">${tip}</div>`;
      }
      html += `</div>`;

      html += generatePdfFooter();

      await downloadPdf(html, `듀이_예산리포트_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF가 다운로드됩니다!");
    } catch (err) {
      console.error(err);
      toast.error("리포트 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  return (
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
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generating ? "생성 중..." : "리포트 PDF 다운로드"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BudgetReportSheet;
