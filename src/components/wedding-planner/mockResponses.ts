// --- Venue Mock Response ---
const venuesByRegion: Record<string, { name: string; location: string; capacity: string; price: string; features: string[] }[]> = {
  "서울 강남/서초": [
    { name: "파크하얏트서울", location: "서울 강남구 테헤란로", capacity: "200~400", price: "2,000~3,500", features: ["호텔 웨딩 특유의 프리미엄 서비스", "미슐랭 셰프의 코스 요리 제공", "도심 속 탁 트인 전망 포토존"] },
    { name: "그랜드인터컨티넨탈 서울 파르나스", location: "서울 강남구 봉은사로", capacity: "150~350", price: "1,800~3,000", features: ["럭셔리 웨딩홀 2개 보유", "호텔 숙박 패키지 연계 가능", "전문 웨딩 코디네이터 배정"] },
    { name: "더채플앳청담", location: "서울 강남구 청담동", capacity: "80~150", price: "1,500~2,500", features: ["독립 채플 구조로 프라이빗한 예식", "자연광 스테인드글라스", "소규모 맞춤 웨딩 전문"] },
  ],
  "부산": [
    { name: "파라다이스호텔 부산", location: "부산 해운대구 해운대해변로", capacity: "200~500", price: "1,500~2,800", features: ["해운대 오션뷰 예식장", "야외 가든 & 실내 홀 선택 가능", "하객 숙박 특가 제공"] },
    { name: "롯데호텔 부산", location: "부산 부산진구 가야대로", capacity: "150~400", price: "1,200~2,500", features: ["부산역 접근성 우수", "다양한 홀 규모 선택 가능", "뷔페 & 코스 모두 가능"] },
    { name: "해운대그랜드호텔", location: "부산 해운대구 해운대로", capacity: "100~300", price: "1,000~2,000", features: ["해운대 중심 위치", "합리적 가격대", "넓은 주차 시설"] },
  ],
  "제주": [
    { name: "신라호텔 제주", location: "제주 서귀포시 중문관광로", capacity: "100~300", price: "2,000~4,000", features: ["제주 최고급 호텔 웨딩", "한라산 뷰 가든 예식 가능", "스위트룸 허니문 패키지"] },
    { name: "해비치호텔앤드리조트", location: "제주 서귀포시 표선면", capacity: "80~250", price: "1,500~3,000", features: ["프라이빗 비치 포토존", "야외 잔디 웨딩 전문", "제주 로컬 푸드 코스 요리"] },
    { name: "메종글래드 제주", location: "제주 제주시 노형동", capacity: "100~200", price: "1,000~2,000", features: ["모던 스타일 웨딩홀", "합리적 가격의 호텔 웨딩", "공항 10분 접근성"] },
  ],
};

const defaultVenues = [
  { name: "노블레스 웨딩홀", location: "접근성 좋은 시내 중심부", capacity: "150~350", price: "1,000~2,000", features: ["깔끔한 모던 인테리어", "넓은 대기 공간", "전문 웨딩 코디네이터"] },
  { name: "더 가든 하우스", location: "도심 근교 자연환경", capacity: "80~200", price: "800~1,500", features: ["야외 가든 포토존", "프라이빗 예식 가능", "자연 채광 채플"] },
  { name: "그랜드 컨벤션", location: "교통 허브 인근", capacity: "200~500", price: "1,200~2,500", features: ["대규모 하객 수용", "넓은 주차장", "뷔페 & 코스 선택 가능"] },
];

export function generateVenueResponse(data: {
  region: string;
  date: string;
  guests: string;
  budget: string;
  styles: string[];
  parking?: string;
  meal?: string;
  special?: string;
}) {
  const venues = venuesByRegion[data.region] || defaultVenues;
  const venueCards = venues.map(v =>
    `<div style="background:#F8F8F8;border-radius:12px;padding:14px;margin-bottom:10px;">
      <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${v.name} <span style="color:#C9A96E;">⭐ 4.8</span></div>
      <div style="font-size:13px;color:#666;margin-bottom:6px;">📍 ${v.location} · 👥 ~${v.capacity}명 · 💰 ${v.price}만원</div>
      <div style="font-size:13px;">${v.features.map(f => `✅ ${f}`).join('<br/>')}</div>
    </div>`
  ).join('');

  return `${data.region} 지역에서 ${data.date}에 ${data.guests}명 규모의 웨딩홀을 찾고 계시는군요! 💒\n\n선호 스타일 (${data.styles.join(', ')})과 예산 (${data.budget})에 맞춰 추천드립니다.\n\n${venueCards}\n\n<div style="background:#F8F8F8;border-radius:12px;padding:14px;margin-top:8px;"><b>📌 예약 시 확인할 체크리스트</b><br/>• 계약금 환불 규정 및 날짜 변경 가능 여부 확인<br/>• 식대 1인당 단가 및 최소 보증 인원 확인<br/>• 주차 가능 대수 및 발렛 서비스 유무 확인</div>`;
}

