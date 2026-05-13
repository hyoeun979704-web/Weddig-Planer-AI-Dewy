import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { generatePdfHeader, generatePdfFooter, downloadPdf } from "@/lib/pdfGenerator";
import { regions, regionalAverages, categories, savingTips, type BudgetCategory } from "@/data/budgetData";
import { toast } from "sonner";

interface EstimateSheetProps {
  open: boolean;
  onClose: () => void;
}

const styleOptions = ["클래식", "모던", "내추럴", "럭셔리", "스몰웨딩"];
const priorityOptions: { value: BudgetCategory | "value"; label: string }[] = [
  { value: "venue", label: "웨딩홀" },
  { value: "sdm", label: "스드메" },
  { value: "honeymoon", label: "허니문" },
  { value: "house", label: "혼수" },
  { value: "value", label: "가성비" },
];

const CATEGORY_ORDER: BudgetCategory[] = ["venue", "sdm", "ring", "house", "honeymoon", "etc"];

const STYLE_MULTIPLIER: Record<string, number> = {
  클래식: 1.0,
  모던: 1.05,
  내추럴: 0.95,
  럭셔리: 1.25,
  스몰웨딩: 0.75,
};

const HIDDEN_COSTS: Record<BudgetCategory, string[]> = {
  venue: ["주차비", "포토존 추가 사용료", "세팅비", "추가 시간 연장료"],
  sdm: ["원본 데이터", "헬퍼비", "얼리스타트비", "앨범 추가 페이지"],
  ring: ["반지 사이즈 조정/각인", "예단 답례품", "함값"],
  house: ["설치/배송비", "폐가전 처리비", "리모델링 추가 자재비"],
  honeymoon: ["여행자보험", "유류할증료", "리조트 데이베드/액티비티 비용"],
  etc: ["청첩장 인쇄 추가", "답례품 포장비", "사회자 사례금"],
};

interface EstimateCategoryRow {
  key: BudgetCategory;
  name: string;
  emoji: string;
  min: number;
  max: number;
  recommended: number;
  items: string[];
  hiddenCosts: string[];
  tip: string;
}

interface EstimateResult {
  rows: EstimateCategoryRow[];
  totalMin: number;
  totalMax: number;
  totalRecommended: number;
  savingTips: string[];
}

const buildEstimate = (
  regionKey: string,
  guestCount: number,
  totalBudget: number,
  styles: string[],
  priorities: string[],
): EstimateResult => {
  const avg = regionalAverages[regionKey] ?? regionalAverages.seoul;
  const styleMult = styles.length === 0
    ? 1
    : styles.reduce((acc, s) => acc + (STYLE_MULTIPLIER[s] ?? 1), 0) / styles.length;

  const isFrugal = priorities.includes("value");
  const frugalMult = isFrugal ? 0.9 : 1;

  // Adjust venue cost by actual guest count (region avg assumes ~200 guests)
  const guestRatio = guestCount / 200;

  // Base recommended per category from regional average, adjusted by style & guest count
  const baseRecommended: Record<BudgetCategory, number> = {
    venue: Math.round(avg.venue * styleMult * frugalMult * (0.6 + 0.4 * guestRatio)),
    sdm: Math.round(avg.sdm * styleMult * frugalMult),
    ring: Math.round(avg.ring * styleMult * frugalMult),
    house: Math.round(avg.house * styleMult * frugalMult),
    honeymoon: Math.round(avg.honeymoon * styleMult * frugalMult),
    etc: Math.round(avg.etc * styleMult * frugalMult),
  };

  // Boost priorities by +12% each (max 2)
  const priorityCats = priorities.filter((p): p is BudgetCategory => p !== "value") as BudgetCategory[];
  for (const cat of priorityCats) {
    baseRecommended[cat] = Math.round(baseRecommended[cat] * 1.12);
  }

  // Scale to fit user's total budget (proportional)
  const baseTotal = Object.values(baseRecommended).reduce((a, b) => a + b, 0);
  const scale = baseTotal > 0 ? totalBudget / baseTotal : 1;
  const scaled: Record<BudgetCategory, number> = { ...baseRecommended };
  for (const cat of CATEGORY_ORDER) {
    scaled[cat] = Math.round(baseRecommended[cat] * scale);
  }

  // Fix rounding drift so the sum exactly matches totalBudget
  const drift = totalBudget - Object.values(scaled).reduce((a, b) => a + b, 0);
  scaled.etc += drift;

  const rows: EstimateCategoryRow[] = CATEGORY_ORDER.map((key) => {
    const recommended = scaled[key];
    const min = Math.round(recommended * 0.85);
    const max = Math.round(recommended * 1.2);
    const tipPool = savingTips[key];
    return {
      key,
      name: categories[key].label,
      emoji: categories[key].emoji,
      min,
      max,
      recommended,
      items: categories[key].sub_items.slice(0, 5),
      hiddenCosts: HIDDEN_COSTS[key],
      tip: tipPool[0] ?? "",
    };
  });

  const totalMin = rows.reduce((s, r) => s + r.min, 0);
  const totalMax = rows.reduce((s, r) => s + r.max, 0);
  const totalRecommended = rows.reduce((s, r) => s + r.recommended, 0);

  // Pick top 5 saving tips, prioritizing user's priority categories
  const tipOrder: BudgetCategory[] = [
    ...priorityCats,
    ...CATEGORY_ORDER.filter((c) => !priorityCats.includes(c)),
  ];
  const collected: string[] = [];
  for (const cat of tipOrder) {
    const t = savingTips[cat][0];
    if (t && !collected.includes(t)) collected.push(t);
    if (collected.length >= 5) break;
  }

  return { rows, totalMin, totalMax, totalRecommended, savingTips: collected };
};

