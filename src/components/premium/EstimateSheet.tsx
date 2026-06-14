import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { Loader2, Eye, Sparkles } from "lucide-react";
import { generatePdfHeader, generatePdfFooter } from "@/lib/pdfGenerator";
import PdfPreviewModal from "@/components/premium/PdfPreviewModal";
import { regions, regionalAverages, categories, savingTips, type BudgetCategory } from "@/data/budgetData";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { WEDDING_STYLE_LABEL, type WeddingStyle } from "@/lib/weddingStyle";
import {
  type GuestAgeMix,
  type VenueGrade,
  GUEST_AGE_MIX_LABEL,
  GUEST_AGE_MIX_HINT,
  VENUE_GRADE_LABEL,
  VENUE_GRADE_MEAL_FACTOR,
  VENUE_GRADE_VENUE_FACTOR,
  HALL_FOOD_RECOMMENDATION,
} from "@/lib/pdfPhrasings";
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

const CATEGORY_ORDER: BudgetCategory[] = [
  "venue", "meal", "sdm", "suit", "hanbok", "ring", "meetup", "house", "honeymoon", "etc",
];

// Categories that go to ~0 cost for each style. We still show them in the
// table so users see the savings they're getting, but mark them as
// "직접 진행" or "생략" in the tip column.
const STYLE_SKIPPED_CATEGORIES: Record<WeddingStyle, BudgetCategory[]> = {
  general: [],
  small: ["hanbok"],         // 스몰웨딩은 한복 생략 빈도 높음
  self: ["sdm", "hanbok"],   // 셀프웨딩은 스튜디오·드레스·메이크업·한복 모두 직접/생략
  custom: [],
};

// Wedding style multiplier on top of the user-selected style chips.
// Reflects that self/small weddings cost meaningfully less overall.
const WEDDING_STYLE_BUDGET_FACTOR: Record<WeddingStyle, number> = {
  general: 1.0,
  small: 0.72,
  self: 0.55,
  custom: 1.0,
};

const STYLE_MULTIPLIER: Record<string, number> = {
  클래식: 1.0,
  모던: 1.05,
  내추럴: 0.95,
  럭셔리: 1.25,
  스몰웨딩: 0.75,
};

