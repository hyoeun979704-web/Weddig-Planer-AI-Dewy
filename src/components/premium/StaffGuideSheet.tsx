import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { Loader2, Eye, Sparkles } from "lucide-react";
import {
  generatePdfHeader,
  generatePdfFooter,
  pdfInfoGrid,
  pdfSection,
  esc,
} from "@/lib/pdfGenerator";
import PdfPreviewModal from "@/components/premium/PdfPreviewModal";
import { useWeddingProfile } from "@/hooks/useWeddingProfile";
import { WEDDING_STYLE_LABEL, type WeddingStyle } from "@/lib/weddingStyle";
import {
  type GuestAgeMix,
  type PyebaekType,
  GUEST_AGE_MIX_LABEL,
  GUEST_AGE_MIX_HINT,
  PYEBAEK_LABEL,
  MC_OPENING, MC_AFTER_DECLARATION, MC_CLOSING,
  PARENT_OPENING, PARENT_CLOSING,
  BAG_STAFF_THANKS, RECEPTION_THANKS, RECEPTION_TIPS_BY_AGE,
  VIP_RECEPTION_TIPS, HWAHWAN_GUIDE,
  SELF_HOSTED_GUIDE, SELF_HOSTED_OPENING,
  LIVE_STREAM_OPENING, LIVE_STREAM_CLOSING,
  mentToneFor, pickFromPool, hashSeed, formatPhrase,
} from "@/lib/pdfPhrasings";
import { toast } from "sonner";

type StaffType = "staff-gabang" | "staff-reception" | "staff-mc" | "staff-parents";

interface StaffGuideSheetProps {
  open: StaffType | null;
  onClose: () => void;
}