const buildEstimateHtml = (params: {
  regionLabel: string;
  guestCount: number;
  totalBudget: number;
  styles: string[];
  estimate: EstimateResult;
  regionNote: string;
}): string => {
  const { regionLabel, guestCount, totalBudget, styles, estimate, regionNote } = params;

  let html = generatePdfHeader("맞춤 웨딩 견적서");
  html += `<div class="pdf-subtitle">${regionLabel} · ${guestCount}명 · ${totalBudget.toLocaleString()}만원${
    styles.length ? ` · ${styles.join(", ")}` : ""
  }</div>`;

  html += `<div class="pdf-info-grid">
    <div class="pdf-info-item"><div class="pdf-info-label">지역</div><div class="pdf-info-value">${regionLabel}</div></div>
    <div class="pdf-info-item"><div class="pdf-info-label">하객 수</div><div class="pdf-info-value">${guestCount}명</div></div>
    <div class="pdf-info-item"><div class="pdf-info-label">총 예산</div><div class="pdf-info-value">${totalBudget.toLocaleString()}만원</div></div>
    <div class="pdf-info-item"><div class="pdf-info-label">선호 스타일</div><div class="pdf-info-value">${styles.join(", ") || "-"}</div></div>
  </div>`;

  html += `<div class="pdf-section"><div class="pdf-section-title">카테고리별 예상 비용</div>
    <table class="pdf-table"><thead><tr><th>카테고리</th><th>최소</th><th>최대</th><th>추천 배분</th></tr></thead><tbody>`;
  for (const row of estimate.rows) {
    html += `<tr><td>${row.emoji} ${row.name}</td><td>${row.min.toLocaleString()}만원</td><td>${row.max.toLocaleString()}만원</td><td><strong>${row.recommended.toLocaleString()}만원</strong></td></tr>`;
  }
  html += `<tr class="total-row"><td>합계</td><td>${estimate.totalMin.toLocaleString()}만원</td><td>${estimate.totalMax.toLocaleString()}만원</td><td><strong>${estimate.totalRecommended.toLocaleString()}만원</strong></td></tr>`;
  html += `</tbody></table></div>`;

  if (regionNote) {
    html += `<div class="pdf-tip">📍 <strong>${regionLabel} 시장 메모:</strong> ${regionNote}</div>`;
  }

  for (const row of estimate.rows) {
    html += `<div class="pdf-section"><div class="pdf-section-title">${row.emoji} ${row.name} 상세</div>`;
    html += `<p style="font-size:12px;margin-bottom:4px;"><strong>포함 항목:</strong> ${row.items.join(", ")}</p>`;
    html += `<div class="pdf-warning">⚠️ <strong>숨겨진 추가금 체크:</strong> ${row.hiddenCosts.join(", ")}</div>`;
    if (row.tip) html += `<div class="pdf-tip">💡 ${row.tip}</div>`;
    html += `</div>`;
  }

  if (estimate.savingTips.length > 0) {
    html += `<div class="pdf-section"><div class="pdf-section-title">💰 우선순위 기반 절약 포인트</div><ul class="pdf-checklist">`;
    for (const tip of estimate.savingTips) html += `<li>${tip}</li>`;
    html += `</ul></div>`;
  }

  html += `<div class="pdf-highlight" style="font-size:11px;color:#666;">
    <strong>⚠️ 주의사항</strong><br/>
    • 이 견적서는 지역 평균 데이터 기반으로 산출한 참고용 자료입니다<br/>
    • 실제 비용은 업체별, 시즌별, 옵션별로 크게 달라질 수 있어요<br/>
    • 계약 전 반드시 업체에 정확한 견적을 요청하세요
  </div>`;

  html += generatePdfFooter();
  return html;
};

