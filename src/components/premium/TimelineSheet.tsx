import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { Loader2, Download, Sparkles } from "lucide-react";
import { generatePdfHeader, generatePdfFooter, downloadPdf } from "@/lib/pdfGenerator";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { WEDDING_STYLE_LABEL, type WeddingStyle } from "@/lib/weddingStyle";
import {
  type GuestAgeMix,
  type PyebaekType,
  GUEST_AGE_MIX_LABEL,
  GUEST_AGE_MIX_HINT,
  GUEST_TIMELINE_TIPS_BY_AGE,
  PYEBAEK_LABEL,
  PYEBAEK_DURATION_MIN,
  pickFromPool, hashSeed,
} from "@/lib/pdfPhrasings";
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

interface TimelineItem {
  offsetMin: number; // minutes offset from anchor time (negative = before)
  event: string;
  note?: string;
}

interface TimelineInput {
  date: string;
  venueName: string;
  venueAddress: string;
  ceremonyTime: string;
  groomName: string;
  brideName: string;
  pyebaekType: PyebaekType;
  hasOutdoor: boolean;
  extraNotes: string;
  guestAgeMix: GuestAgeMix;
}

const parseTime = (hhmm: string): { hours: number; minutes: number } => {
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
  return { hours: isNaN(h) ? 12 : h, minutes: isNaN(m) ? 0 : m };
};