const staffMeta: Record<StaffType, { title: string; emoji: string; filename: string }> = {
  "staff-gabang": { title: "가방순이 전달사항", emoji: "", filename: "가방순이_안내서" },
  "staff-reception": { title: "축의대 담당자 안내서", emoji: "", filename: "축의대_안내서" },
  "staff-mc": { title: "사회자 큐시트", emoji: "", filename: "사회자_큐시트" },
  "staff-parents": { title: "부모님 안내서", emoji: "", filename: "부모님_안내서" },
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
  pyebaekType: PyebaekType;
  guestAgeMix: GuestAgeMix;
  selfHosted: boolean;        // 신랑신부가 직접 사회 진행
  hasLiveStream: boolean;     // 인스타·유튜브 라이브 중계 운영
  hasVip: boolean;            // VIP/임원 손님 다수
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

const buildHeader = (info: StaffInfo, title: string, weddingStyle: WeddingStyle) => {
  const couple = info.groomName && info.brideName ? `${info.groomName} ♥ ${info.brideName}` : undefined;
  return generatePdfHeader(title, coupleSubtitle(info), {
    couple,
    weddingDate: info.weddingDate || undefined,
    styleLabel: WEDDING_STYLE_LABEL[weddingStyle],
  });
};

const staffTemplates: Record<StaffType, (info: StaffInfo, weddingStyle: WeddingStyle) => string> = {
  "staff-gabang": (info, weddingStyle) => {
    let html = buildHeader(info, "가방순이 전달사항", weddingStyle);
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
        ${info.pyebaekType !== "none" ? `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">폐백</div><div class="pdf-timeline-event">폐백실 동행 · 귀중품 보관</div></div>` : ""}
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
      "비상 연락처",
      `<table class="pdf-table"><tbody>
        <tr><td style="width:30%;">신부</td><td>${esc(info.bridePhone || "(                              )")}</td></tr>
        <tr><td>신랑</td><td>${esc(info.groomPhone || "(                              )")}</td></tr>
        <tr><td>웨딩홀 안내</td><td>(                              )</td></tr>
      </tbody></table>`,
    );

    html += `<div class="pdf-warning">⚠️ 절대 가방을 방치하지 마세요 · 축의금 봉투는 열어보지 마세요 · 편한 신발로 장시간 대비하세요</div>`;

    const seed = hashSeed(`${info.groomName}${info.brideName}${info.weddingDate}gabang`);
    const thanksLine = pickFromPool(BAG_STAFF_THANKS, seed);
    html += `<div class="pdf-tip">💝 ${thanksLine}</div>`;

    html += generatePdfFooter();
    return html;
  },

  "staff-reception": (info, weddingStyle) => {
    let html = buildHeader(info, "축의대 담당자 안내서", weddingStyle);
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
      "좌석 / 식사 안내",
      `<table class="pdf-table"><tbody>
        <tr><td style="width:30%;">신랑측 좌석</td><td>식장 입구 기준 왼쪽</td></tr>
        <tr><td>신부측 좌석</td><td>식장 입구 기준 오른쪽</td></tr>
        <tr><td>피로연 형태</td><td>${esc(info.mealType || "뷔페")}</td></tr>
        <tr><td>식사 시작</td><td>예식 종료 후 약 30분 후</td></tr>
      </tbody></table>
      <div class="pdf-tip">어르신/거동 불편 하객은 동선이 짧은 자리로 안내해드리면 좋아요</div>`,
    );

    html += pdfSection(
      "비상 연락처",
      `<table class="pdf-table"><tbody>
        <tr><td>신랑</td><td>${esc(info.groomPhone || "(                              )")}</td></tr>
        <tr><td>신부</td><td>${esc(info.bridePhone || "(                              )")}</td></tr>
        <tr><td>가방순이</td><td>(                              )</td></tr>
        <tr><td>웨딩홀</td><td>(                              )</td></tr>
      </tbody></table>`,
    );

    html += `<div class="pdf-warning">⚠️ 봉투 분실 시 즉시 신랑/신부 측에 알리고 CCTV 확인 요청 · 봉투에 이름 없는 경우 사진으로 봉투 모양/위치 기록</div>`;

    // 하객 연령 비중별 접수 팁 (해시로 결정론적 선택)
    const recSeed = hashSeed(`${info.groomName}${info.brideName}${info.weddingDate}reception`);
    const ageTips = RECEPTION_TIPS_BY_AGE[info.guestAgeMix] ?? RECEPTION_TIPS_BY_AGE.balanced;
    const tip1 = pickFromPool(ageTips, recSeed);
    const tip2 = pickFromPool(ageTips, recSeed, 1);
    let ageTipsHtml = "";
    for (const t of Array.from(new Set([tip1, tip2]))) {
      ageTipsHtml += `<div class="pdf-tip">💡 ${t}</div>`;
    }
    html += pdfSection(
      `🎯 ${GUEST_AGE_MIX_LABEL[info.guestAgeMix]} 응대 팁`,
      `<p style="font-size:11px;color:#6b7280;margin-bottom:8px;">${GUEST_AGE_MIX_HINT[info.guestAgeMix]}</p>${ageTipsHtml}`,
    );

    // VIP 응대 가이드 (회사 비중 또는 VIP 체크 시)
    if (info.hasVip || info.guestAgeMix === "work") {
      let vipHtml = `<ul class="pdf-bullet-list">`;
      for (const tip of VIP_RECEPTION_TIPS) vipHtml += `<li>${tip}</li>`;
      vipHtml += `</ul>`;
      html += pdfSection("👔 VIP · 임원 손님 응대", vipHtml);
    }

    // 화환·전보 답례 안내 (회사 비중 또는 VIP일 때 자주 필요)
    if (info.hasVip || info.guestAgeMix === "work") {
      let hwaHtml = `<ul class="pdf-bullet-list">`;
      for (const tip of HWAHWAN_GUIDE) hwaHtml += `<li>${tip}</li>`;
      hwaHtml += `</ul>`;
      html += pdfSection("🌸 화환·전보 응대 및 답례", hwaHtml);
    }

    const thanksRec = pickFromPool(RECEPTION_THANKS, recSeed);
    html += `<div class="pdf-highlight">💝 ${thanksRec}</div>`;

    html += generatePdfFooter();
    return html;
  },

  "staff-mc": (info, weddingStyle) => {
    let html = buildHeader(info, "사회자 큐시트", weddingStyle);
    html += sharedInfoGrid(info);

    const isCasual = weddingStyle === "small" || weddingStyle === "self";
    const tone = mentToneFor(weddingStyle, info.guestAgeMix);
    const mcSeed = hashSeed(`${info.groomName}${info.brideName}${info.weddingDate}mc`);
    const vars = {
      groom: info.groomName || "신랑",
      bride: info.brideName || "신부",
      venue: info.venueName || "피로연장",
    };
    // 멘트 안에 들어가는 사용자 입력 이름·장소를 미리 escape해서 formatPhrase에 전달.
    // formatPhrase가 단순 치환이므로 여기서 escape하면 raw HTML에 안전하게 박힘.
    const safeVars = { groom: esc(vars.groom), bride: esc(vars.bride), venue: esc(vars.venue) };
    // 신랑신부 본인 사회면 셀프 진행용 개식 멘트로 교체
    const baseOpening = info.selfHosted
      ? pickFromPool(SELF_HOSTED_OPENING, mcSeed)
      : pickFromPool(MC_OPENING[tone], mcSeed);
    const opening = formatPhrase(baseOpening, safeVars);
    const afterDecl = formatPhrase(pickFromPool(MC_AFTER_DECLARATION[tone], mcSeed, 1), safeVars);
    const closing = formatPhrase(pickFromPool(MC_CLOSING[tone], mcSeed, 2), safeVars);
    const liveOpening = info.hasLiveStream ? pickFromPool(LIVE_STREAM_OPENING, mcSeed) : "";
    const liveClosing = info.hasLiveStream ? pickFromPool(LIVE_STREAM_CLOSING, mcSeed, 1) : "";

    const generalCue = [
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

    const casualCue = [
      { order: 1, event: "환영 인사 · 분위기 환기", duration: "2분", time: "−3", cue: "편하게 자리 안내, 음악 볼륨 체크" },
      { order: 2, event: "신랑·신부 함께 입장", duration: "2분", time: "0", cue: "BGM 시작 신호" },
      { order: 3, event: "두 사람의 이야기 (만남~결혼)", duration: "3분", time: "+2", cue: "사회자 또는 친구 진행" },
      { order: 4, event: "혼인서약 · 반지 교환", duration: "3분", time: "+5", cue: "반지 위치 확인" },
      { order: 5, event: "축가 또는 부모님께 편지", duration: "4분", time: "+8", cue: "마이크 전달 타이밍" },
      { order: 6, event: "성혼 선언 · 단체 사진", duration: "5분", time: "+12", cue: "포토그래퍼 위치 큐" },
      { order: 7, event: "가든파티/피로연 안내", duration: "2분", time: "+18", cue: "BGM 변경 · 자리 이동 유도" },
      { order: 8, event: "자유 환담 · 마무리", duration: "-", time: "+20", cue: "신랑신부 테이블 인사 동선 확인" },
    ];

    const cueItems = isCasual ? casualCue : generalCue;

    let cueTable = `<table class="pdf-table"><thead><tr><th>#</th><th>순서</th><th>예식+분</th><th>소요</th><th>큐/멘트 포인트</th></tr></thead><tbody>`;
    for (const item of cueItems) {
      cueTable += `<tr><td>${item.order}</td><td><strong>${item.event}</strong></td><td>${item.time}</td><td>${item.duration}</td><td>${item.cue}</td></tr>`;
    }
    cueTable += `</tbody></table>`;
    html += pdfSection(isCasual ? "🎬 식순 및 큐 (간소 진행)" : "🎬 식순 및 큐 타이밍", cueTable);

    const toneLabel = info.selfHosted ? "신랑신부 직접 사회 · 1인칭 톤" : (
      tone === "formal_elder" ? "격식체 · 어르신 비중 높음" :
      tone === "formal_work" ? "격식체 · 회사/지인 비중 높음" :
      tone === "warm_family" ? "따뜻한 톤 · 가족 위주" :
      "편안한 톤 · 또래 위주"
    );

    const mentScripts = `<p style="font-size:10.5px;color:#9ca3af;margin-bottom:8px;">
        톤: <strong>${toneLabel}</strong> (하객 연령 비중·진행 형식에 맞춰 자동 선택)
      </p>
      <div class="pdf-highlight">
        <strong style="color:#F4A7B9;">개식 멘트 (예시)</strong><br/>
        "${opening}"
      </div>
      ${liveOpening ? `<div class="pdf-highlight" style="margin-top:8px;background:#eff6ff;">
        <strong style="color:#3b82f6;">📡 라이브 시작 멘트</strong><br/>
        "${liveOpening}"
      </div>` : ""}
      <div class="pdf-highlight" style="margin-top:8px;">
        <strong style="color:#F4A7B9;">성혼 선언 후 멘트 (예시)</strong><br/>
        "${afterDecl}"
      </div>
      <div class="pdf-highlight" style="margin-top:8px;">
        <strong style="color:#F4A7B9;">폐식 멘트 (예시)</strong><br/>
        "${closing}"
      </div>
      ${liveClosing ? `<div class="pdf-highlight" style="margin-top:8px;background:#eff6ff;">
        <strong style="color:#3b82f6;">📡 라이브 마무리 멘트</strong><br/>
        "${liveClosing}"
      </div>` : ""}`;

    html += pdfSection("🎤 멘트 가이드", mentScripts);

    // 신랑신부 본인 사회면 셀프 진행 팁 섹션 추가
    if (info.selfHosted) {
      let selfHostedHtml = `<ul class="pdf-bullet-list">`;
      for (const tip of SELF_HOSTED_GUIDE) selfHostedHtml += `<li>${tip}</li>`;
      selfHostedHtml += `</ul>`;
      html += pdfSection("🎙️ 직접 사회 진행 팁", selfHostedHtml);
    }

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

  "staff-parents": (info, weddingStyle) => {
    let html = buildHeader(info, "부모님 안내서", weddingStyle);
    html += sharedInfoGrid(info);

    // 톤 라우팅 & 풀에서 인사말 선택
    const parentTone = mentToneFor(weddingStyle, info.guestAgeMix);
    const parentSeed = hashSeed(`${info.groomName}${info.brideName}${info.weddingDate}parent`);
    const opening = pickFromPool(PARENT_OPENING[parentTone], parentSeed);
    html += `<div class="pdf-highlight">${opening}</div>`;

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
        ${info.pyebaekType === "traditional"
          ? `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">폐백 (전통)</div><div class="pdf-timeline-event">폐백실 이동 · 한복 착용 · 양가 친지 인사 (25분 내외)</div></div>`
          : info.pyebaekType === "informal"
            ? `<div class="pdf-timeline-item"><div class="pdf-timeline-dot"></div><div class="pdf-timeline-time">폐백 (약식)</div><div class="pdf-timeline-event">양가 부모님만 짧게 인사 (10분 이내) · 한복은 선택</div></div>`
            : ""}
      </div>`,
    );

    const isCasualStyle = weddingStyle === "small" || weddingStyle === "self";

    const formalDress = `<table class="pdf-table"><tbody>
        <tr><td style="width:35%;">🤵 신랑 아버지</td><td>다크 양복 정장 + 흰 와이셔츠 (보타이 또는 단정한 넥타이)</td></tr>
        <tr><td>🤵 신랑 어머니</td><td>한복 또는 단정한 양장 (밝은 톤 추천)</td></tr>
        <tr><td>👰 신부 아버지</td><td>다크 양복 정장 (신랑 측과 톤 매치)</td></tr>
        <tr><td>👰 신부 어머니</td><td>한복 또는 단정한 양장 (밝은 톤 추천)</td></tr>
      </tbody></table>
      <div class="pdf-tip">💡 양가 어머니 복장 톤을 미리 맞추면 사진 결과가 훨씬 조화로워요 (예: 둘 다 파스텔 / 둘 다 정장)</div>`;

    const casualDress = `<table class="pdf-table"><tbody>
        <tr><td style="width:35%;">🤵 신랑 아버지</td><td>깔끔한 정장 (다크/그레이 계열) 또는 단정한 캐주얼 정장</td></tr>
        <tr><td>🤵 신랑 어머니</td><td>단정한 원피스 또는 투피스 (한복은 선택)</td></tr>
        <tr><td>👰 신부 아버지</td><td>정장 (신랑 측과 톤 매치)</td></tr>
        <tr><td>👰 신부 어머니</td><td>단정한 원피스 또는 투피스 (한복은 선택)</td></tr>
      </tbody></table>
      <div class="pdf-tip">💡 ${weddingStyle === "self" ? "셀프웨딩은 사진의 자연스러움이 중요해요. 결혼식 컨셉 톤에 맞춰 양가 의상을 매치해주세요" : "스몰웨딩은 격식보다 자연스러움이 포인트예요. 무리해서 한복을 준비하지 않아도 괜찮아요"}</div>`;

    html += pdfSection("👔 복장 안내", isCasualStyle ? casualDress : formalDress);

    const formalBring = `<ul class="pdf-checklist">
        <li>지정된 코사지/한복 액세서리</li>
        <li>한복 또는 정장 (변경용 옷 1벌 포함)</li>
        <li>편한 신발 (예식 외 시간용)</li>
        <li>축의금 답례용 작은 답례품 (선택)</li>
        <li>가족 사진용 손수건/소품</li>
        <li>휴대폰 충전기 (장시간 대비)</li>
      </ul>`;

    const casualBring = `<ul class="pdf-checklist">
        <li>코사지 또는 작은 부토니에 (양가 색상 매치)</li>
        <li>예식 의상 + 가든파티/피로연용 가벼운 카디건</li>
        <li>편한 신발 (장소에 따라 야외 보행 대비)</li>
        <li>가족 사진용 손수건</li>
        <li>휴대폰 충전기 (장시간 대비)</li>
        <li>비/햇빛 대비 우산·양산 (야외 진행 시)</li>
      </ul>`;

    html += pdfSection("💐 챙기면 좋은 것", isCasualStyle ? casualBring : formalBring);

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

    const closingLine = pickFromPool(PARENT_CLOSING[parentTone], parentSeed, 1);
    html += `<div class="pdf-note">📌 ${closingLine}</div>`;

    html += generatePdfFooter();
    return html;
  },
};

const StaffGuideSheet = ({ open, onClose }: StaffGuideSheetProps) => {
  const profile = useWeddingProfile();
  const [generating, setGenerating] = useState(false);
  const [htmlResult, setHtmlResult] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [info, setInfo] = useState<StaffInfo>({
    weddingDate: "", ceremonyTime: "12:00", venueName: "", venueAddress: "",
    groomName: "", brideName: "", groomPhone: "", bridePhone: "",
    expectedGuests: 200, mealType: "뷔페",
    pyebaekType: "traditional", guestAgeMix: "balanced",
    selfHosted: false, hasLiveStream: false, hasVip: false,
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
      const html = template(info, profile.weddingStyle);
      setHtmlResult(html);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
    <Sheet open={!!open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="app-col mx-auto rounded-t-3xl max-h-[85vh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>{meta.title}</SheetTitle>
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
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">하객 연령 비중</label>
            <select
              value={info.guestAgeMix}
              onChange={(e) => updateField("guestAgeMix", e.target.value as GuestAgeMix)}
              className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none"
            >
              {(Object.keys(GUEST_AGE_MIX_LABEL) as GuestAgeMix[]).map((key) => (
                <option key={key} value={key}>{GUEST_AGE_MIX_LABEL[key]}</option>
              ))}
            </select>
            <p className="text-[10.5px] text-muted-foreground mt-1 leading-snug">{GUEST_AGE_MIX_HINT[info.guestAgeMix]}</p>
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
          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">폐백 형식</label>
            <select
              value={info.pyebaekType}
              onChange={(e) => updateField("pyebaekType", e.target.value as PyebaekType)}
              className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none"
            >
              {(Object.keys(PYEBAEK_LABEL) as PyebaekType[]).map((key) => (
                <option key={key} value={key}>{PYEBAEK_LABEL[key]}</option>
              ))}
            </select>
          </div>
          {type === "staff-reception" && (
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">피로연 식사</label>
              <select value={info.mealType} onChange={(e) => updateField("mealType", e.target.value)} className="w-full px-3 py-2 bg-muted rounded-xl text-sm outline-none">
                <option value="뷔페">뷔페</option>
                <option value="코스">코스</option>
                <option value="한식">한식</option>
                <option value="한 상 차림">한 상 차림 (소규모)</option>
              </select>
            </div>
          )}
          {type === "staff-mc" && (
            <div className="space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={info.selfHosted} onChange={(e) => updateField("selfHosted", e.target.checked)} className="rounded" />
                신랑신부가 직접 사회를 봅니다
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={info.hasLiveStream} onChange={(e) => updateField("hasLiveStream", e.target.checked)} className="rounded" />
                인스타·유튜브 라이브 중계를 진행합니다
              </label>
            </div>
          )}
          {type === "staff-reception" && (
            <label className="flex items-center gap-2 text-sm p-3 rounded-xl bg-muted/50 border border-border">
              <input type="checkbox" checked={info.hasVip} onChange={(e) => updateField("hasVip", e.target.checked)} className="rounded" />
              VIP·임원 손님이 많이 옵니다 (별도 응대 가이드 추가)
            </label>
          )}
          <button onClick={handleGenerate} disabled={generating} className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {generating ? "생성 중..." : "안내서 미리보기"}
          </button>
        </div>
      </SheetContent>
    </Sheet>

    <PdfPreviewModal
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      html={htmlResult}
      filename={`듀이_${meta.filename}_${info.weddingDate || "안내서"}.pdf`}
      title={`${meta.title} 미리보기`}
    />
    </>
  );
};

export default StaffGuideSheet;
