import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { generatePdfHeader, generatePdfFooter, downloadPdf } from "@/lib/pdfGenerator";
import { toast } from "sonner";

type StaffType = "staff-gabang" | "staff-reception" | "staff-mc" | "staff-parents";

interface StaffGuideSheetProps {
  open: StaffType | null;
  onClose: () => void;
}

const staffMeta: Record<StaffType, { title: string; emoji: string; filename: string }> = {
  "staff-gabang": { title: "가방순이 전달사항", emoji: "👜", filename: "가방순이_안내서" },
  "staff-reception": { title: "축의대 담당자 안내서", emoji: "💰", filename: "축의대_안내서" },
  "staff-mc": { title: "사회자 큐시트", emoji: "🎤", filename: "사회자_큐시트" },
  "staff-parents": { title: "부모님 안내서", emoji: "👪", filename: "부모님_안내서" },
};

const staffTemplates: Record<StaffType, (info: StaffInfo) => string> = {
  "staff-gabang": (info) => {
    let html = generatePdfHeader("가방순이 전달사항");
    html += `<div class="pdf-subtitle">${info.groomName} ♥ ${info.brideName} 결혼식</div>`;
    html += `<div class="pdf-info-grid">
      <div class="pdf-info-item"><div class="pdf-info-label">예식일</div><div class="pdf-info-value">${info.weddingDate}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">예식 시간</div><div class="pdf-info-value">${info.ceremonyTime}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">장소</div><div class="pdf-info-value">${info.venueName}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">주소</div><div class="pdf-info-value">${info.venueAddress}</div></div>
    </div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">가방순이란?</div><p style="font-size:12px;">신부의 귀중품(축의금 봉투, 핸드폰, 지갑 등)을 안전하게 관리하는 역할입니다.</p></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">⏰ 당일 일정</div><div class="pdf-timeline">
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1시간 전</div><div class="pdf-timeline-event">신부 대기실에서 신부 가방 인수</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 시작</div><div class="pdf-timeline-event">가방 안전 보관 (절대 자리 비우지 않기)</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 중</div><div class="pdf-timeline-event">축의금 봉투 수시 확인</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 후</div><div class="pdf-timeline-event">신부에게 가방 전달</div></div>
      ${info.hasPyebaek ? `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">폐백 시</div><div class="pdf-timeline-event">폐백실까지 동행 (귀중품 관리)</div></div>` : ""}
    </div></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">✅ 축의금 관리 체크리스트</div><ul class="pdf-checklist">
      <li>축의대에서 축의금 봉투 수거 시간 확인</li>
      <li>봉투 수거 후 즉시 가방에 보관</li>
      <li>가방은 항상 몸에 지닌 채로</li>
      <li>화장실 갈 때 반드시 다른 사람에게 인계</li>
      <li>총 봉투 수 대략 카운트</li>
    </ul></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">📞 비상 연락처</div>
      <table class="pdf-table"><tbody>
      <tr><td>신부</td><td>${info.bridePhone || "(               )"}</td></tr>
      <tr><td>신랑</td><td>${info.groomPhone || "(               )"}</td></tr>
      </tbody></table></div>`;
    html += `<div class="pdf-warning">⚠️ 가방을 절대 방치하지 마세요 · 축의금 봉투를 열어보지 마세요 · 편한 신발 착용 권장</div>`;
    html += generatePdfFooter();
    return html;
  },
  "staff-reception": (info) => {
    let html = generatePdfHeader("축의대 담당자 안내서");
    html += `<div class="pdf-subtitle">${info.groomName} ♥ ${info.brideName} 결혼식</div>`;
    html += `<div class="pdf-info-grid">
      <div class="pdf-info-item"><div class="pdf-info-label">예식일</div><div class="pdf-info-value">${info.weddingDate}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">예식 시간</div><div class="pdf-info-value">${info.ceremonyTime}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">장소</div><div class="pdf-info-value">${info.venueName}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">예상 하객</div><div class="pdf-info-value">${info.expectedGuests}명</div></div>
    </div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">📦 준비물</div><ul class="pdf-checklist">
      <li>방명록</li><li>필기구 (여분 포함)</li><li>축의금 봉투 보관함/가방</li><li>메모지</li><li>테이프/풀</li>
    </ul></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">⏰ 당일 일정</div><div class="pdf-timeline">
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1시간 전</div><div class="pdf-timeline-event">축의대 세팅 확인</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 40분 전~</div><div class="pdf-timeline-event">하객 접수 시작</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 시작</div><div class="pdf-timeline-event">늦게 오는 하객 계속 접수</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 후</div><div class="pdf-timeline-event">축의금 봉투 가방순이에게 전달</div></div>
    </div></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">💡 접수 요령</div>
      <p style="font-size:12px;line-height:1.8;">1. 하객 성함 + 축의금 접수<br/>2. 방명록 작성 안내<br/>3. 식사권/좌석 안내<br/>4. 봉투에 이름 없으면 정중히 여쭤보기<br/>5. 화환/선물 접수 시 메모 남기기</p></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">💺 좌석 안내</div>
      <p style="font-size:12px;">🤵 신랑측: 왼쪽 &nbsp;&nbsp; 👰 신부측: 오른쪽<br/>🍽️ 피로연장: ${info.mealType || "뷔페"}</p></div>`;
    html += generatePdfFooter();
    return html;
  },
  "staff-mc": (info) => {
    let html = generatePdfHeader("사회자 큐시트");
    html += `<div class="pdf-subtitle">${info.groomName} ♥ ${info.brideName} 결혼식</div>`;
    html += `<div class="pdf-info-grid">
      <div class="pdf-info-item"><div class="pdf-info-label">예식일</div><div class="pdf-info-value">${info.weddingDate}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">예식 시간</div><div class="pdf-info-value">${info.ceremonyTime}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">장소</div><div class="pdf-info-value">${info.venueName}</div></div>
    </div>`;
    const cueItems = [
      { order: 1, event: "개식 안내", duration: "2분", cue: "하객 착석 안내 + 휴대폰 무음 요청" },
      { order: 2, event: "신랑 입장", duration: "1분", cue: "입장 음악 시작 신호" },
      { order: 3, event: "신부 입장", duration: "2분", cue: "음악 변경 신호" },
      { order: 4, event: "주례사/예식 진행", duration: "10~15분", cue: "주례 마이크 전달" },
      { order: 5, event: "성혼 선언", duration: "1분", cue: "" },
      { order: 6, event: "축가", duration: "3~5분", cue: "축가 가수 대기 확인" },
      { order: 7, event: "양가 부모님 인사", duration: "3분", cue: "부모님 대기 안내" },
      { order: 8, event: "축하 영상 상영", duration: "3~5분", cue: "영상 담당자 신호" },
      { order: 9, event: "폐식 안내", duration: "2분", cue: "퇴장 음악 시작 신호" },
      { order: 10, event: "포토타임", duration: "5분", cue: "단체사진 진행" },
    ];
    html += `<div class="pdf-section"><div class="pdf-section-title">🎬 식순 및 멘트 타이밍</div>
      <table class="pdf-table"><thead><tr><th>#</th><th>순서</th><th>시간</th><th>큐/비고</th></tr></thead><tbody>`;
    for (const item of cueItems) {
      html += `<tr><td>${item.order}</td><td><strong>${item.event}</strong></td><td>${item.duration}</td><td>${item.cue}</td></tr>`;
    }
    html += `</tbody></table></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">🚨 비상 대응</div>
      <div class="pdf-warning">마이크 불량 → 여분 마이크 위치 확인<br/>영상 재생 오류 → "잠시 기술 확인 중입니다" 안내<br/>하객 소란 → 정중하게 착석 안내<br/>시간 초과 → 주례에게 부드럽게 신호</div></div>`;
    html += generatePdfFooter();
    return html;
  },
  "staff-parents": (info) => {
    let html = generatePdfHeader("부모님 안내서");
    html += `<div class="pdf-subtitle">${info.groomName} ♥ ${info.brideName} 결혼식</div>`;
    html += `<div class="pdf-info-grid">
      <div class="pdf-info-item"><div class="pdf-info-label">예식일</div><div class="pdf-info-value">${info.weddingDate}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">예식 시간</div><div class="pdf-info-value">${info.ceremonyTime}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">장소</div><div class="pdf-info-value">${info.venueName}</div></div>
      <div class="pdf-info-item"><div class="pdf-info-label">주소</div><div class="pdf-info-value">${info.venueAddress}</div></div>
    </div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">⏰ 당일 일정</div><div class="pdf-timeline">
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1.5시간 전</div><div class="pdf-timeline-event">웨딩홀 도착</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1시간 전</div><div class="pdf-timeline-event">대기실에서 신랑/신부 만남</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 40분 전</div><div class="pdf-timeline-event">가족 사진 촬영 (양가 함께)</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 20분 전</div><div class="pdf-timeline-event">하객 맞이 (입구에서 인사)</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 시작</div><div class="pdf-timeline-event">지정 좌석 착석 (1열 양쪽 끝)</div></div>
      <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 후</div><div class="pdf-timeline-event">하객 인사 / 피로연 안내</div></div>
      ${info.hasPyebaek ? `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">폐백</div><div class="pdf-timeline-event">폐백실 이동 (한복 착용)</div></div>` : ""}
    </div></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">👔 복장 안내</div>
      <table class="pdf-table"><tbody>
      <tr><td>🤵 신랑 아버지</td><td>양복 정장 (다크 계열 추천)</td></tr>
      <tr><td>🤵 신랑 어머니</td><td>한복 또는 양장</td></tr>
      <tr><td>👰 신부 아버지</td><td>양복 정장</td></tr>
      <tr><td>👰 신부 어머니</td><td>한복 또는 양장</td></tr>
      </tbody></table>
      <div class="pdf-tip">💡 양가 복장 톤을 미리 맞추면 사진이 조화로워요</div></div>`;
    html += `<div class="pdf-section"><div class="pdf-section-title">💡 유의사항</div>
      <div class="pdf-tip">• 예식 중 휴대폰 무음 설정<br/>• 하객 접대 시 너무 무리하지 마세요<br/>• 축의금 관련은 가방순이/축의대에 맡기세요</div></div>`;
    html += generatePdfFooter();
    return html;
  },
};

interface StaffInfo {
  weddingDate: string;
  ceremonyTime: string;
  venueName: string;
  venueAddress: string;
  groomName: string;
  brideName: string;
  groomPhone: string;
  bridePhone: string;
  expectedGuests: number;
  mealType: string;
  hasPyebaek: boolean;
}

const StaffGuideSheet = ({ open, onClose }: StaffGuideSheetProps) => {
  const [generating, setGenerating] = useState(false);
  const [info, setInfo] = useState<StaffInfo>({
    weddingDate: "", ceremonyTime: "12:00", venueName: "", venueAddress: "",
    groomName: "", brideName: "", groomPhone: "", bridePhone: "",
    expectedGuests: 200, mealType: "뷔페", hasPyebaek: true,
  });

  if (!open) return null;
  const type = open as StaffType;
  const meta = staffMeta[type];

  const updateField = (key: keyof StaffInfo, value: any) => setInfo(prev => ({ ...prev, [key]: value }));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const template = staffTemplates[type];
      const html = template(info);
      await downloadPdf(html, `듀이_${meta.filename}_${info.weddingDate || "안내서"}.pdf`);
      toast.success("PDF가 다운로드됩니다!");
    } catch (err) {
      console.error(err);
      toast.error("생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Sheet open={!!open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>{meta.emoji} {meta.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">신랑 이름</label>
              <input value={info.groomName} onChange={(e) => updateField("groomName", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">신부 이름</label>
              <input value={info.brideName} onChange={(e) => updateField("brideName", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">예식일</label>
            <input type="date" value={info.weddingDate} onChange={(e) => updateField("weddingDate", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">예식 시간</label>
              <input type="time" value={info.ceremonyTime} onChange={(e) => updateField("ceremonyTime", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">예상 하객</label>
              <input type="number" value={info.expectedGuests} onChange={(e) => updateField("expectedGuests", Number(e.target.value))} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">장소명</label>
            <input value={info.venueName} onChange={(e) => updateField("venueName", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">주소</label>
            <input value={info.venueAddress} onChange={(e) => updateField("venueAddress", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
          </div>
          {(type === "staff-gabang") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">신랑 연락처</label>
                <input type="tel" value={info.groomPhone} onChange={(e) => updateField("groomPhone", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">신부 연락처</label>
                <input type="tel" value={info.bridePhone} onChange={(e) => updateField("bridePhone", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none" />
              </div>
            </div>
          )}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={info.hasPyebaek} onChange={(e) => updateField("hasPyebaek", e.target.checked)} className="rounded" />
              폐백 진행
            </label>
            {type === "staff-reception" && (
              <select value={info.mealType} onChange={(e) => updateField("mealType", e.target.value)} className="px-3 py-1.5 bg-muted rounded-xl text-sm outline-none">
                <option value="뷔페">뷔페</option>
                <option value="코스">코스</option>
                <option value="한식">한식</option>
              </select>
            )}
          </div>
          <button onClick={handleGenerate} disabled={generating} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generating ? "생성 중..." : "PDF 다운로드"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StaffGuideSheet;