// --- SdMe Mock Response ---
export function generateSdmeResponse(data: {
  region: string;
  date: string;
  studioStyle: string;
  makeup: string;
  budget: string;
  priority?: string;
}) {
  const budgetRanges: Record<string, { studio: string[]; dress: string[]; makeup: string[] }> = {
    "200만원 이하": { studio: ["60", "80", "100"], dress: ["50", "70", "90"], makeup: ["20", "30", "40"] },
    "200~350만원": { studio: ["80", "120", "150"], dress: ["80", "110", "140"], makeup: ["30", "50", "70"] },
    "350~500만원": { studio: ["120", "160", "200"], dress: ["120", "160", "200"], makeup: ["50", "70", "100"] },
    "500~700만원": { studio: ["180", "220", "280"], dress: ["160", "220", "280"], makeup: ["60", "90", "130"] },
    "700만원 이상": { studio: ["250", "350", "500"], dress: ["200", "300", "450"], makeup: ["80", "120", "180"] },
  };
  const r = budgetRanges[data.budget] || budgetRanges["350~500만원"];

  return `${data.region} 기준 ${data.budget} 스드메 패키지 견적을 분석해드릴게요 💄\n\n<div style="background:#F8F8F8;border-radius:12px;padding:14px;overflow-x:auto;"><table style="width:100%;font-size:13px;border-collapse:collapse;"><tr style="border-bottom:1px solid #eee;font-weight:700;"><td style="padding:6px;">항목</td><td style="padding:6px;text-align:right;">최소</td><td style="padding:6px;text-align:right;">평균</td><td style="padding:6px;text-align:right;">최대</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:6px;">📸 스튜디오</td><td style="padding:6px;text-align:right;">${r.studio[0]}만</td><td style="padding:6px;text-align:right;">${r.studio[1]}만</td><td style="padding:6px;text-align:right;">${r.studio[2]}만</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:6px;">👗 드레스</td><td style="padding:6px;text-align:right;">${r.dress[0]}만</td><td style="padding:6px;text-align:right;">${r.dress[1]}만</td><td style="padding:6px;text-align:right;">${r.dress[2]}만</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:6px;">💄 메이크업</td><td style="padding:6px;text-align:right;">${r.makeup[0]}만</td><td style="padding:6px;text-align:right;">${r.makeup[1]}만</td><td style="padding:6px;text-align:right;">${r.makeup[2]}만</td></tr></table></div>\n\n<div style="background:#F8F8F8;border-radius:12px;padding:14px;margin-top:8px;"><b>💡 절약 팁</b><br/>• 평일 촬영 시 스튜디오 20~30% 할인 가능<br/>• 패키지 계약 시 개별 계약보다 15~20% 저렴<br/>• 드레스 대여 기간 유연한 업체 비교 필수</div>\n\n<div style="background:#FFF5F5;border-radius:12px;padding:14px;margin-top:8px;"><b>⚠️ 계약 전 반드시 확인할 것</b><br/>• 추가 촬영컷 비용 및 원본 제공 여부<br/>• 드레스 피팅 횟수 제한 및 변경 수수료</div>`;
}

