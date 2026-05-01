/**
 * Quick Question 모달 응답 핸들러
 *
 * AI 플래너 진입 시 보이는 4개 카드(웨딩홀·스드메·타임라인·예산)에
 * 사용자가 정보를 입력하면, 그 정보로 LLM 호출 없이 결정형 응답 생성.
 *
 * 모달이 수집하는 모든 필드를 활용하여 정확한 추천·계산 제공.
 */

import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST_TEMPLATE } from "@/data/checklistTemplate";

// ════════════════════════════════════════════════════════════
// 1. 웨딩홀 추천
// ════════════════════════════════════════════════════════════
export interface VenueParams {
  date?: string;
  region?: string;
  guests?: string | number;
  budget?: string | number;
  styles?: string[];
  parking?: string;
  meal?: string | string[];
  special?: string;
}

const parseNumber = (v: string | number | undefined): number | null => {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return v;
  const num = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? null : num;
};

export const handleVenueRecommendation = async (params: VenueParams): Promise<string> => {
  const guests = parseNumber(params.guests) ?? 100;
  const totalBudget = parseNumber(params.budget); // 만원 단위 가능성, 정확한 단위 모름
  const perPersonMax = totalBudget ? Math.floor((totalBudget * 10000) / guests) : null;

  // places 테이블에서 wedding_hall + 필터
  let query = (supabase as any)
    .from("places")
    .select("place_id, name, district, city, min_price, avg_rating, is_partner, tags")
    .eq("category", "wedding_hall")
    .eq("is_active", true);

  // 지역 필터
  if (params.region) {
    query = query.or(`district.ilike.%${params.region}%,city.ilike.%${params.region}%`);
  }

  const { data: venues } = await query.order("avg_rating", { ascending: false }).limit(20);

  if (!venues || venues.length === 0) {
    return `**웨딩홀 추천 결과** 🏛️\n\n요청하신 조건(${params.region ?? "지역 미지정"})에 맞는 등록 웨딩홀을 찾지 못했어요 🌿\n\n[웨딩홀 페이지](/venues)에서 직접 검색해보세요.`;
  }

  // 보증인원·가격 추가 정보 (place_wedding_halls)
  const placeIds = venues.map((v: any) => v.place_id);
  const { data: hallDetails } = await (supabase as any)
    .from("place_wedding_halls")
    .select("place_id, min_guarantee, max_guarantee, price_per_person, hall_styles, meal_types")
    .in("place_id", placeIds);

  const detailMap = new Map<string, any>();
  for (const h of hallDetails ?? []) detailMap.set(h.place_id, h);

  // 필터링
  const filtered = venues.filter((v: any) => {
    const detail = detailMap.get(v.place_id);
    if (!detail) return true; // 상세 정보 없으면 통과
    if (detail.min_guarantee && guests < detail.min_guarantee) return false;
    if (detail.max_guarantee && guests > detail.max_guarantee) return false;
    if (perPersonMax && detail.price_per_person && detail.price_per_person > perPersonMax) return false;
    if (params.styles && params.styles.length > 0 && detail.hall_styles?.length > 0) {
      const overlap = params.styles.some((s) => detail.hall_styles.includes(s));
      if (!overlap) return false;
    }
    return true;
  });

  const top = filtered.slice(0, 5);
  if (top.length === 0) {
    return `**웨딩홀 추천 결과** 🏛️\n\n조건에 맞는 곳을 못 찾았어요 🌿\n\n조건을 조금 완화하시거나 [웨딩홀 페이지](/venues)에서 직접 살펴보세요.`;
  }

  const lines = top
    .map((v: any) => {
      const d = detailMap.get(v.place_id);
      const region = v.district || v.city || "";
      const price = d?.price_per_person ? `${(d.price_per_person).toLocaleString()}원/인` : "가격 문의";
      const cap = d?.min_guarantee && d?.max_guarantee
        ? `${d.min_guarantee}~${d.max_guarantee}명`
        : "";
      const partner = v.is_partner ? " ⭐파트너" : "";
      return `• **${v.name}** (${region})${partner}\n  ${price} · ${cap}${v.avg_rating ? ` · ★ ${v.avg_rating}` : ""}`;
    })
    .join("\n\n");

  const filterSummary: string[] = [];
  if (params.region) filterSummary.push(`📍 ${params.region}`);
  if (totalBudget) filterSummary.push(`💰 ${totalBudget.toLocaleString()}만원`);
  if (guests) filterSummary.push(`👥 ${guests}명`);
  if (params.styles?.length) filterSummary.push(`✨ ${params.styles.join(", ")}`);

  return `**웨딩홀 추천 ${top.length}곳** 🏛️\n${filterSummary.join(" · ")}\n\n${lines}\n\n[웨딩홀 페이지](/venues)에서 더 자세히 보거나 다른 조건으로 검색하실 수 있어요.`;
};

