import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { generatePdfHeader, generatePdfFooter, downloadPdf } from "@/lib/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TimelineType = "timeline-snap" | "timeline-ceremony" | "timeline-guest";

interface TimelineSheetProps {
  open: TimelineType | null;
  onClose: () => void;
}

const typeLabels: Record<TimelineType, { title: string; emoji: string }> = {
  "timeline-snap": { title: "스냅촬영일 타임라인", emoji: "📸" },
  "timeline-ceremony": { title: "본식 당일 타임라인", emoji: "💒" },
  "timeline-guest": { title: "하객 안내 타임라인", emoji: "👥" },
};

const TimelineSheet = ({ open, onClose }: TimelineSheetProps) => {
  const [step, setStep] = useState<"input" | "loading" | "done">("input");
  const [date, setDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [ceremonyTime, setCeremonyTime] = useState("12:00");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [hasPyebaek, setHasPyebaek] = useState(true);
  const [hasOutdoor, setHasOutdoor] = useState(false);
  const [extraNotes, setExtraNotes] = useState("");

  if (!open) return null;
  const type = open as TimelineType;
  const meta = typeLabels[type];

  const handleGenerate = async () => {
    setStep("loading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("로그인 필요");

      const typeDesc = type === "timeline-snap" ? "스냅 촬영일" : type === "timeline-ceremony" ? "본식 당일" : "하객 안내용";
      const prompt = `다음 정보로 ${typeDesc} 타임라인을 JSON으로 생성해주세요.
날짜: ${date}, 장소: ${venueName} (${venueAddress}), 시간: ${ceremonyTime}
신랑: ${groomName}, 신부: ${brideName}
폐백: ${hasPyebaek ? "있음" : "없음"}, 야외촬영: ${hasOutdoor ? "있음" : "없음"}
특이사항: ${extraNotes || "없음"}

반드시 아래 JSON 형식으로만 응답:
{
  "items": [
    { "time": "09:00", "event": "이벤트명", "note": "비고" }
  ],
  "checklist": ["준비물1", "준비물2"],
  "tips": ["주의사항1", "주의사항2"]
}`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!resp.ok) throw new Error("AI 응답 실패");
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

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON 파싱 실패");
      const data = JSON.parse(jsonMatch[0]);

      let html = generatePdfHeader(meta.title);
      html += `<div class="pdf-subtitle">${groomName} ♥ ${brideName}</div>`;
      html += `<div class="pdf-info-grid">
        <div class="pdf-info-item"><div class="pdf-info-label">날짜</div><div class="pdf-info-value">${date}</div></div>
        <div class="pdf-info-item"><div class="pdf-info-label">장소</div><div class="pdf-info-value">${venueName}</div></div>
        <div class="pdf-info-item"><div class="pdf-info-label">시간</div><div class="pdf-info-value">${ceremonyTime}</div></div>
        <div class="pdf-info-item"><div class="pdf-info-label">주소</div><div class="pdf-info-value">${venueAddress}</div></div>
      </div>`;

      // Timeline
      html += `<div class="pdf-section"><div class="pdf-section-title">⏰ 시간별 일정</div><div class="pdf-timeline">`;
      for (const item of data.items || []) {
        html += `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div>
          <div class="pdf-timeline-time">${item.time}</div>
          <div class="pdf-timeline-event">${item.event}</div>
          ${item.note ? `<div class="pdf-timeline-note">${item.note}</div>` : ""}
        </div>`;
      }
      html += `</div></div>`;

      // Checklist
      if (data.checklist?.length > 0) {
        html += `<div class="pdf-section"><div class="pdf-section-title">✅ 준비물 체크리스트</div><ul class="pdf-checklist">`;
        for (const item of data.checklist) html += `<li>${item}</li>`;
        html += `</ul></div>`;
      }

      // Tips
      if (data.tips?.length > 0) {
        html += `<div class="pdf-section"><div class="pdf-section-title">💡 주의사항</div>`;
        for (const tip of data.tips) html += `<div class="pdf-tip">${tip}</div>`;
        html += `</div>`;
      }

      html += generatePdfFooter();
      await downloadPdf(html, `듀이_${meta.title}_${date || "타임라인"}.pdf`);
      toast.success("PDF가 다운로드됩니다!");
      setStep("done");
    } catch (err) {
      console.error(err);
      toast.error("타임라인 생성에 실패했습니다.");
      setStep("input");
    }
  };

  const handleClose = () => { setStep("input"); onClose(); };

  return (
    <Sheet open={!!open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>{meta.emoji} {meta.title}</SheetTitle>
        </SheetHeader>

        {step === "input" && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">신랑 이름</label>
                <input value={groomName} onChange={(e) => setGroomName(e.target.value)} placeholder="홍길동" className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">신부 이름</label>
                <input value={brideName} onChange={(e) => setBrideName(e.target.value)} placeholder="김철수" className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">날짜</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">장소명</label>
              <input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="그랜드 하얏트 서울" className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">주소</label>
              <input value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} placeholder="서울특별시 용산구..." className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">{type === "timeline-snap" ? "촬영 시작 시간" : "예식 시간"}</label>
              <input type="time" value={ceremonyTime} onChange={(e) => setCeremonyTime(e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div className="flex gap-4">
              {type === "timeline-snap" && (
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasOutdoor} onChange={(e) => setHasOutdoor(e.target.checked)} className="rounded" /> 야외촬영 포함</label>
              )}
              {type === "timeline-ceremony" && (
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasPyebaek} onChange={(e) => setHasPyebaek(e.target.checked)} className="rounded" /> 폐백 진행</label>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">특이사항 (선택)</label>
              <textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={2} placeholder="예: 야외촬영 시 우천 대안 필요" className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none resize-none" />
            </div>
            <button onClick={handleGenerate} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm">타임라인 생성하기</button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium text-foreground">듀이가 타임라인을 만들고 있어요...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-4xl mb-3">✅</span>
            <p className="text-sm font-medium text-foreground">다운로드 완료!</p>
            <button onClick={() => setStep("input")} className="mt-4 text-sm text-primary font-medium">다시 만들기</button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TimelineSheet;