const offsetTime = (hhmm: string, offsetMin: number): string => {
  const { hours, minutes } = parseTime(hhmm);
  const total = hours * 60 + minutes + offsetMin;
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(wrapped / 60)).padStart(2, "0");
  const mm = String(wrapped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

const SNAP_ITEMS = (input: TimelineInput, weddingStyle: WeddingStyle): TimelineItem[] => {
  if (weddingStyle === "self") {
    // Self-wedding: no studio, friend photographer, DIY props
    const items: TimelineItem[] = [
      { offsetMin: 0, event: "촬영 장소 도착 · 장비/소품 셋업", note: "친구 촬영자 · 보조 인력 동선 점검" },
      { offsetMin: 30, event: "셀프 메이크업 · 헤어 마무리", note: "리허설했던 컨셉대로" },
      { offsetMin: 60, event: "의상 착장 · 부케/액세서리 확인" },
      { offsetMin: 90, event: "프리셋 컨셉 1 촬영", note: "단독 · 커플 · 가족 컷" },
      { offsetMin: 180, event: "의상 체인지 · 컨셉 전환" },
      { offsetMin: 210, event: "프리셋 컨셉 2 촬영" },
    ];
    if (input.hasOutdoor) {
      items.push({ offsetMin: 270, event: "야외 로케이션 이동", note: "골든아워 1시간 전 도착 목표" });
      items.push({ offsetMin: 300, event: "야외 스냅 (일몰 활용)" });
    }
    items.push({ offsetMin: 360, event: "촬영 종료 · 데이터 백업", note: "당일 SD카드 백업 권장" });
    return items;
  }

  // Default (general/small): studio-based snap shoot
  const items: TimelineItem[] = [
    { offsetMin: 0, event: "스튜디오/촬영장 도착 · 의상 컨펌", note: "여유 있게 30분 전 도착" },
    { offsetMin: 30, event: "신부 헤어/메이크업 시작", note: "본식보다 진하지 않게 자연스럽게" },
    { offsetMin: 60, event: "신랑 메이크업 · 의상 갈아입기" },
    { offsetMin: 120, event: "실내 스튜디오 컷 촬영 시작", note: "단독 · 커플 · 가족 컷 순서" },
    { offsetMin: 210, event: "의상 체인지 (두 번째 컨셉)", note: "10~15분 소요" },
    { offsetMin: 240, event: "두 번째 컨셉 촬영" },
  ];
  if (input.hasOutdoor) {
    items.push({ offsetMin: 330, event: "야외 촬영 장소로 이동", note: "이동 동선/주차 사전 확인" });
    items.push({ offsetMin: 360, event: "야외 스냅 촬영", note: "골든아워(일몰 1시간 전) 활용" });
    items.push({ offsetMin: 450, event: "촬영 종료 · 의상 반납" });
  } else {
    items.push({ offsetMin: 330, event: "보정 컷/추가 컨셉 촬영" });
    items.push({ offsetMin: 390, event: "촬영 종료 · 의상 반납" });
  }
  return items;
};

const CEREMONY_ITEMS = (input: TimelineInput, weddingStyle: WeddingStyle): TimelineItem[] => {
  if (weddingStyle === "small" || weddingStyle === "self") {
    // Mini ceremony (~25-30분), 한옥/하우스/정원형
    const items: TimelineItem[] = [
      { offsetMin: -90, event: "신부 메이크업/헤어 마무리", note: weddingStyle === "self" ? "셀프 또는 친구 도움" : "스몰웨딩은 진하지 않게" },
      { offsetMin: -75, event: "신랑·신부 의상 착장 · 부케 확인" },
      { offsetMin: -60, event: "장소 셋업 점검 · BGM 사운드 체크", note: "스피커/마이크/조명" },
      { offsetMin: -45, event: "양가 가족 도착 · 가족 사진 촬영" },
      { offsetMin: -30, event: "친한 친구·하객 도착 · 웰컴 드링크 안내" },
      { offsetMin: -10, event: "하객 착석 · 인사 마무리" },
      { offsetMin: 0, event: "예식 시작 · 함께 입장 (또는 신부 입장)" },
      { offsetMin: 3, event: "주례 또는 진행자 인사 / 짧은 덕담" },
      { offsetMin: 8, event: "혼인서약 · 반지 교환" },
      { offsetMin: 13, event: "축가 또는 부모님께 편지 낭독" },
      { offsetMin: 20, event: "성혼 선언 · 단체 사진" },
      { offsetMin: 25, event: "예식 마무리 · 피로연(가든파티/식사) 시작" },
      { offsetMin: 90, event: "신랑신부 테이블 인사 · 자유 환담" },
      { offsetMin: 150, event: "마무리 · 정리" },
    ];
    return items;
  }

  // General wedding: 표준 45분 예식
  const items: TimelineItem[] = [
    { offsetMin: -150, event: "신부 메이크업/헤어 시작", note: "본식보다 1시간 전 마무리" },
    { offsetMin: -120, event: "신랑 도착 · 의상 착장" },
    { offsetMin: -90, event: "양가 부모님 도착 · 폐백 준비", note: "한복/예복 확인" },
    { offsetMin: -75, event: "신부 대기실 입장 · 친지/하객 사진" },
    { offsetMin: -60, event: "원판/가족 단체사진 촬영", note: "양가 가족 + 친지 그룹" },
    { offsetMin: -40, event: "축의대/안내 데스크 오픈" },
    { offsetMin: -10, event: "하객 착석 안내", note: "사회자 마이크 체크" },
    { offsetMin: 0, event: "예식 시작 · 신랑 입장" },
    { offsetMin: 2, event: "신부 입장" },
    { offsetMin: 5, event: "주례/예식 진행" },
    { offsetMin: 20, event: "성혼 선언 · 축가" },
    { offsetMin: 25, event: "양가 부모님 인사 · 축하 영상" },
    { offsetMin: 32, event: "신랑신부 행진 · 폐식" },
    { offsetMin: 35, event: "단체 기념사진 (양가 + 친구)", note: "사진 담당자 큐 확인" },
  ];
  const pyebaekMin = PYEBAEK_DURATION_MIN[input.pyebaekType];
  if (input.pyebaekType === "informal") {
    items.push({ offsetMin: 50, event: "약식 폐백", note: "양가 부모님만, 10분 이내 마무리" });
  } else if (input.pyebaekType === "traditional") {
    items.push({ offsetMin: 55, event: "전통 폐백", note: "양가 친지 포함, 25분 내외 · 폐백 음식 사전 확인" });
  }
  items.push({ offsetMin: 50 + pyebaekMin + 5, event: "피로연/식사 시작" });
  items.push({ offsetMin: 150, event: "신랑신부 인사 · 마무리" });
  return items;
};

const GUEST_ITEMS = (): TimelineItem[] => [
  { offsetMin: -60, event: "웨딩홀 도착 권장 시간", note: "주차 만석 대비 여유 있게" },
  { offsetMin: -45, event: "축의대 접수 · 식사권 수령" },
  { offsetMin: -30, event: "신부 대기실 방문 (선택)", note: "사진 촬영 가능" },
  { offsetMin: -10, event: "예식장 착석", note: "휴대폰 무음 설정 부탁드려요" },
  { offsetMin: 0, event: "예식 시작" },
  { offsetMin: 35, event: "예식 종료 · 단체사진" },
  { offsetMin: 45, event: "피로연장으로 이동 · 식사", note: "식사권 제시" },
  { offsetMin: 150, event: "자유 퇴장" },
];

const SNAP_CHECKLIST = [
  "본식 드레스/턱시도 외 두 번째 컨셉 의상",
  "구두/액세서리 일체",
  "메이크업 수정용 파우치",
  "촬영 동선 메모 · 컨셉 레퍼런스 이미지",
  "간단한 간식/음료(저당 위주)",
  "촬영 끝나고 갈아입을 편한 옷",
];

const CEREMONY_CHECKLIST = [
  "신분증/계약서 사본",
  "본식 의상 + 여분 양말/스타킹",
  "신부 부케 · 신랑 부토니에",
  "결혼반지",
  "양가 부모님 코사지/한복 소품",
  "축의금 봉투 보관용 가방",
  "응급 키트(반창고, 진통제, 핀, 양면테이프)",
];

const GUEST_CHECKLIST = [
  "축의금 봉투 (이름 기재)",
  "초대장/모바일 청첩장 캡처",
  "주차권 또는 대중교통 정보",
  "예식장 위치 지도/네비",
];

const SNAP_TIPS = [
  "촬영장 도착은 콜타임보다 20~30분 일찍이 안전해요",
  "골든아워(일몰 1시간 전)는 야외 스냅 최고의 시간이에요",
  "메이크업 수정 도구는 셀프 휴대 권장 (헬퍼 부재 대비)",
  "이동 중 차량 안에서 의상 구김 방지용 옷걸이 활용",
];

const CEREMONY_TIPS = [
  "신부 메이크업은 본식 1시간 전 완료가 가장 안정적이에요",
  "원판/가족 사진은 예식 전이 가장 자연스럽고 빠르게 끝나요",
  "축의대는 예식 40분 전부터 오픈해 늦은 하객도 받으세요",
  "폐백 진행 시 핸드폰/지갑은 가방순이에게 미리 인계하세요",
];

const GUEST_TIPS = [
  "주차장이 협소할 수 있으니 30분~1시간 여유를 두고 도착하세요",
  "식사권은 분실 시 재발급이 어려우니 잘 보관해주세요",
  "포토타임 단체사진은 예식 직후 진행되니 자리를 비우지 마세요",
];

const SELF_SNAP_CHECKLIST = [
  "촬영 장비 (카메라, 렌즈, 삼각대, SD카드 여분, 배터리 풀충전)",
  "셀프 의상 (드레스/턱시도 + 두 번째 컨셉)",
  "구두/액세서리 · 부케 (또는 DIY 부케 자재)",
  "셀프 메이크업 도구 (수정용 파우치 포함)",
  "촬영 컨셉 레퍼런스/포즈 카드",
  "친구 촬영자 보조용 의자/모니터",
  "데이터 백업용 노트북 또는 외장 하드",
];

const SMALL_CEREMONY_CHECKLIST = [
  "신분증 / 계약서",
  "신랑·신부 본식 의상 + 부케",
  "결혼반지 · 코사지",
  "BGM 플레이리스트 (USB or 스마트폰)",
  "마이크/스피커 사용법 (장소에 따라 직접 조작)",
  "가든파티 음료/간식 (셀프 진행 시)",
  "응급 키트 (반창고, 핀, 양면테이프, 진통제)",
];

const SELF_TIPS = [
  "셀프 메이크업은 사전 리허설을 꼭 해보세요 (조명 차이 큼)",
  "친구 촬영자에게 사전 컨셉 카드를 공유해주세요",
  "DIY 부케/소품은 전날 미리 조립 완료 권장",
  "촬영 중 자주 SD카드 확인 (용량/저장 오류 대비)",
];

const SMALL_TIPS = [
  "30분 미니 예식은 진행자 멘트 길이를 미리 정해두세요",
  "장소에 음향 시스템이 빈약할 수 있어요 - 블루투스 스피커 챙기기",
  "가든파티는 비/추위 대비 우천 시 플랜B를 정해두세요",
  "양가 부모님과 진행 흐름을 사전에 한 번 더 공유해주세요",
];

const buildTimeline = (type: TimelineType, input: TimelineInput, weddingStyle: WeddingStyle): {
  items: { time: string; event: string; note?: string }[];
  checklist: string[];
  tips: string[];
} => {
  const itemsRaw =
    type === "timeline-snap" ? SNAP_ITEMS(input, weddingStyle) :
    type === "timeline-ceremony" ? CEREMONY_ITEMS(input, weddingStyle) :
    GUEST_ITEMS();

  const items = itemsRaw.map((it) => ({
    time: offsetTime(input.ceremonyTime, it.offsetMin),
    event: it.event,
    note: it.note,
  }));

  let checklist =
    type === "timeline-snap" ? SNAP_CHECKLIST :
    type === "timeline-ceremony" ? CEREMONY_CHECKLIST :
    GUEST_CHECKLIST;

  let tips =
    type === "timeline-snap" ? SNAP_TIPS :
    type === "timeline-ceremony" ? CEREMONY_TIPS :
    GUEST_TIPS;

  // Style-specific overrides
  if (type === "timeline-snap" && weddingStyle === "self") {
    checklist = SELF_SNAP_CHECKLIST;
    tips = [...SELF_TIPS, ...tips.slice(0, 2)];
  }
  if (type === "timeline-ceremony" && (weddingStyle === "small" || weddingStyle === "self")) {
    checklist = SMALL_CEREMONY_CHECKLIST;
    tips = [...SMALL_TIPS, ...tips.slice(0, 2)];
  }

  // 하객 안내 타임라인: 연령 비중에 따라 팁을 풀에서 선택
  if (type === "timeline-guest") {
    const ageTipPool = GUEST_TIMELINE_TIPS_BY_AGE[input.guestAgeMix] ?? GUEST_TIMELINE_TIPS_BY_AGE.balanced;
    const seed = hashSeed(`${input.groomName}${input.brideName}${input.date}guest`);
    const a = pickFromPool(ageTipPool, seed);
    const b = pickFromPool(ageTipPool, seed, 1);
    const c = pickFromPool(ageTipPool, seed, 2);
    const ageTips = Array.from(new Set([a, b, c]));
    tips = [...ageTips, ...tips.slice(0, 2)];
  }

  return { items, checklist, tips };
};

const TimelineSheet = ({ open, onClose }: TimelineSheetProps) => {
  const profile = useWeddingProfile();
  const [step, setStep] = useState<"input" | "loading" | "done">("input");
  const [date, setDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [ceremonyTime, setCeremonyTime] = useState("12:00");
  const [groomName, setGroomName] = useState("");
  const [brideName, setBrideName] = useState("");
  const [pyebaekType, setPyebaekType] = useState<PyebaekType>("traditional");
  const [hasOutdoor, setHasOutdoor] = useState(false);
  const [extraNotes, setExtraNotes] = useState("");
  const [guestAgeMix, setGuestAgeMix] = useState<GuestAgeMix>("balanced");
  const [prefillApplied, setPrefillApplied] = useState(false);

  useEffect(() => {
    if (!open || prefillApplied || !profile.isLoaded) return;
    if (profile.weddingDate) setDate(profile.weddingDate);
    if (profile.displayName) setGroomName(profile.displayName);
    if (profile.partnerName) setBrideName(profile.partnerName);
    setPrefillApplied(true);
  }, [open, prefillApplied, profile]);

  useEffect(() => {
    if (!open) setPrefillApplied(false);
  }, [open]);

  if (!open) return null;
  const type = open as TimelineType;
  const meta = typeLabels[type];
  const hasPrefill = profile.isLoaded && (!!profile.weddingDate || !!profile.partnerName || !!profile.displayName);

  const handleGenerate = () => {
    setStep("loading");
    setTimeout(async () => {
      try {
        const input: TimelineInput = {
          date, venueName, venueAddress, ceremonyTime,
          groomName, brideName, pyebaekType, hasOutdoor, extraNotes, guestAgeMix,
        };
        const data = buildTimeline(type, input, profile.weddingStyle);

        const couple = groomName && brideName ? `${groomName} ♥ ${brideName}` : "";
        let html = generatePdfHeader(meta.title, couple || undefined, {
          couple: couple || undefined,
          weddingDate: date || undefined,
          styleLabel: WEDDING_STYLE_LABEL[profile.weddingStyle],
        });
        html += `<div class="pdf-info-grid">
          <div class="pdf-info-item"><div class="pdf-info-label">날짜</div><div class="pdf-info-value">${date || "-"}</div></div>
          <div class="pdf-info-item"><div class="pdf-info-label">장소</div><div class="pdf-info-value">${venueName || "-"}</div></div>
          <div class="pdf-info-item"><div class="pdf-info-label">${type === "timeline-snap" ? "촬영 시작" : "예식 시간"}</div><div class="pdf-info-value">${ceremonyTime}</div></div>
          <div class="pdf-info-item"><div class="pdf-info-label">주소</div><div class="pdf-info-value">${venueAddress || "-"}</div></div>
        </div>`;

        html += `<div class="pdf-section"><div class="pdf-section-title">⏰ 시간별 일정</div><div class="pdf-timeline">`;
        for (const item of data.items) {
          html += `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div>
            <div class="pdf-timeline-time">${item.time}</div>
            <div class="pdf-timeline-event">${item.event}</div>
            ${item.note ? `<div class="pdf-timeline-note">${item.note}</div>` : ""}
          </div>`;
        }
        html += `</div></div>`;

        html += `<div class="pdf-section"><div class="pdf-section-title">✅ 준비물 체크리스트</div><ul class="pdf-checklist">`;
        for (const item of data.checklist) html += `<li>${item}</li>`;
        html += `</ul></div>`;

        html += `<div class="pdf-section"><div class="pdf-section-title">💡 주의사항</div>`;
        for (const tip of data.tips) html += `<div class="pdf-tip">${tip}</div>`;
        html += `</div>`;

        if (extraNotes.trim()) {
          html += `<div class="pdf-section"><div class="pdf-section-title">📝 추가 메모</div><div class="pdf-highlight" style="font-size:12px;">${extraNotes.replace(/\n/g, "<br/>")}</div></div>`;
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
    }, 300);
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
            {hasPrefill && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-primary leading-relaxed">
                  등록된 결혼 정보(예식일·이름)를 자동으로 불러왔어요. 필요하면 수정해주세요.
                </p>
              </div>
            )}
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
            {type === "timeline-snap" && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hasOutdoor} onChange={(e) => setHasOutdoor(e.target.checked)} className="rounded" /> 야외촬영 포함</label>
            )}
            {type === "timeline-ceremony" && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">폐백 형식</label>
                <select
                  value={pyebaekType}
                  onChange={(e) => setPyebaekType(e.target.value as PyebaekType)}
                  className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none"
                >
                  {(Object.keys(PYEBAEK_LABEL) as PyebaekType[]).map((key) => (
                    <option key={key} value={key}>{PYEBAEK_LABEL[key]}</option>
                  ))}
                </select>
              </div>
            )}
            {type === "timeline-guest" && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">하객 연령 비중</label>
                <select
                  value={guestAgeMix}
                  onChange={(e) => setGuestAgeMix(e.target.value as GuestAgeMix)}
                  className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none"
                >
                  {(Object.keys(GUEST_AGE_MIX_LABEL) as GuestAgeMix[]).map((key) => (
                    <option key={key} value={key}>{GUEST_AGE_MIX_LABEL[key]}</option>
                  ))}
                </select>
                <p className="text-[10.5px] text-muted-foreground mt-1 leading-snug">{GUEST_AGE_MIX_HINT[guestAgeMix]}</p>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">특이사항 (선택)</label>
              <textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} rows={2} placeholder="예: 야외촬영 시 우천 대안 필요" className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none resize-none" />
            </div>
            <button onClick={handleGenerate} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> 타임라인 PDF 다운로드
            </button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-medium text-foreground">타임라인을 정리하고 있어요...</p>
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