// ════════════════════════════════════════════════════════════
// 2. 스드메 가이드
// ════════════════════════════════════════════════════════════
export interface SdmeParams {
  date?: string;
  region?: string;
  studioStyle?: string;
  dressOptions?: string[];
  makeup?: string;
  album?: string;
  budget?: string | number;
  priority?: string;
}

export const handleSdmeGuide = async (params: SdmeParams): Promise<string> => {
  const budget = parseNumber(params.budget);

  // 정적 가이드 - 일반 시세
  const guide = `**스드메 일반 시세** 📸\n• 스튜디오: 30~150만원 (원본·보정·앨범 포함 여부 차이 큼)\n• 드레스: 본식+촬영 50~200만원\n• 메이크업: 신부 본식 25~50만원, 양가 어머니 +25~50만원\n• 헤어: 신부 본식 8~20만원\n• 본식 스냅: 30~60만원 (별도)\n• DVD: 20~40만원 (별도)`;

  // 추가금 방어
  const guard = `**숨은 추가금 주의** ⚠️\n• 원본 데이터: 30~50만원\n• 헬퍼 이모님(드레스 도와주는 분): 15~25만원\n• 얼리 스타트(이른 시간 메이크업): 5~10만원\n• 드레스 가봉 추가: 5~10만원\n• 부속품(베일·티아라·신발): 별도`;

  // 사용자 조건 요약
  const summary: string[] = [];
  if (params.region) summary.push(`📍 ${params.region}`);
  if (budget) summary.push(`💰 총예산 ${budget.toLocaleString()}만원`);
  if (params.studioStyle) summary.push(`📸 ${params.studioStyle}`);
  if (params.priority) summary.push(`✨ 우선순위 ${params.priority}`);

  // 등록된 스드메 업체 추천 (places category in studio·dress_shop·makeup_shop)
  let recommendations = "";
  let query = (supabase as any)
    .from("places")
    .select("place_id, name, category, district, avg_rating, min_price, is_partner")
    .in("category", ["studio", "dress_shop", "makeup_shop"])
    .eq("is_active", true);
  if (params.region) {
    query = query.or(`district.ilike.%${params.region}%,city.ilike.%${params.region}%`);
  }
  const { data: places } = await query.order("avg_rating", { ascending: false }).limit(6);

  if (places && places.length > 0) {
    const grouped: Record<string, any[]> = {};
    for (const p of places) (grouped[p.category] ??= []).push(p);
    const catLabels: Record<string, string> = {
      studio: "📸 스튜디오",
      dress_shop: "👗 드레스",
      makeup_shop: "💄 메이크업",
    };
    recommendations = "\n\n**추천 업체**\n" +
      Object.entries(grouped)
        .map(([cat, items]) => {
          const lines = items.slice(0, 2).map((p: any) =>
            `  • ${p.name}${p.district ? ` (${p.district})` : ""}${p.avg_rating ? ` ★${p.avg_rating}` : ""}${p.is_partner ? " ⭐" : ""}`
          ).join("\n");
          return `${catLabels[cat] || cat}\n${lines}`;
        })
        .join("\n\n");
  }

  return `**스드메 가이드** 📸\n${summary.length > 0 ? summary.join(" · ") + "\n\n" : ""}${guide}\n\n${guard}${recommendations}\n\n[스드메 페이지](/studios)에서 직접 비교하실 수 있어요.`;
};

// ════════════════════════════════════════════════════════════
// 3. 본식 타임라인
// ════════════════════════════════════════════════════════════
export interface TimelineParams {
  ceremonyTime?: string;       // 예: "13:00"
  venueType?: string;
  duration?: string;           // 예: "60분", "90분"
  reception?: string;
  receptionTime?: string;
  photoTeam?: string;
  brideStartTime?: string;     // 메이크업 시작 시간
  hanbok?: string;
  groomRoom?: string;
  special?: string;
}