const EstimateSheet = ({ open, onClose }: EstimateSheetProps) => {
  const [step, setStep] = useState<"input" | "loading" | "preview">("input");
  const [region, setRegion] = useState("seoul");
  const [guestCount, setGuestCount] = useState(200);
  const [totalBudget, setTotalBudget] = useState(3000);
  const [styles, setStyles] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [htmlResult, setHtmlResult] = useState("");
  const [summary, setSummary] = useState<{ recommended: number; min: number; max: number } | null>(null);

  const toggleChip = (arr: string[], val: string, setter: (v: string[]) => void, max?: number) => {
    if (arr.includes(val)) setter(arr.filter(v => v !== val));
    else if (!max || arr.length < max) setter([...arr, val]);
  };

  const handleGenerate = () => {
    setStep("loading");
    // Brief delay so users feel the "generation" without an actual API roundtrip.
    setTimeout(() => {
      try {
        const estimate = buildEstimate(region, guestCount, totalBudget, styles, priorities);
        const regionLabel = regions[region]?.label || region;
        const regionNote = regionalAverages[region]?.note ?? "";
        const html = buildEstimateHtml({ regionLabel, guestCount, totalBudget, styles, estimate, regionNote });
        setHtmlResult(html);
        setSummary({
          recommended: estimate.totalRecommended,
          min: estimate.totalMin,
          max: estimate.totalMax,
        });
        setStep("preview");
      } catch (err) {
        console.error("Estimate generation error:", err);
        toast.error("견적서 생성에 실패했습니다. 다시 시도해주세요.");
        setStep("input");
      }
    }, 400);
  };

  const handleDownload = () => {
    downloadPdf(htmlResult, `듀이_견적서_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF가 다운로드됩니다!");
  };

  const handleClose = () => {
    setStep("input");
    setHtmlResult("");
    setSummary(null);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>📋 맞춤 견적서 자동생성</SheetTitle>
        </SheetHeader>

        {step === "input" && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">지역</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-none outline-none">
                {Object.entries(regions).map(([key, r]) => (
                  <option key={key} value={key}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">예상 하객 수</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setGuestCount(Math.max(50, guestCount - 50))} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg font-bold">−</button>
                <span className="text-lg font-bold text-foreground flex-1 text-center">{guestCount}명</span>
                <button onClick={() => setGuestCount(Math.min(500, guestCount + 50))} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg font-bold">+</button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">총 예산 (만원)</label>
              <input type="number" value={totalBudget} onChange={(e) => setTotalBudget(Number(e.target.value))} className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-none outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">선호 스타일</label>
              <div className="flex flex-wrap gap-2">
                {styleOptions.map((s) => (
                  <button key={s} onClick={() => toggleChip(styles, s, setStyles)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${styles.includes(s) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">우선순위 (최대 2개)</label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((p) => (
                  <button key={p.value} onClick={() => toggleChip(priorities, p.value, setPriorities, 2)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${priorities.includes(p.value) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{p.label}</button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerate} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm">
              견적서 생성하기
            </button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium text-foreground">맞춤 견적을 계산하고 있어요...</p>
            <p className="text-xs text-muted-foreground mt-1">지역 평균과 우선순위를 반영해요</p>
          </div>
        )}

        {step === "preview" && (
          <div className="mt-4">
            <div className="bg-muted rounded-2xl p-4 mb-4">
              <div className="text-center py-4">
                <span className="text-4xl">📄</span>
                <p className="text-sm font-medium text-foreground mt-2">견적서가 준비되었어요!</p>
                <p className="text-xs text-muted-foreground mt-1">{regions[region]?.label} · {guestCount}명 · {totalBudget.toLocaleString()}만원</p>
                {summary && (
                  <p className="text-xs text-muted-foreground mt-2">
                    예상 범위 <strong className="text-foreground">{summary.min.toLocaleString()}~{summary.max.toLocaleString()}만원</strong>
                  </p>
                )}
              </div>
            </div>
            <button onClick={handleDownload} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> PDF 다운로드
            </button>
            <button onClick={() => { setStep("input"); setHtmlResult(""); setSummary(null); }} className="w-full py-2.5 text-sm text-muted-foreground mt-2">
              다시 만들기
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default EstimateSheet;