const HIDDEN_COSTS: Record<BudgetCategory, string[]> = {
  venue: ["대관료 외 세팅비", "포토존 추가 사용료", "추가 시간 연장료", "주차비"],
  meal: ["주류·음료 추가", "어린이/유아 식대", "보증 인원 미달 위약금"],
  sdm: ["원본 데이터", "헬퍼비", "얼리스타트비", "앨범 추가 페이지"],
  suit: ["수선비", "보타이/포켓스퀘어", "구두 별도"],
  hanbok: ["폐백 한복 추가", "한복 헬퍼비", "노리개·비녀 등 소품"],
  ring: ["반지 사이즈 조정/각인", "예단 답례품", "함값"],
  meetup: ["식사비", "선물비", "교통비"],
  house: ["설치/배송비", "폐가전 처리비", "리모델링 추가 자재비"],
  honeymoon: ["여행자보험", "유류할증료", "리조트 데이베드/액티비티"],
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
  weddingStyle: WeddingStyle = "general",
  venueGrade: VenueGrade = "standard",
): EstimateResult => {
  const avg = regionalAverages[regionKey] ?? regionalAverages.seoul;
  const styleMult = styles.length === 0
    ? 1
    : styles.reduce((acc, s) => acc + (STYLE_MULTIPLIER[s] ?? 1), 0) / styles.length;

  const isFrugal = priorities.includes("value");
  const frugalMult = isFrugal ? 0.9 : 1;
  const weddingStyleFactor = WEDDING_STYLE_BUDGET_FACTOR[weddingStyle] ?? 1;
  const skippedCats = new Set(STYLE_SKIPPED_CATEGORIES[weddingStyle] ?? []);

  // 식대: 인당 단가 × 인원 × 장소 등급 × 스타일/검약 가중치
  // 지역 평균의 per_guest_meal(만원/인) × 가중치를 사용해 22명/400명 어떤 규모도 정상 반영
  const perGuestMealCost = avg.per_guest_meal * VENUE_GRADE_MEAL_FACTOR[venueGrade] * styleMult * frugalMult * weddingStyleFactor;
  const totalMealCost = Math.round(perGuestMealCost * guestCount);
  // 대관료: 새 스키마에서는 avg.venue 자체가 대관료(식대 제외) + 등급 곱
  const venueRent = Math.round(avg.venue * VENUE_GRADE_VENUE_FACTOR[venueGrade] * styleMult * frugalMult * weddingStyleFactor);
  const baseFactor = styleMult * frugalMult * weddingStyleFactor;

  // Base recommended per category - 새 10개 카테고리 스키마
  const baseRecommended: Record<BudgetCategory, number> = {
    venue: venueRent,
    meal: totalMealCost,
    sdm: Math.round(avg.sdm * baseFactor),
    suit: Math.round(avg.suit * baseFactor),
    hanbok: Math.round(avg.hanbok * baseFactor),
    ring: Math.round(avg.ring * baseFactor),
    meetup: Math.round(avg.meetup * baseFactor),
    house: Math.round(avg.house * baseFactor),
    honeymoon: Math.round(avg.honeymoon * baseFactor),
    etc: Math.round(avg.etc * baseFactor),
  };

  // Self-wedding handles SDM themselves → keep a token DIY budget instead of zero
  for (const skipped of skippedCats) {
    baseRecommended[skipped] = Math.max(20, Math.round(baseRecommended[skipped] * 0.1));
  }

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
    const isSkipped = skippedCats.has(key);
    const min = isSkipped ? Math.round(recommended * 0.5) : Math.round(recommended * 0.85);
    const max = isSkipped ? Math.round(recommended * 1.5) : Math.round(recommended * 1.2);
    const tipPool = savingTips[key];
    const selfWeddingNote = weddingStyle === "self" && key === "sdm"
      ? "직접 진행 (장비 대여·인화비 등 실비)"
      : "";
    return {
      key,
      name: categories[key].label,
      emoji: categories[key].emoji,
      min,
      max,
      recommended,
      items: isSkipped ? ["DIY 진행"] : categories[key].sub_items.slice(0, 5),
      hiddenCosts: HIDDEN_COSTS[key],
      tip: selfWeddingNote || tipPool[0] || "",
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
  weddingStyle: WeddingStyle;
  guestAgeMix: GuestAgeMix;
  venueGrade: VenueGrade;
  couple?: string;
  weddingDate?: string;
}): string => {
  const { regionLabel, guestCount, totalBudget, styles, estimate, regionNote, weddingStyle, guestAgeMix, venueGrade, couple, weddingDate } = params;

  let html = generatePdfHeader(
    "맞춤 웨딩 견적서",
    `${regionLabel} · ${guestCount}명 · ${totalBudget.toLocaleString()}만원${styles.length ? ` · ${styles.join(", ")}` : ""}`,
    { couple, weddingDate, styleLabel: WEDDING_STYLE_LABEL[weddingStyle] },
  );

  html += `<div class="pdf-info-grid">
    <div class="pdf-info-item"><div class="pdf-info-label">지역</div><div class="pdf-info-value">${regionLabel}</div></div>
    <div class="pdf-info-item"><div class="pdf-info-label">하객 수</div><div class="pdf-info-value">${guestCount}명</div></div>
    <div class="pdf-info-item"><div class="pdf-info-label">총 예산</div><div class="pdf-info-value">${totalBudget.toLocaleString()}만원</div></div>
    <div class="pdf-info-item"><div class="pdf-info-label">장소 등급</div><div class="pdf-info-value">${VENUE_GRADE_LABEL[venueGrade]}</div></div>
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

  // Style-specific guidance block
  const styleGuidance: Record<WeddingStyle, string> = {
    general: "표준 결혼식 기준의 견적입니다. 양가 상견례 합의 후 카테고리별 우선순위를 명확히 정하세요.",
    small: "30~80명 소규모 기준입니다. 식대 단가가 일반 결혼식보다 높을 수 있으니 인당 식대를 꼭 확인하세요. 청첩장은 모바일 위주 권장.",
    self: "스튜디오·드레스·메이크업을 직접 진행하는 구성입니다. SDM 행은 장비 대여·인화·소품 등 실비 기준이에요. 시간과 인력이 가장 큰 비용이라는 점을 잊지 마세요.",
    custom: "직접 선택한 구성에 맞춘 견적입니다.",
  };
  if (styleGuidance[weddingStyle]) {
    html += `<div class="pdf-note">💡 <strong>${WEDDING_STYLE_LABEL[weddingStyle]} 가이드:</strong> ${styleGuidance[weddingStyle]}</div>`;
  }

  // 하객 연령 비중 기반 식사 추천
  const food = HALL_FOOD_RECOMMENDATION[guestAgeMix];
  html += `<div class="pdf-section"><div class="pdf-section-title">🍽️ ${GUEST_AGE_MIX_LABEL[guestAgeMix]} 기준 식사 추천</div>
    <div class="pdf-info-grid">
      <div class="pdf-info-item"><div class="pdf-info-label">추천 메뉴</div><div class="pdf-info-value">${food.recommend}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">단가 메모</div><div class="pdf-info-value">${food.priceNote}</div></div>
    </div>
    <p style="font-size:11.5px;color:#374151;line-height:1.6;">${food.reason}</p>
  </div>`;

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
  const profile = useWeddingProfile();
  const [step, setStep] = useState<"input" | "loading">("input");
  const [region, setRegion] = useState("seoul");
  const [guestCount, setGuestCount] = useState(200);
  const [totalBudget, setTotalBudget] = useState(3000);
  const [styles, setStyles] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [guestAgeMix, setGuestAgeMix] = useState<GuestAgeMix>("balanced");
  const [venueGrade, setVenueGrade] = useState<VenueGrade>("standard");
  const [htmlResult, setHtmlResult] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);

  // Prefill from registered budget/wedding info once loaded
  useEffect(() => {
    if (!open || prefillApplied || !profile.isLoaded) return;
    if (profile.region && regions[profile.region]) setRegion(profile.region);
    if (profile.totalBudget > 0) setTotalBudget(profile.totalBudget);
    if (profile.guestCount > 0) setGuestCount(profile.guestCount);
    setPrefillApplied(true);
  }, [open, prefillApplied, profile]);

  // Reset prefill flag when sheet closes so it reapplies next open
  useEffect(() => {
    if (!open) setPrefillApplied(false);
  }, [open]);

  const hasPrefill = profile.isLoaded && (profile.totalBudget > 0 || (profile.region && profile.region !== "seoul"));

  const toggleChip = (arr: string[], val: string, setter: (v: string[]) => void, max?: number) => {
    if (arr.includes(val)) setter(arr.filter(v => v !== val));
    else if (!max || arr.length < max) setter([...arr, val]);
  };

  const handleGenerate = () => {
    setStep("loading");
    // Brief delay so users feel the "generation" without an actual API roundtrip.
    setTimeout(() => {
      try {
        const estimate = buildEstimate(region, guestCount, totalBudget, styles, priorities, profile.weddingStyle, venueGrade);
        const regionLabel = regions[region]?.label || region;
        const regionNote = regionalAverages[region]?.note ?? "";
        const couple = profile.displayName && profile.partnerName
          ? `${profile.displayName} ♥ ${profile.partnerName}`
          : undefined;
        const html = buildEstimateHtml({
          regionLabel, guestCount, totalBudget, styles, estimate, regionNote,
          weddingStyle: profile.weddingStyle,
          guestAgeMix,
          venueGrade,
          couple,
          weddingDate: profile.weddingDate || undefined,
        });
        setHtmlResult(html);
        setStep("input");
        setPreviewOpen(true);
      } catch (err) {
        console.error("Estimate generation error:", err);
        toast.error("견적서 생성에 실패했습니다. 다시 시도해주세요.");
        setStep("input");
      }
    }, 400);
  };

  const handleClose = () => {
    setStep("input");
    setHtmlResult("");
    setPreviewOpen(false);
    onClose();
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="app-col mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>맞춤 견적서 자동생성</SheetTitle>
        </SheetHeader>

        {step === "input" && (
          <div className="mt-4 space-y-4">
            {hasPrefill && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-primary leading-relaxed">
                  예산 페이지에 등록된 정보를 자동으로 불러왔어요. 필요하면 수정해주세요.
                </p>
              </div>
            )}
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
              <label className="text-sm font-medium text-foreground mb-1.5 block">예식 장소 등급</label>
              <select
                value={venueGrade}
                onChange={(e) => setVenueGrade(e.target.value as VenueGrade)}
                className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-none outline-none"
              >
                {(Object.keys(VENUE_GRADE_LABEL) as VenueGrade[]).map((key) => (
                  <option key={key} value={key}>{VENUE_GRADE_LABEL[key]}</option>
                ))}
              </select>
              <p className="text-[10.5px] text-muted-foreground mt-1 leading-snug">
                {venueGrade === "luxury" ? "인당 식대 12~18만원 기준" : venueGrade === "premium" ? "인당 식대 8~12만원 기준" : "인당 식대 5~7만원 기준"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">하객 연령 비중</label>
              <select
                value={guestAgeMix}
                onChange={(e) => setGuestAgeMix(e.target.value as GuestAgeMix)}
                className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-none outline-none"
              >
                {(Object.keys(GUEST_AGE_MIX_LABEL) as GuestAgeMix[]).map((key) => (
                  <option key={key} value={key}>{GUEST_AGE_MIX_LABEL[key]}</option>
                ))}
              </select>
              <p className="text-[10.5px] text-muted-foreground mt-1 leading-snug">{GUEST_AGE_MIX_HINT[guestAgeMix]}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">우선순위 (최대 2개)</label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((p) => (
                  <button key={p.value} onClick={() => toggleChip(priorities, p.value, setPriorities, 2)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${priorities.includes(p.value) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{p.label}</button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerate} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" /> 견적서 미리보기
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

      </SheetContent>
    </Sheet>

    <PdfPreviewModal
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      html={htmlResult}
      filename={`듀이_견적서_${new Date().toISOString().split("T")[0]}.pdf`}
      title="맞춤 웨딩 견적서 미리보기"
    />
    </>
  );
};

export default EstimateSheet;