const parseHHMM = (s: string | undefined): { h: number; m: number } | null => {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})/);
  if (!m) {
    const justHour = s.match(/(\d{1,2})\s*시/);
    if (justHour) return { h: parseInt(justHour[1]), m: 0 };
    return null;
  }
  return { h: parseInt(m[1]), m: parseInt(m[2]) };
};

const minusMin = (t: { h: number; m: number }, minus: number): string => {
  let total = t.h * 60 + t.m - minus;
  if (total < 0) total += 24 * 60;
  const h = Math.floor(total / 60);
  const min = total % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

const plusMin = (t: { h: number; m: number }, plus: number): string => {
  const total = t.h * 60 + t.m + plus;
  const h = Math.floor((total / 60) % 24);
  const min = total % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

export const handleTimelinePlanning = async (params: TimelineParams): Promise<string> => {
  const ceremony = parseHHMM(params.ceremonyTime);
  if (!ceremony) {
    return "예식 시작 시간을 입력해주시면 본식 타임라인을 자세히 짜드릴 수 있어요 ⏰\n\n예: '13:00' 또는 '오후 1시'";
  }

  const ceremonyStr = `${String(ceremony.h).padStart(2, "0")}:${String(ceremony.m).padStart(2, "0")}`;
  const duration = parseNumber(params.duration) ?? 60; // 기본 60분
  const receptionTime = parseHHMM(params.receptionTime);

  const lines: string[] = [];

  // 신부 메이크업 시작 (예식 4~5시간 전 권장)
  const brideStart = parseHHMM(params.brideStartTime);
  if (brideStart) {
    lines.push(`${String(brideStart.h).padStart(2, "0")}:${String(brideStart.m).padStart(2, "0")} 신부 메이크업 시작`);
  } else {
    lines.push(`${minusMin(ceremony, 240)} 신부 메이크업 시작 (권장)`);
  }

  // 양가 부모님 메이크업 (예식 3시간 전)
  lines.push(`${minusMin(ceremony, 180)} 양가 어머니·신랑 메이크업·헤어 도착 권장`);

  // 신부 식장 도착 (예식 90분 전)
  lines.push(`${minusMin(ceremony, 90)} 신부 식장 도착 / 신부 대기실 입장`);

  // 신랑 도착·정장 환복 (예식 60분 전)
  lines.push(`${minusMin(ceremony, 60)} 신랑 도착, 양가 가족 친지 입장 시작`);

  // 본식 사진 촬영 (예식 30분 전)
  lines.push(`${minusMin(ceremony, 30)} 본식 사진 촬영 (가족·들러리)`);

  // 하객 대기 (예식 15분 전)
  lines.push(`${minusMin(ceremony, 15)} 하객 입장 본격 시작, 사회자 안내 준비`);

  // 예식 시작
  lines.push(`**${ceremonyStr} 🎉 예식 시작**`);

  // 예식 종료
  lines.push(`${plusMin(ceremony, duration)} 예식 종료 / 폐백·단체사진`);

  // 폐백·단체사진 (30~45분)
  lines.push(`${plusMin(ceremony, duration + 45)} 폐백·단체사진 종료`);

  // 피로연
  if (params.reception === "예" || receptionTime) {
    const recStart = receptionTime
      ? `${String(receptionTime.h).padStart(2, "0")}:${String(receptionTime.m).padStart(2, "0")}`
      : plusMin(ceremony, duration + 60);
    lines.push(`${recStart} 피로연 시작`);
  }

  // 한복 환복
  if (params.hanbok === "예" || params.hanbok === "있음") {
    lines.push(`(피로연 후) 한복 환복 + 인사`);
  }

  const summary: string[] = [];
  if (params.venueType) summary.push(`🏛️ ${params.venueType}`);
  if (params.photoTeam) summary.push(`📸 ${params.photoTeam}`);
  if (params.special) summary.push(`✨ ${params.special}`);

  return `**본식 당일 타임라인** ⏰\n예식 ${ceremonyStr} (${duration}분 진행)\n${summary.length > 0 ? summary.join(" · ") + "\n" : ""}\n${lines.map((l) => `• ${l}`).join("\n")}\n\n* 식장·계절·사진팀 일정에 따라 30분 단위 조정 권장.\n* 자세한 시기별 체크리스트는 "준비 타임라인 만들어줘" 라고 물어봐 주세요.`;
};

// ════════════════════════════════════════════════════════════
// 4. 예산 플래너
// ════════════════════════════════════════════════════════════
export interface BudgetParams {
  totalBudget?: string | number;
  items?: string[];
  region?: string;
  date?: string;
  season?: string;
  support?: string;
  supportAmount?: string | number;
  priorities?: string[];
}

// 카테고리별 권장 비율 (한국 평균 기준)
const BASE_RATIOS: Record<string, number> = {
  venue: 0.40,        // 웨딩홀 + 식대
  sdm: 0.15,          // 스튜디오·드레스·메이크업
  ring: 0.10,         // 예물·반지
  honeymoon: 0.15,    // 신혼여행
  appliance: 0.15,    // 가전·혼수
  etc: 0.05,          // 기타 (청첩장·교통·소품 등)
};

const CATEGORY_LABEL: Record<string, string> = {
  venue: "웨딩홀+식대",
  sdm: "스드메",
  ring: "예물·반지",
  honeymoon: "신혼여행",
  appliance: "가전·혼수",
  etc: "기타",
};

// 우선순위 키워드 매핑 (BudgetSurvey의 priorities 값)
const PRIORITY_TO_CATEGORY: Record<string, string> = {
  "웨딩홀": "venue",
  "식장": "venue",
  "스드메": "sdm",
  "예물": "ring",
  "반지": "ring",
  "신혼여행": "honeymoon",
  "허니문": "honeymoon",
  "가전": "appliance",
  "혼수": "appliance",
};

export const handleBudgetPlanning = async (params: BudgetParams): Promise<string> => {
  const total = parseNumber(params.totalBudget);
  if (!total) {
    return "총 예산을 입력해주시면 항목별로 권장 분배를 보여드릴 수 있어요 💰\n\n한국 결혼식 평균은 부부 합산 5,000만~1억 원 정도예요.";
  }

  // 우선순위 카테고리 추출
  const priorityCategories = new Set<string>();
  for (const p of params.priorities ?? []) {
    const cat = PRIORITY_TO_CATEGORY[p];
    if (cat) priorityCategories.add(cat);
  }

  // 우선순위 +5%, 비우선 항목에서 -2.5% 분산
  const ratios = { ...BASE_RATIOS };
  if (priorityCategories.size > 0) {
    const totalBoost = priorityCategories.size * 0.05;
    const nonPriorityKeys = Object.keys(ratios).filter((k) => !priorityCategories.has(k));
    const distribute = totalBoost / nonPriorityKeys.length;
    for (const k of priorityCategories) ratios[k] += 0.05;
    for (const k of nonPriorityKeys) ratios[k] = Math.max(0.02, ratios[k] - distribute);
  }

  // 총 예산 (만원 단위로 가정)
  const totalWon = total * 10000;
  const allocations = Object.entries(ratios)
    .map(([cat, ratio]) => ({
      cat,
      label: CATEGORY_LABEL[cat],
      ratio,
      amount: Math.round((totalWon * ratio) / 100000) * 100000, // 10만원 단위
      priority: priorityCategories.has(cat),
    }))
    .sort((a, b) => b.amount - a.amount);

  const lines = allocations
    .map((a) => `• ${a.label}: ${(a.amount / 10000).toLocaleString()}만원 (${Math.round(a.ratio * 100)}%)${a.priority ? " ⭐" : ""}`)
    .join("\n");

  // 양가 지원금
  const support = parseNumber(params.supportAmount);
  let supportLine = "";
  if (support && support > 0) {
    supportLine = `\n\n💑 **양가 지원금**: ${support.toLocaleString()}만원\n실 부담 예산: ${(total - support).toLocaleString()}만원`;
  }

  // 시즌 보정
  let seasonNote = "";
  if (params.season === "성수기" || params.date?.match(/(4월|5월|10월|11월)/)) {
    seasonNote = "\n\n🌸 **성수기 안내**: 4·5월·10·11월은 웨딩홀·스드메 가격이 10~20% 높아요. 예산을 5~10% 여유 두시는 걸 권장해요.";
  }

  return `**예산 분배 추천** 💰\n총 예산 **${total.toLocaleString()}만원**${params.region ? ` (${params.region})` : ""}\n\n${lines}\n\n⭐ 표시는 우선순위 항목이에요${supportLine}${seasonNote}\n\n💡 **추가금 방어 팁**\n• 웨딩홀: 보증인원 협상, 대관료·식대 분리 견적 받기\n• 스드메: 원본·헬퍼·얼리스타트 등 숨은 비용 포함 견적 요청\n• 예물: 시세 변동 큰 금 가격 우선 체크\n\n자세한 항목별 관리는 [예산 페이지](/budget)에서 가능해요.`;
};
