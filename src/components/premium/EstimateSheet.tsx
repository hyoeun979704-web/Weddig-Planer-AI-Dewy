import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { generatePdfHeader, generatePdfFooter, downloadPdf } from "@/lib/pdfGenerator";
import { regions } from "@/data/budgetData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EstimateSheetProps {
  open: boolean;
  onClose: () => void;
}

const styleOptions = ["클래식", "모던", "내추럴", "럭셔리", "스몰웨딩"];
const priorityOptions = ["웨딩홀", "스드메", "허니문", "혼수", "가성비"];

const EstimateSheet = ({ open, onClose }: EstimateSheetProps) => {
  const [step, setStep] = useState<"input" | "loading" | "preview">("input");
  const [region, setRegion] = useState("seoul");
  const [guestCount, setGuestCount] = useState(200);
  const [totalBudget, setTotalBudget] = useState(3000);
  const [styles, setStyles] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [htmlResult, setHtmlResult] = useState("");

  const toggleChip = (arr: string[], val: string, setter: (v: string[]) => void, max?: number) => {
    if (arr.includes(val)) setter(arr.filter(v => v !== val));
    else if (!max || arr.length < max) setter([...arr, val]);
  };

  const handleGenerate = async () => {
    setStep("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("로그인이 필요합니다");

      const prompt = `다음 조건으로 웨딩 견적서를 JSON 형태로 생성해주세요.
조건: 지역=${regions[region]?.label || region}, 하객수=${guestCount}명, 총예산=${totalBudget}만원, 스타일=${styles.join(",")}
우선순위: ${priorities.join(",")}

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이 JSON만):
{
  "categories": [
    { "name": "웨딩홀", "min": 숫자, "max": 숫자, "recommended": 숫자, "items": ["대관료", "식대"], "hidden_costs": ["주차비"], "tip": "팁" },
    { "name": "스드메", "min": 숫자, "max": 숫자, "recommended": 숫자, "items": [], "hidden_costs": [], "tip": "" },
    { "name": "예물/예단", "min": 숫자, "max": 숫자, "recommended": 숫자, "items": [], "hidden_costs": [], "tip": "" },
    { "name": "혼수", "min": 숫자, "max": 숫자, "recommended": 숫자, "items": [], "hidden_costs": [], "tip": "" },
    { "name": "허니문", "min": 숫자, "max": 숫자, "recommended": 숫자, "items": [], "hidden_costs": [], "tip": "" },
    { "name": "기타", "min": 숫자, "max": 숫자, "recommended": 숫자, "items": [], "hidden_costs": [], "tip": "" }
  ],
  "saving_tips": ["팁1", "팁2", "팁3"],
  "total_min": 숫자,
  "total_max": 숫자
}`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!resp.ok) throw new Error("AI 응답 실패");

      // Read streamed response
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("스트림 오류");
      const decoder = new TextDecoder();
      let fullText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch { /* skip */ }
        }
      }

      // Extract JSON from response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON 파싱 실패");
      const data = JSON.parse(jsonMatch[0]);

      // Build HTML
      const regionLabel = regions[region]?.label || region;
      let html = generatePdfHeader("맞춤 웨딩 견적서");
      html += `<div class="pdf-subtitle">${regionLabel} · ${guestCount}명 · ${totalBudget.toLocaleString()}만원 · ${styles.join(", ")}</div>`;
      
      // Info grid
      html += `<div class="pdf-info-grid">
        <div class="pdf-info-item"><div class="pdf-info-label">지역</div><div class="pdf-info-value">${regionLabel}</div></div>
        <div class="pdf-info-item"><div class="pdf-info-label">하객 수</div><div class="pdf-info-value">${guestCount}명</div></div>
        <div class="pdf-info-item"><div class="pdf-info-label">총 예산</div><div class="pdf-info-value">${totalBudget.toLocaleString()}만원</div></div>
        <div class="pdf-info-item"><div class="pdf-info-label">선호 스타일</div><div class="pdf-info-value">${styles.join(", ") || "-"}</div></div>
      </div>`;

      // Category table
      html += `<div class="pdf-section"><div class="pdf-section-title">카테고리별 예상 비용</div>
        <table class="pdf-table"><thead><tr><th>카테고리</th><th>최소</th><th>최대</th><th>추천 배분</th></tr></thead><tbody>`;
      for (const cat of data.categories) {
        html += `<tr><td>${cat.name}</td><td>${cat.min?.toLocaleString()}만원</td><td>${cat.max?.toLocaleString()}만원</td><td><strong>${cat.recommended?.toLocaleString()}만원</strong></td></tr>`;
      }
      html += `<tr class="total-row"><td>합계</td><td>${data.total_min?.toLocaleString()}만원</td><td>${data.total_max?.toLocaleString()}만원</td><td><strong>${totalBudget.toLocaleString()}만원</strong></td></tr>`;
      html += `</tbody></table></div>`;

      // Details per category
      for (const cat of data.categories) {
        html += `<div class="pdf-section"><div class="pdf-section-title">${cat.name} 상세</div>`;
        if (cat.items?.length > 0) {
          html += `<p style="font-size:12px;margin-bottom:4px;"><strong>포함 항목:</strong> ${cat.items.join(", ")}</p>`;
        }
        if (cat.hidden_costs?.length > 0) {
          html += `<div class="pdf-warning">⚠️ <strong>숨겨진 추가금:</strong> ${cat.hidden_costs.join(", ")}</div>`;
        }
        if (cat.tip) {
          html += `<div class="pdf-tip">💡 ${cat.tip}</div>`;
        }
        html += `</div>`;
      }

      // Saving tips
      if (data.saving_tips?.length > 0) {
        html += `<div class="pdf-section"><div class="pdf-section-title">💰 절약 포인트</div><ul class="pdf-checklist">`;
        for (const tip of data.saving_tips) {
          html += `<li>${tip}</li>`;
        }
        html += `</ul></div>`;
      }

      // Disclaimer
      html += `<div class="pdf-highlight" style="font-size:11px;color:#666;">
        <strong>⚠️ 주의사항</strong><br/>
        • 이 견적서는 AI가 평균 데이터 기반으로 생성한 참고 자료입니다<br/>
        • 실제 비용은 업체별, 시즌별로 상이할 수 있습니다<br/>
        • 계약 전 반드시 업체에 정확한 견적을 요청하세요
      </div>`;

      html += generatePdfFooter();
      setHtmlResult(html);
      setStep("preview");
    } catch (err) {
      console.error("Estimate generation error:", err);
      toast.error("견적서 생성에 실패했습니다. 다시 시도해주세요.");
      setStep("input");
    }
  };

  const handleDownload = () => {
    downloadPdf(htmlResult, `듀이_견적서_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF가 다운로드됩니다!");
  };

  const handleClose = () => {
    setStep("input");
    setHtmlResult("");
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>📋 AI 견적서 자동생성</SheetTitle>
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
                  <button key={p} onClick={() => toggleChip(priorities, p, setPriorities, 2)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${priorities.includes(p) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{p}</button>
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
            <p className="text-sm font-medium text-foreground">듀이가 견적서를 만들고 있어요...</p>
            <p className="text-xs text-muted-foreground mt-1">약 10초 정도 걸려요</p>
          </div>
        )}

        {step === "preview" && (
          <div className="mt-4">
            <div className="bg-muted rounded-2xl p-4 mb-4 max-h-[40vh] overflow-y-auto">
              <div className="text-center py-6">
                <span className="text-4xl">📄</span>
                <p className="text-sm font-medium text-foreground mt-2">견적서가 준비되었어요!</p>
                <p className="text-xs text-muted-foreground mt-1">{regions[region]?.label} · {guestCount}명 · {totalBudget.toLocaleString()}만원</p>
              </div>
            </div>
            <button onClick={handleDownload} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> PDF 다운로드
            </button>
            <button onClick={() => { setStep("input"); setHtmlResult(""); }} className="w-full py-2.5 text-sm text-muted-foreground mt-2">
              다시 만들기
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default EstimateSheet;