// --- Timeline Mock Response ---
export function generateTimelineResponse(data: {
  ceremonyTime: string;
  venueType: string;
  duration: string;
  reception: string;
  receptionTime?: string;
  photoTeam: string[];
  brideStartTime: string;
  hanbok?: string;
  groomRoom?: string;
}) {
  const ct = data.ceremonyTime;
  const [ch, cm] = ct.split(":").map(Number);
  const [bh, bm] = data.brideStartTime.split(":").map(Number);

  const addMin = (h: number, m: number, add: number) => {
    const total = h * 60 + m + add;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const durMin = data.duration === "30분" ? 30 : data.duration === "40분" ? 40 : 60;
  const timeline: { time: string; emoji: string; label: string }[] = [];

  timeline.push({ time: data.brideStartTime, emoji: "🌅", label: "신부 기상 및 이동 준비" });
  timeline.push({ time: addMin(bh, bm, 30), emoji: "💄", label: "신부 메이크업 시작 (약 2시간 소요)" });
  timeline.push({ time: addMin(bh, bm, 150), emoji: "👗", label: "드레스 착장" });

  if (data.photoTeam.includes("스냅 촬영")) {
    timeline.push({ time: addMin(ch, cm, -60), emoji: "📸", label: "스냅 촬영팀 도착, 준비실 촬영 시작" });
  }
  timeline.push({ time: addMin(ch, cm, -30), emoji: "🤵", label: "신랑 도착 및 준비" });
  timeline.push({ time: addMin(ch, cm, -15), emoji: "👨‍👩‍👧‍👦", label: "양가 부모님 인사 및 대기" });
  timeline.push({ time: ct, emoji: "💍", label: "예식 시작" });
  timeline.push({ time: addMin(ch, cm, durMin), emoji: "💐", label: "예식 종료, 하객 인사" });

  if (data.reception === "있음") {
    const rt = data.receptionTime || addMin(ch, cm, durMin + 10);
    timeline.push({ time: rt, emoji: "🍽", label: "피로연 / 하객 식사 시작" });
  } else {
    timeline.push({ time: addMin(ch, cm, durMin + 10), emoji: "🍽", label: "하객 식사 시작" });
  }

  if (data.hanbok === "있음") {
    timeline.push({ time: addMin(ch, cm, durMin + 30), emoji: "👘", label: "한복 환복" });
  }

  timeline.push({ time: addMin(ch, cm, durMin + 60), emoji: "📸", label: "야외 / 추가 촬영" });
  timeline.push({ time: addMin(ch, cm, durMin + 120), emoji: "🎉", label: "마무리 및 퇴장" });

  timeline.sort((a, b) => a.time.localeCompare(b.time));

  const timelineHtml = timeline.map(t =>
    `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;">
      <div style="min-width:48px;font-weight:700;font-size:14px;color:#C9A96E;">${t.time}</div>
      <div style="font-size:14px;">${t.emoji} ${t.label}</div>
    </div>`
  ).join('');

  return `<b>📋 ${ct} 예식 당일 타임라인</b>\n<div style="font-size:13px;color:#888;margin-bottom:12px;">${data.venueType} · 예식 ${data.duration}</div>\n\n<div style="background:#F8F8F8;border-radius:12px;padding:16px;">${timelineHtml}</div>\n\n<div style="background:#F8F8F8;border-radius:12px;padding:14px;margin-top:8px;"><b>⏰ 자주 놓치는 타임 체크포인트</b><br/>• 촬영팀과 사전 동선 미팅 필수 (예식 1주 전)<br/>• 부케/부토니에 전달 시간 확인<br/>• 하객 주차 안내 문자 발송 (예식 전날)</div>`;
}

// --- Budget Mock Response ---
export function generateBudgetResponse(data: {
  totalBudget: string;
  region: string;
  date: string;
  season: string;
  support: string;
  supportAmount?: string;
  priorities: string[];
  items?: Record<string, string>;
}) {
  const total = parseInt(data.totalBudget) || 5000;
  const alloc = {
    "웨딩홀/예식장": Math.round(total * 0.25),
    "스드메": Math.round(total * 0.15),
    "허니문": Math.round(total * 0.12),
    "예물": Math.round(total * 0.1),
    "예단/혼수": Math.round(total * 0.15),
    "신혼집": Math.round(total * 0.15),
    "기타": Math.round(total * 0.08),
  };

  if (data.items) {
    Object.entries(data.items).forEach(([k, v]) => {
      if (v && parseInt(v) > 0) (alloc as any)[k] = parseInt(v);
    });
  }

  const entries = Object.entries(alloc);
  const maxVal = Math.max(...entries.map(([, v]) => v));

  const barsHtml = entries.map(([label, val]) => {
    const pct = Math.round((val / maxVal) * 100);
    const status = val > total * 0.3 ? "초과" : val > total * 0.2 ? "주의" : "적정";
    const statusColor = status === "초과" ? "#EF4444" : status === "주의" ? "#F59E0B" : "#22C55E";
    return `<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;"><span>${label}</span><span style="font-weight:600;">${val}만원 <span style="color:${statusColor};font-size:11px;background:${statusColor}15;padding:1px 6px;border-radius:8px;">${status}</span></span></div><div style="background:#E5E7EB;border-radius:6px;height:8px;"><div style="background:linear-gradient(90deg,#F9E4EC,#C9A96E);border-radius:6px;height:8px;width:${pct}%;"></div></div></div>`;
  }).join('');

  const seasonBadge = data.season === "성수기" ? "🔴 성수기 (물가 10~20% 상승)" : "🟢 비수기 (할인 혜택 가능)";

  return `<b>💰 맞춤 결혼 예산 분석 리포트</b>\n\n<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;"><span style="background:#F8F8F8;padding:4px 10px;border-radius:8px;font-size:12px;">총예산: ${total.toLocaleString()}만원</span><span style="background:#F8F8F8;padding:4px 10px;border-radius:8px;font-size:12px;">${seasonBadge}</span><span style="background:#F8F8F8;padding:4px 10px;border-radius:8px;font-size:12px;">📍 ${data.region}</span></div>\n\n<div style="background:#F8F8F8;border-radius:12px;padding:16px;">${barsHtml}</div>\n\n<div style="background:#F8F8F8;border-radius:12px;padding:14px;margin-top:8px;"><b>💡 예산 절약 포인트</b><br/>• ${data.season === "성수기" ? "비수기(6~8월, 12~2월)로 변경 시 15~20% 절약 가능" : "비수기 할인 적극 활용 — 웨딩홀 협상 여지 큼"}<br/>• 스드메 패키지 묶음 계약 시 개별 대비 15~20% 절감<br/>• 예물은 브랜드별 프로모션 시즌(1월, 7월) 활용</div>\n\n<div style="background:#FFF5F5;border-radius:12px;padding:14px;margin-top:8px;"><b>⚠️ 이 예산에서 주의할 항목</b><br/>• ${data.priorities.length > 0 ? `${data.priorities[0]}에 비중을 높이면 다른 항목 조정 필요` : "항목별 균형 배분 시에도 예비비(총액의 5~10%) 확보 권장"}<br/>• 예상치 못한 추가 비용(답례품, 꽃장식, 청첩장) 약 200~300만원 별도 고려</div>`;
}
