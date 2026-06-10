import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2, Eye } from "lucide-react";
import {
  generatePdfDashboard,
  pdfDashCard,
  pdfDashRow,
  pdfDashShareBars,
  pdfDashMiniDonut,
  pdfDashBigNumber,
  esc,
} from "@/lib/pdfGenerator";
import PdfPreviewModal from "@/components/premium/PdfPreviewModal";
import { useBudget } from "@/hooks/useBudget";
import { computeBudgetFinancials } from "@/lib/budgetReportModel";
import { fmt } from "@/lib/budgetFormat";
import { categories, categoryKeys as ALL_CATEGORY_KEYS, regions, getRegionalAvgWithMeal, type BudgetCategory } from "@/data/budgetData";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { toast } from "sonner";

interface BudgetReportSheetProps {
  open: boolean;
  onClose: () => void;
  visibleCategoryKeys?: BudgetCategory[];
}

const BudgetReportSheet = ({ open, onClose, visibleCategoryKeys }: BudgetReportSheetProps) => {
  const categoryKeys = visibleCategoryKeys ?? ALL_CATEGORY_KEYS;
  const { weddingSettings } = useWeddingSchedule();
  const { settings, items, summary } = useBudget();
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
      const avg = getRegionalAvgWithMeal(regionKey, guestCount);
      const catBudgets = (settings?.category_budgets || {}) as Record<BudgetCategory, number>;

      let daysLeft: number | null = null;
      if (weddingSettings.wedding_date) {
        const diff = Math.ceil((new Date(weddingSettings.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        daysLeft = diff > 0 ? diff : 0;
      }

      const usagePct = totalBudget > 0 ? Math.round((summary.totalSpent / totalBudget) * 100) : 0;

      // 납부완료 vs 미납(잔금) 분리 정산 — 도메인 계층(budgetReportModel)에서 계산.
      // summary.totalSpent 와 fin.totalPaid 는 동일(둘 다 amount 합)하지만, 미납·
      // 당일현금·주체별 미납은 여기서만 나온다.
      const fin = computeBudgetFinancials(items);

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
        ? `${profile.displayName} & ${profile.partnerName}`
        : undefined;
      // ↑ couple은 generatePdfDashboard 헬퍼 내부에서 esc() 처리됨

      // ============ 카테고리별 지출 표 (대시보드 컴팩트 버전) ============
      let catTable = `<table class="pdf-dash-table"><thead><tr><th>카테고리</th><th>예산</th><th>지출</th><th>사용률</th><th>평균대비</th></tr></thead><tbody>`;
      const visibleCats = categoryKeys.filter((k) => (catBudgets[k] || 0) > 0 || (summary.categoryTotals[k] || 0) > 0);
      for (const key of visibleCats.length > 0 ? visibleCats : categoryKeys) {
        const spent = summary.categoryTotals[key] || 0;
        const budget = catBudgets[key] || 0;
        const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
        const avgVal = avg ? (avg as any)[key] : 0;
        const diff = spent - avgVal;
        const diffCls = diff > 0 ? "diff-pos" : diff < 0 ? "diff-neg" : "";
        const diffLabel = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "0";
        catTable += `<tr>
          <td>${categories[key].label}</td>
          <td>${budget}</td>
          <td>${spent}</td>
          <td>${pct}%</td>
          <td class="${diffCls}">${diffLabel}만원</td>
        </tr>`;
      }
      catTable += `<tr class="total"><td>합계</td><td>${totalBudget}</td><td>${summary.totalSpent}</td><td>${usagePct}%</td><td></td></tr></tbody></table>`;

      // ============ 카테고리별 지출 비중 (막대) ============
      const totalSpentForShare = summary.totalSpent || 1;
      const shareBars = pdfDashShareBars(
        (visibleCats.length > 0 ? visibleCats : categoryKeys.slice(0, 6))
          .filter((k) => (summary.categoryTotals[k] || 0) > 0)
          .sort((a, b) => (summary.categoryTotals[b] || 0) - (summary.categoryTotals[a] || 0))
          .slice(0, 8)
          .map((k) => ({
            label: categories[k].label,
            pct: ((summary.categoryTotals[k] || 0) / totalSpentForShare) * 100,
          })),
      );

      // ============ 잔금 일정 ============
      const balanceItems = items
        .filter((i) => i.has_balance && i.balance_amount && i.balance_amount > 0)
        .sort((a, b) => {
          const da = a.balance_due_date ? new Date(a.balance_due_date).getTime() : Infinity;
          const db = b.balance_due_date ? new Date(b.balance_due_date).getTime() : Infinity;
          return da - db;
        });
      const totalBalance = balanceItems.reduce((s, i) => s + (i.balance_amount || 0), 0);
      let balanceCardBody = "";
      if (balanceItems.length > 0) {
        balanceCardBody = `<div style="display:flex;gap:14px;margin-bottom:10px;">
          <div style="flex:1;background:#fef8fa;border-radius:8px;padding:10px 12px;">
            <div style="font-size:9px;color:#9ca3af;letter-spacing:0.3px;text-transform:uppercase;font-family:'Cormorant Garamond',serif;">납부 예정</div>
            <div style="font-size:18px;font-weight:700;color:#1f2937;font-family:'Cormorant Garamond',serif;">${balanceItems.length}건</div>
          </div>
          <div style="flex:1;background:#fef8fa;border-radius:8px;padding:10px 12px;">
            <div style="font-size:9px;color:#9ca3af;letter-spacing:0.3px;text-transform:uppercase;font-family:'Cormorant Garamond',serif;">잔금 총액</div>
            <div style="font-size:18px;font-weight:700;color:#be185d;font-family:'Cormorant Garamond',serif;">${totalBalance.toLocaleString()}만원</div>
          </div>
        </div>`;
        balanceCardBody += `<table class="pdf-dash-table"><tbody>`;
        for (const item of balanceItems.slice(0, 5)) {
          balanceCardBody += `<tr>
            <td style="font-size:9.5px;color:#9ca3af;width:70px;">${esc(item.balance_due_date || "-")}</td>
            <td>${esc(item.title)}</td>
            <td style="text-align:right;font-weight:600;color:#be185d;">${esc(item.balance_amount)}만원</td>
          </tr>`;
        }
        balanceCardBody += `</tbody></table>`;
      } else {
        balanceCardBody = `<div style="font-size:10.5px;color:#9ca3af;text-align:center;padding:20px 0;">예정된 잔금이 없어요.</div>`;
      }

      // ============ 양가 분담 도넛 (납부+미납 = 총 배정 기준) ============
      // 기존엔 납부분만 도넛에 넣어 "누가 얼마 부담하는가"가 미납을 누락한 채
      // 왜곡됐다. 이제 총액(납부+미납)으로 분담 비중을 보이고, 납부/미납 진척을
      // 표로 함께 노출한다(마스터 리포트 payer_breakdown 대응).
      const payerRows: { key: "shared" | "groom" | "bride"; label: string; color: string }[] = [
        { key: "shared", label: "공동", color: "#F4A7B9" },
        { key: "groom", label: "신랑측", color: "#93c5fd" },
        { key: "bride", label: "신부측", color: "#fb7185" },
      ];
      const splitCardBody = fin.grandTotal > 0
        ? pdfDashMiniDonut(
            payerRows.map((r) => ({ label: r.label, value: fin.payers[r.key].total, color: r.color })),
          ) + `<table class="pdf-dash-table" style="margin-top:10px;"><thead><tr>
                <th>주체</th><th style="text-align:right;">납부</th><th style="text-align:right;">미납</th><th style="text-align:right;">합계</th>
              </tr></thead><tbody>${payerRows
                .map((r) => {
                  const p = fin.payers[r.key];
                  return `<tr>
                    <td>${r.label}</td>
                    <td style="text-align:right;">${fmt(p.paid)}</td>
                    <td style="text-align:right;color:#be185d;">${fmt(p.pending)}</td>
                    <td style="text-align:right;font-weight:600;">${fmt(p.total)}</td>
                  </tr>`;
                })
                .join("")}</tbody></table>`
        : `<div style="font-size:10.5px;color:#9ca3af;text-align:center;padding:20px 0;">분담 데이터가 없어요.</div>`;

      // ============ 결제 진행 현황 (총액·납부·미납·당일현금) ============
      const paymentProgressBody = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${[
          { label: "총 정산액", value: fin.grandTotal, color: "#1f2937" },
          { label: "납부 완료", value: fin.totalPaid, color: "#059669" },
          { label: "미납 잔금", value: fin.totalPending, color: "#be185d" },
          { label: "당일 현금", value: fin.cashNeeded, color: "#b45309" },
        ]
          .map(
            (s) => `<div style="background:#fef8fa;border-radius:8px;padding:10px 12px;">
              <div style="font-size:9px;color:#9ca3af;letter-spacing:0.3px;text-transform:uppercase;font-family:'Cormorant Garamond',serif;">${s.label}</div>
              <div style="font-size:17px;font-weight:700;color:${s.color};font-family:'Cormorant Garamond',serif;">${fmt(s.value)}<span style="font-size:10px;color:#9ca3af;font-weight:500;">만원</span></div>
            </div>`,
          )
          .join("")}
      </div>`;

      // ============ 예산 건강도 큰 숫자 ============
      const healthIconBg = healthScore >= 70 ? "#d4f4e2" : healthScore >= 55 ? "#fff4d6" : "#fde2e9";
      const healthIcon = "";  // 이모지 제거 — 큰 숫자만 강조
      const healthBigNumber = pdfDashBigNumber({
        icon: healthIcon,
        iconBg: healthIconBg,
        value: String(healthScore),
        suffix: "점",
        label: healthLabel,
      });

      // ============ 진단 및 조언 ============
      const insights: string[] = [];
      const warningInsights: string[] = [];
      for (const key of categoryKeys) {
        const spent = summary.categoryTotals[key] || 0;
        const budget = catBudgets[key] || 0;
        const avgVal = avg ? (avg as any)[key] : 0;
        if (budget > 0 && spent > budget) {
          warningInsights.push(`${categories[key].label} 예산 ${spent - budget}만원 초과`);
        } else if (avgVal > 0 && spent > avgVal * 1.15) {
          insights.push(`${categories[key].label} 지출이 평균보다 ${Math.round(((spent - avgVal) / avgVal) * 100)}% 높음`);
        } else if (avgVal > 0 && spent > 0 && spent < avgVal * 0.7) {
          insights.push(`${categories[key].label} 평균 대비 ${Math.round(((avgVal - spent) / avgVal) * 100)}% 절약 중`);
        }
      }
      if (overPace) {
        warningInsights.push(`${daysLeft}일 남았는데 예산 ${usagePct}% 사용 — 페이스 조절 필요`);
      }
      if (insights.length === 0 && warningInsights.length === 0) {
        insights.push("전체적으로 평균 범위 안에서 잘 관리되고 있어요.");
      }
      const insightBody = [...warningInsights, ...insights].slice(0, 4).join(" · ");

      // ============ 대시보드 조립 ============
      const body = ""
        + pdfDashRow([
            pdfDashCard("결제 진행 현황", paymentProgressBody),
            pdfDashCard("예산 건강도", healthBigNumber),
          ], 3)
        + pdfDashRow([
            pdfDashCard("카테고리별 지출 현황", catTable),
            pdfDashCard("카테고리별 지출 비중", shareBars),
          ], 3)
        + pdfDashRow([
            pdfDashCard("잔금 일정", balanceCardBody),
            pdfDashCard("양가 분담 현황", splitCardBody),
          ], 2);

      const html = generatePdfDashboard({
        brandName: "Dewy Wedding Planner",
        brandTag: "Wedding Document",
        weddingDate: profile.weddingDate ? profile.weddingDate.replace(/-/g, ".") : undefined,
        title: "웨딩 예산 분석 리포트",
        description: `${couple ? `${couple}  ·  ` : ""}${regionLabel} 평균 대비 두 분의 예산·지출을 분석한 맞춤 리포트입니다.`,
        pills: [
          { icon: "", label: "지역", value: regionLabel },
          { icon: "", label: "총 예산", value: `${totalBudget.toLocaleString()}만원` },
          { icon: "", label: "하객 수", value: `${guestCount}명` },
          { icon: "", label: "기록 수", value: `${items.length}건` },
        ],
        stats: [
          { tone: "pink", icon: "", value: `${usagePct}%`, label: "예산 사용률" },
          { tone: "amber", icon: "", value: `${summary.totalSpent.toLocaleString()}`, label: "총 지출 (만원)" },
          { tone: "mint", icon: "", value: daysLeft !== null ? `D-${daysLeft}` : "—", label: daysLeft !== null ? "결혼식까지" : "예식일 미설정" },
        ],
        body,
        insight: { title: "진단 및 조언", body: insightBody },
      });

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
          <SheetTitle>예산 분석 리포트</SheetTitle>
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
