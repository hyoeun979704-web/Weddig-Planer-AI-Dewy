import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { Loader2, Download, Sparkles } from "lucide-react";
import {
  generatePdfHeader,
  generatePdfFooter,
  downloadPdf,
  pdfInfoGrid,
  pdfSection,
} from "@/lib/pdfGenerator";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
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

const coupleSubtitle = (info: StaffInfo) =>
  info.groomName && info.brideName ? `${info.groomName} ♥ ${info.brideName} 결혼식` : "결혼식 안내";

const sharedInfoGrid = (info: StaffInfo, extras: { label: string; value: string }[] = []) =>
  pdfInfoGrid([
    { label: "예식일", value: info.weddingDate || "-" },
    { label: "예식 시간", value: info.ceremonyTime || "-" },
    { label: "장소", value: info.venueName || "-" },
    { label: "주소", value: info.venueAddress || "-" },
    ...extras,
  ]);

const staffTemplates: Record<StaffType, (info: StaffInfo) => string> = {
  "staff-gabang": (info) => {
    let html = generatePdfHeader("가방순이 전달사항", coupleSubtitle(info));
    html += sharedInfoGrid(info);

    html += pdfSection(
      "👜 가방순이란?",
      `<p style="font-size:11.5px;line-height:1.7;color:#374151;">신부의 귀중품(축의금 봉투, 핸드폰, 지갑, 액세서리 등)을 결혼식 동안 안전하게 관리하는 역할이에요. 신부와 가장 가까운 친구나 친지가 맡는 경우가 많아요.</p>`,
    );

    html += pdfSection(
      "⏰ 당일 동선 (시간순)",
      `<div class="pdf-timeline">
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1시간 전</div><div class="pdf-timeline-event">신부 대기실 도착 · 가방 인수</div><div class="pdf-timeline-note">분실 방지를 위해 대기실에서 인수인계</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 40분 전</div><div class="pdf-timeline-event">신부 대기실 안내 도움 · 사진 촬영 대비</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 직전</div><div class="pdf-timeline-event">축의대에서 축의금 봉투 1차 수거</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 중</div><div class="pdf-timeline-event">가방은 항상 몸에 지닌 채 자리 비우지 않기</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 후</div><div class="pdf-timeline-event">축의금 봉투 2차 수거 · 신부에게 전달 확인</div></div>
        ${info.hasPyebaek ? `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">폐백</div><div class="pdf-timeline-event">폐백실 동행 · 귀중품 보관</div></div>` : ""}
      </div>`,
    );

    html += pdfSection(
      "✅ 축의금 관리 체크리스트",
      `<ul class="pdf-checklist">
        <li>축의대에서 봉투 수거 시간 사전 약속하기 (예식 직전/직후)</li>
        <li>봉투 수거 후 즉시 가방에 보관 · 절대 열어보지 않기</li>
        <li>가방은 항상 몸에 지닌 채로 (의자/테이블 위 방치 금지)</li>
        <li>화장실 갈 때 반드시 다른 사람에게 인계</li>
        <li>총 봉투 수 대략 카운트 (분실 방지)</li>
        <li>예식 종료 후 신부 또는 양가 부모님 입회 하에 전달</li>
      </ul>`,
    );

    html += pdfSection(
      "📦 챙기면 좋은 준비물",
      `<ul class="pdf-bullet-list">
        <li>가방 안에 보조 파우치 또는 지퍼백 (봉투 분리 보관용)</li>
        <li>메모지 + 펜 (특이사항 기록)</li>
        <li>편한 신발 또는 여분 신발 (장시간 서 있음)</li>
        <li>본인 휴대폰 충전기</li>
        <li>간단한 간식 · 물</li>
      </ul>`,
    );

    html += pdfSection(
      "📞 비상 연락처",
      `<table class="pdf-table"><tbody>
        <tr><td style="width:30%;">신부</td><td>${info.bridePhone || "(                              )"}</td></tr>
        <tr><td>신랑</td><td>${info.groomPhone || "(                              )"}</td></tr>
        <tr><td>웨딩홀 안내</td><td>(                              )</td></tr>
      </tbody></table>`,
    );

    html += `<div class="pdf-warning">⚠️ 절대 가방을 방치하지 마세요 · 축의금 봉투는 열어보지 마세요 · 편한 신발로 장시간 대비하세요</div>`;
    html += `<div class="pdf-tip">💡 부담스러운 역할이지만, 신부 입장에서 가장 든든한 사람이에요. 천천히 호흡하면서 침착하게 진행해주세요.</div>`;

    html += generatePdfFooter();
    return html;
  },

  "staff-reception": (info) => {
    let html = generatePdfHeader("축의대 담당자 안내서", coupleSubtitle(info));
    html += sharedInfoGrid(info, [{ label: "예상 하객", value: `${info.expectedGuests}명` }]);

    html += pdfSection(
      "📦 사전 준비물",
      `<ul class="pdf-checklist">
        <li>방명록 (또는 모바일 방명록 QR 코드)</li>
        <li>필기구 (검정 펜 3자루 이상 + 여분)</li>
        <li>축의금 봉투 보관함 또는 가방 (자물쇠 권장)</li>
        <li>봉투용 메모지/스티커 (이름 누락 봉투 표시)</li>
        <li>테이프/풀 (모바일 청첩장 출력 부착 등)</li>
        <li>식사권 또는 좌석표 · 답례품</li>
      </ul>`,
    );

    html += pdfSection(
      "⏰ 당일 일정",
      `<div class="pdf-timeline">
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1시간 전</div><div class="pdf-timeline-event">축의대 세팅 · 동선/표지 확인</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 40분 전</div><div class="pdf-timeline-event">하객 접수 시작 · 방명록 + 식사권 안내</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 10분 전</div><div class="pdf-timeline-event">중간 정산 · 가방순이에게 1차 봉투 전달</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 중</div><div class="pdf-timeline-event">늦은 하객 계속 접수 (예식장에서 입장 안내)</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 직후</div><div class="pdf-timeline-event">남은 봉투 정리 · 가방순이에게 최종 전달</div></div>
      </div>`,
    );

    html += pdfSection(
      "💡 접수 요령",
      `<ul class="pdf-bullet-list">
        <li>하객 인사 → 성함 확인 → 축의금 봉투 접수 순서로 진행</li>
        <li>방명록 작성을 정중히 안내 (작성 후 식사권 전달)</li>
        <li>봉투에 이름이 없으면 정중히 여쭤보고 봉투에 적어두기</li>
        <li>현금이 봉투 밖으로 보이거나 영수증이 같이 든 경우 즉시 봉투에 안전 보관</li>
        <li>화환/선물은 별도 메모지에 이름과 함께 기록</li>
        <li>대신 접수 부탁받은 경우 본인+대신 접수자 이름 모두 기재</li>
      </ul>`,
    );

    html += pdfSection(
      "💺 좌석 / 식사 안내",
      `<table class="pdf-table"><tbody>
        <tr><td style="width:30%;">신랑측 좌석</td><td>식장 입구 기준 왼쪽</td></tr>
        <tr><td>신부측 좌석</td><td>식장 입구 기준 오른쪽</td></tr>
        <tr><td>피로연 형태</td><td>${info.mealType || "뷔페"}</td></tr>
        <tr><td>식사 시작</td><td>예식 종료 후 약 30분 후</td></tr>
      </tbody></table>
      <div class="pdf-tip">💡 어르신/거동 불편 하객은 동선이 짧은 자리로 안내해드리면 좋아요</div>`,
    );

    html += pdfSection(
      "📞 비상 연락처",
      `<table class="pdf-table"><tbody>
        <tr><td>신랑</td><td>${info.groomPhone || "(                              )"}</td></tr>
        <tr><td>신부</td><td>${info.bridePhone || "(                              )"}</td></tr>
        <tr><td>가방순이</td><td>(                              )</td></tr>
        <tr><td>웨딩홀</td><td>(                              )</td></tr>
      </tbody></table>`,
    );

    html += `<div class="pdf-warning">⚠️ 봉투 분실 시 즉시 신랑/신부 측에 알리고 CCTV 확인 요청 · 봉투에 이름 없는 경우 사진으로 봉투 모양/위치 기록</div>`;

    html += generatePdfFooter();
    return html;
  },

  "staff-mc": (info) => {
    let html = generatePdfHeader("사회자 큐시트", coupleSubtitle(info));
    html += sharedInfoGrid(info);

    const cueItems = [
      { order: 1, event: "개식 안내 · 휴대폰 무음 요청", duration: "2분", time: "−5", cue: "하객 착석 안내 멘트" },
      { order: 2, event: "양가 어머니 화촉 점화", duration: "2분", time: "0", cue: "조명 다운 신호" },
      { order: 3, event: "신랑 입장", duration: "1분", time: "+2", cue: "입장곡 큐 (음향 담당)" },
      { order: 4, event: "신부 입장", duration: "2분", time: "+3", cue: "음악 변경 신호" },
      { order: 5, event: "맞절 · 혼인서약", duration: "3분", time: "+5", cue: "마이크 전달" },
      { order: 6, event: "주례사 또는 덕담", duration: "5~10분", time: "+8", cue: "주례자 위치 확인" },
      { order: 7, event: "성혼 선언", duration: "1분", time: "+15", cue: "환호 유도" },
      { order: 8, event: "축가", duration: "3~5분", time: "+16", cue: "축가자 대기 확인" },
      { order: 9, event: "양가 부모님께 인사 · 친지 인사", duration: "3분", time: "+20", cue: "신랑신부 위치 안내" },
      { order: 10, event: "축하 영상 / 깜짝 이벤트", duration: "3~5분", time: "+23", cue: "영상 큐 (있는 경우)" },
      { order: 11, event: "신랑신부 행진 · 폐식", duration: "2분", time: "+28", cue: "퇴장곡 큐" },
      { order: 12, event: "단체 기념사진 안내", duration: "5분", time: "+30", cue: "양가 가족 → 친구 → 전체 순" },
    ];

    let cueTable = `<table class="pdf-table"><thead><tr><th>#</th><th>순서</th><th>예식+분</th><th>소요</th><th>큐/멘트 포인트</th></tr></thead><tbody>`;
    for (const item of cueItems) {
      cueTable += `<tr><td>${item.order}</td><td><strong>${item.event}</strong></td><td>${item.time}</td><td>${item.duration}</td><td>${item.cue}</td></tr>`;
    }
    cueTable += `</tbody></table>`;
    html += pdfSection("🎬 식순 및 큐 타이밍", cueTable);

    html += pdfSection(
      "🎤 멘트 가이드",
      `<div class="pdf-highlight">
        <strong style="color:#F4A7B9;">개식 멘트 (예시)</strong><br/>
        "안녕하십니까, 오늘 ${info.groomName || "신랑"} 군과 ${info.brideName || "신부"} 양의 결혼식에 함께해 주신 모든 분들께 감사드립니다.
        잠시 후 예식이 시작될 예정이오니, 휴대폰은 진동이나 무음으로 전환해 주시고, 자리에 착석해 주시기 바랍니다."
      </div>
      <div class="pdf-highlight" style="margin-top:8px;">
        <strong style="color:#F4A7B9;">성혼 선언 후 멘트 (예시)</strong><br/>
        "방금 두 분이 부부가 되셨습니다! 두 사람의 새로운 출발을 축하하는 큰 박수 부탁드립니다."
      </div>
      <div class="pdf-highlight" style="margin-top:8px;">
        <strong style="color:#F4A7B9;">폐식 멘트 (예시)</strong><br/>
        "이상으로 ${info.groomName || "신랑"}·${info.brideName || "신부"} 두 분의 결혼식을 모두 마칩니다. 함께해주신 모든 분들께 다시 한 번 감사드리며, 잠시 후 ${info.venueName || "피로연장"}에서 식사 자리를 마련하였으니 부디 자리를 빛내주시기 바랍니다."
      </div>`,
    );

    html += pdfSection(
      "🚨 비상 대응",
      `<div class="pdf-warning">
        <strong>마이크 불량</strong> → 즉시 여분 마이크로 교체 · 음향 담당자 호출<br/>
        <strong>영상 재생 오류</strong> → "잠시 기술 점검 중입니다. 양해 부탁드립니다" 안내 후 다음 순서로 이동<br/>
        <strong>하객 소란</strong> → 정중하게 착석 안내, 강하게 제지하지 않기<br/>
        <strong>예식 지연</strong> → 주례에게 부드러운 신호 (시간 카드 또는 손짓)<br/>
        <strong>신부 부케 분실</strong> → 부케 대신 부토니에로 진행 가능
      </div>`,
    );

    html += pdfSection(
      "✅ 사회자 사전 체크리스트",
      `<ul class="pdf-checklist">
        <li>신랑·신부 이름/성 정확하게 발음 연습</li>
        <li>식순 인쇄본 + 큐시트 휴대</li>
        <li>주례자 호칭 확인 (직함/존칭)</li>
        <li>축가자/영상 담당자와 사전 큐 확인</li>
        <li>마이크 위치/예비 마이크 확인</li>
        <li>본인 의상 (단정한 정장 권장)</li>
        <li>물 · 사탕 (목 관리용)</li>
      </ul>`,
    );

    html += generatePdfFooter();
    return html;
  },

  "staff-parents": (info) => {
    let html = generatePdfHeader("부모님 안내서", coupleSubtitle(info));
    html += sharedInfoGrid(info);

    html += pdfSection(
      "⏰ 당일 동선",
      `<div class="pdf-timeline">
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1.5시간 전</div><div class="pdf-timeline-event">웨딩홀 도착 · 대기실 위치 확인</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 1시간 전</div><div class="pdf-timeline-event">신랑·신부 대기실 방문 · 인사</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 45분 전</div><div class="pdf-timeline-event">원판/가족 단체사진 촬영</div><div class="pdf-timeline-note">양가 함께 + 각 가족별</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 20분 전</div><div class="pdf-timeline-event">웨딩홀 입구에서 하객 맞이</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 직전</div><div class="pdf-timeline-event">지정 좌석 착석 (1열 양쪽 끝)</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 중</div><div class="pdf-timeline-event">화촉 점화 (양가 어머니) · 자녀 인사 받기</div></div>
        <div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">예식 후</div><div class="pdf-timeline-event">하객 인사 · 피로연 안내</div></div>
        ${info.hasPyebaek ? `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">폐백</div><div class="pdf-timeline-event">폐백실로 이동 · 한복 착용</div></div>` : ""}
      </div>`,
    );

    html += pdfSection(
      "👔 복장 안내",
      `<table class="pdf-table"><tbody>
        <tr><td style="width:35%;">🤵 신랑 아버지</td><td>다크 양복 정장 + 흰 와이셔츠 (보타이 또는 단정한 넥타이)</td></tr>
        <tr><td>🤵 신랑 어머니</td><td>한복 또는 단정한 양장 (밝은 톤 추천)</td></tr>
        <tr><td>👰 신부 아버지</td><td>다크 양복 정장 (신랑 측과 톤 매치)</td></tr>
        <tr><td>👰 신부 어머니</td><td>한복 또는 단정한 양장 (밝은 톤 추천)</td></tr>
      </tbody></table>
      <div class="pdf-tip">💡 양가 어머니 복장 톤을 미리 맞추면 사진 결과가 훨씬 조화로워요 (예: 둘 다 파스텔 / 둘 다 정장)</div>`,
    );

    html += pdfSection(
      "💐 챙기면 좋은 것",
      `<ul class="pdf-checklist">
        <li>지정된 코사지/한복 액세서리</li>
        <li>한복 또는 정장 (변경용 옷 1벌 포함)</li>
        <li>편한 신발 (예식 외 시간용)</li>
        <li>축의금 답례용 작은 답례품 (선택)</li>
        <li>가족 사진용 손수건/소품</li>
        <li>휴대폰 충전기 (장시간 대비)</li>
      </ul>`,
    );

    html += pdfSection(
      "💡 유의사항",
      `<ul class="pdf-bullet-list">
        <li>예식 중에는 휴대폰 무음 설정 부탁드려요</li>
        <li>하객 접대 시 너무 무리하지 마세요 (자녀의 큰 날, 부모님 컨디션이 가장 중요)</li>
        <li>축의금 관련은 가방순이/축의대 담당자에게 맡기시는 편이 안전해요</li>
        <li>화촉 점화 시 라이터를 미리 받아두면 매끄럽게 진행돼요</li>
        <li>단체사진은 예식 전이 가장 자연스럽고 시간 효율이 좋아요</li>
      </ul>`,
    );

    html += `<div class="pdf-note">📌 자녀의 가장 행복한 날입니다. 모든 일을 부모님이 다 챙기실 필요 없어요. 옆에서 미소로 함께해주시는 것만으로도 충분합니다. 💕</div>`;

    html += generatePdfFooter();
    return html;
  },
};

const StaffGuideSheet = ({ open, onClose }: StaffGuideSheetProps) => {
  const profile = useWeddingProfile();
  const [generating, setGenerating] = useState(false);
  const [info, setInfo] = useState<StaffInfo>({
    weddingDate: "", ceremonyTime: "12:00", venueName: "", venueAddress: "",
    groomName: "", brideName: "", groomPhone: "", bridePhone: "",
    expectedGuests: 200, mealType: "뷔페", hasPyebaek: true,
  });
  const [prefillApplied, setPrefillApplied] = useState(false);

  useEffect(() => {
    if (!open || prefillApplied || !profile.isLoaded) return;
    setInfo(prev => ({
      ...prev,
      weddingDate: profile.weddingDate || prev.weddingDate,
      groomName: profile.displayName || prev.groomName,
      brideName: profile.partnerName || prev.brideName,
      expectedGuests: profile.guestCount > 0 ? profile.guestCount : prev.expectedGuests,
    }));
    setPrefillApplied(true);
  }, [open, prefillApplied, profile]);

  useEffect(() => {
    if (!open) setPrefillApplied(false);
  }, [open]);

  if (!open) return null;
  const type = open as StaffType;
  const meta = staffMeta[type];
  const hasPrefill = profile.isLoaded && (!!profile.weddingDate || !!profile.partnerName || !!profile.displayName);

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
          {hasPrefill && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-primary leading-relaxed">
                등록된 결혼 정보(예식일·이름·하객 수)를 자동으로 불러왔어요. 필요하면 수정해주세요.
              </p>
            </div>
          )}
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
          {(type === "staff-gabang" || type === "staff-reception") && (
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
