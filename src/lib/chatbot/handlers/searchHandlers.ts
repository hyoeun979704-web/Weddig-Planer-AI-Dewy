/**
 * 자유 텍스트 기반 places 검색·통계 핸들러
 * - 지역별 식장 평균 시세
 * - 카테고리·지역 자유 검색
 * - 인기 업체 랭킹
 *
 * DB에 매칭 업체가 없거나 부족할 때(매핑 안된 신생 업체·니치 카테고리·
 * 우리 DB 커버리지 밖) Gemini Google Search Grounding으로 폴백해 실시간
 * 웹 검색 결과 + 검증된 출처를 제공.
 */

import { supabase } from "@/integrations/supabase/client";
import { callWebSearch, formatWebSearchReply } from "./webSearchFallback";

export interface SearchPersonaCtx {
  weddingStyle?: string | null;
  excludedCategories?: string[];
}

const PLACE_CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스샵",
  makeup_shop: "메이크업샵",
  hanbok: "한복",
  suit: "예복",
  honeymoon: "신혼여행",
  jewelry: "예물·반지",
  appliance: "가전·혼수",
};

// Map place category slug → the `excluded_categories` key used in
// user_wedding_settings. Most align 1:1; "suit" (places) vs
// "tailor_shop" (skippable) needs an explicit bridge.
const PLACE_TO_EXCLUDE_KEY: Record<string, string> = {
  wedding_hall: "wedding_hall",
  studio: "studio",
  dress_shop: "dress_shop",
  makeup_shop: "makeup_shop",
  hanbok: "hanbok",
  suit: "tailor_shop",
  honeymoon: "honeymoon",
  jewelry: "appliance",
  appliance: "appliance",
};

const styleLabel = (style?: string | null): string | null => {
  if (style === "self") return "셀프웨딩";
  if (style === "small") return "스몰웨딩";
  return null;
};

// Soft notice shown when the user explicitly asks about a category they've
// previously marked as excluded. We honor the explicit intent (still answer
// the question) but acknowledge the mismatch so they can adjust settings.
const personaConflictNote = (
  inferredCategory: string,
  ctx: SearchPersonaCtx,
): string => {
  const excludeKey = PLACE_TO_EXCLUDE_KEY[inferredCategory];
  if (!excludeKey) return "";
  if (!ctx.excludedCategories?.includes(excludeKey)) return "";
  const label = styleLabel(ctx.weddingStyle);
  if (!label) return "";
  return `\n\n_${label} 설정에선 보통 ${PLACE_CATEGORY_LABEL[inferredCategory]}을(를) 생략하지만, 명시적으로 물어보셔서 결과를 보여드릴게요._`;
};

const PLACE_CATEGORY_KEYWORDS: Record<string, string> = {
  웨딩홀: "wedding_hall",
  식장: "wedding_hall",
  결혼식장: "wedding_hall",
  예식장: "wedding_hall",
  스튜디오: "studio",
  사진: "studio",
  촬영: "studio",
  드레스샵: "dress_shop",
  드레스: "dress_shop",
  메이크업: "makeup_shop",
  뷰티: "makeup_shop",
  한복: "hanbok",
  예복: "suit",
  정장: "suit",
  턱시도: "suit",
  허니문: "honeymoon",
  신혼여행: "honeymoon",
  예물: "jewelry",
  반지: "jewelry",
  쥬얼리: "jewelry",
  가전: "appliance",
  혼수: "appliance",
};

// Round 15 P0 fix — 약자(충남/충북/전남/전북/경남/경북)가 DB 풀네임("충청남도" 등)에
// 비연속 substring 이라 ILIKE 매칭 0건. Round 13 region 회귀 재발. 사용자 입력은
// 약자/풀네임 모두 받되 ILIKE-safe substring 으로 정규화 후 query 전달.
// 키 = 사용자 입력 alias, 값 = ILIKE 안전 substring (lib/regions.ts REGIONS.value 와 일치).
const REGION_ALIAS_TO_SEARCH_KEY: Record<string, string> = {
  // 약자 → 풀네임 contiguous substring
  "충남": "충청남", "충청남": "충청남", "충청남도": "충청남",
  "충북": "충청북", "충청북": "충청북", "충청북도": "충청북",
  "전남": "전라남", "전라남": "전라남", "전라남도": "전라남",
  "경남": "경상남", "경상남": "경상남", "경상남도": "경상남",
  "경북": "경상북", "경상북": "경상북", "경상북도": "경상북",
  // 풀네임도 substring 형태로 정규화 (정확성)
  "전북": "전북", "전북특별자치도": "전북",
  "강원": "강원", "강원특별자치도": "강원",
  "제주": "제주", "제주특별자치도": "제주",
  "세종": "세종", "세종특별자치시": "세종",
  "서울": "서울", "서울특별시": "서울",
  "경기": "경기", "경기도": "경기",
  "인천": "인천", "인천광역시": "인천",
  "부산": "부산", "부산광역시": "부산",
  "대구": "대구", "대구광역시": "대구",
  "광주": "광주", "광주광역시": "광주",
  "대전": "대전", "대전광역시": "대전",
  "울산": "울산", "울산광역시": "울산",
};

// 시군구 키워드 — district.ilike 매칭용 (city 와 별개로 사용자 입력 인식). 그대로 substring.
const SIGUNGU_KEYWORDS = [
  "강남", "강북", "강동", "강서", "서초", "송파", "마포", "용산",
  "종로", "중구", "성동", "광진", "동대문", "성북", "도봉",
  "노원", "은평", "양천", "구로", "금천", "관악", "동작",
  "영등포", "서대문", "중랑", "강화",
  "성남", "수원", "용인", "안양", "고양",
  "천안", "청주", "춘천", "원주", "제천",
];

// inferRegion 호환을 위한 모든 키워드 (정렬 — 긴 것 먼저 매칭).
const REGION_KEYWORDS = [
  ...Object.keys(REGION_ALIAS_TO_SEARCH_KEY),
  ...SIGUNGU_KEYWORDS,
].sort((a, b) => b.length - a.length);

const inferCategory = (text: string): string | null => {
  for (const [kw, cat] of Object.entries(PLACE_CATEGORY_KEYWORDS)) {
    if (text.includes(kw)) return cat;
  }
  return null;
};

const inferRegion = (text: string): string | null => {
  for (const r of REGION_KEYWORDS) {
    if (text.includes(r)) {
      // 시도 약자/풀네임 → ILIKE-safe substring 매핑 (Round 15 P0 fix). 시군구는 그대로.
      return REGION_ALIAS_TO_SEARCH_KEY[r] ?? r;
    }
  }
  return null;
};

const inferBudget = (text: string): number | null => {
  // "5천만원", "5000만원", "5천", "5만원" 등 추출
  const match = text.match(/(\d+)\s*천?만/);
  if (match) {
    const num = parseInt(match[1]);
    return text.includes("천") ? num * 1000 : num;
  }
  return null;
};

// ════════════════════════════════════════════════════════════
// 자유 텍스트 검색 (카테고리·지역·예산 기반)
// ════════════════════════════════════════════════════════════
export const handleFreeTextSearch = async (
  userMessage: string,
  personaCtx: SearchPersonaCtx = {},
): Promise<string> => {
  const category = inferCategory(userMessage);
  const region = inferRegion(userMessage);
  const budget = inferBudget(userMessage);

  if (!category && !region) {
    return "어떤 카테고리·지역을 찾고 계신가요? 예: \"강남 식장\" / \"부산 스튜디오\" / \"홍대 드레스샵\"";
  }

  let query = (supabase as any)
    .from("places")
    .select("place_id, name, category, district, city, avg_rating, min_price, is_partner, tags")
    .eq("is_active", true)
    .limit(15);

  if (category) query = query.eq("category", category);
  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    const filters = [
      region && ` ${region}`,
      category && ` ${PLACE_CATEGORY_LABEL[category]}`,
      budget && ` ${budget}만원`,
    ].filter(Boolean).join(" · ");

    // DB 0건 → 웹 검색 폴백. 실패 시 graceful으로 기존 메시지.
    const web = await callWebSearch("search", userMessage, {
      category: category ?? undefined,
      region: region ?? undefined,
    });
    if (web.limitMessage) {
      return `**검색 결과** \n${filters}\n\n${web.limitMessage}`;
    }
    if (!web.failed && web.reply) {
      const header = `**검색 결과** \n${filters}\n\n_듀이 DB에 매칭 업체가 없어 웹 검색 결과를 보여드려요._\n\n`;
      return header + formatWebSearchReply(web);
    }
    return `**검색 결과** \n${filters}\n\n조건에 맞는 업체를 찾지 못했어요 \n다른 지역·카테고리로 시도해보시거나 [전체 페이지](/venues)에서 직접 살펴보세요.`;
  }

  // Persona filter — only applied when no explicit category was inferred
  // (broad query). When the user explicitly named a category, honor that
  // intent and instead append a soft persona note further down.
  const excluded = new Set(personaCtx.excludedCategories ?? []);
  const filtered = category
    ? data
    : (data as any[]).filter((p) => {
        const key = PLACE_TO_EXCLUDE_KEY[p.category];
        return !key || !excluded.has(key);
      });

  // 정렬: partner > rating
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (a.is_partner !== b.is_partner) return b.is_partner ? 1 : -1;
    return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
  });

  const lines = sorted.slice(0, 8).map((p: any) => {
    const region = p.district || p.city || "";
    const price = p.min_price ? `${(p.min_price / 10000).toLocaleString()}만원~` : "가격 문의";
    const star = p.avg_rating ? `${p.avg_rating}` : "";
    const partner = p.is_partner ? " ⭐" : "";
    return `- **${p.name}** (${region}) ${price} ${star}${partner}`;
  }).join("\n");

  const summary = [
    region && ` ${region}`,
    category && ` ${PLACE_CATEGORY_LABEL[category]}`,
  ].filter(Boolean).join(" · ");

  // ── 인사이트: 결과 가격대·별점 분포 분석 ─────────────
  // raw 나열에 끝나지 않고 사용자가 다음 결정에 쓸 정보를 한 줄 더.
  const insights: string[] = [];
  const withPrice = sorted.slice(0, 8).filter((p: any) => p.min_price);
  if (withPrice.length >= 3) {
    const prices = withPrice.map((p: any) => p.min_price).sort((a: number, b: number) => a - b);
    const lowest = Math.round(prices[0] / 10000);
    const highest = Math.round(prices[prices.length - 1] / 10000);
    const median = Math.round(prices[Math.floor(prices.length / 2)] / 10000);
    insights.push(` 상위 ${withPrice.length}곳 가격대: **${lowest}만원~${highest}만원** (중간값 ${median}만원)`);
  }
  const rated = sorted.slice(0, 8).filter((p: any) => p.avg_rating);
  if (rated.length >= 3) {
    const top = rated.filter((p: any) => p.avg_rating >= 4.5).length;
    if (top >= 3) insights.push(`⭐ **4.5 이상이 ${top}곳** — 후기 평점 높은 곳이 많아요`);
  }
  const partnerCount = sorted.slice(0, 8).filter((p: any) => p.is_partner).length;
  if (partnerCount > 0) {
    insights.push(` 듀이 파트너 ${partnerCount}곳 포함 (⭐ 표시)`);
  }

  const insightBlock = insights.length > 0 ? `\n\n${insights.join("\n")}` : "";

  const conflictNote = category ? personaConflictNote(category, personaCtx) : "";

  const linkLabel = category === "wedding_hall" ? "[웨딩홀](/venues)" :
    category === "studio" ? "[스튜디오](/studios)" :
    "[전체 카테고리](/venues)";

  return `**검색 결과 ${filtered.length}건 (상위 8)** 
${summary}

${lines}${insightBlock}

찜해두시면 비교하기 편해요. 자세히 보기 → ${linkLabel}${conflictNote}`;
};

// ════════════════════════════════════════════════════════════
// 카테고리·지역 평균 시세
// ════════════════════════════════════════════════════════════
export const handleAveragePrice = async (
  userMessage: string,
  personaCtx: SearchPersonaCtx = {},
): Promise<string> => {
  const inferredCategory = inferCategory(userMessage);
  const category = inferredCategory ?? "wedding_hall";
  const region = inferRegion(userMessage);
  const conflictNote = inferredCategory ? personaConflictNote(inferredCategory, personaCtx) : "";

  let query = (supabase as any)
    .from("places")
    .select("min_price, district, updated_at")
    .eq("category", category)
    .eq("is_active", true)
    .not("min_price", "is", null);

  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data } = await query;

  if (!data || data.length < 3) {
    // 표본 부족 → 웹 검색으로 실시간 시세 조회
    const web = await callWebSearch("price", userMessage, {
      category: category ?? undefined,
      region: region ?? undefined,
    });
    if (web.limitMessage) {
      return `**${region ?? "전체"} ${PLACE_CATEGORY_LABEL[category]} 시세** \n\n${web.limitMessage}`;
    }
    if (!web.failed && web.reply) {
      const header = `**${region ?? "전국"} ${PLACE_CATEGORY_LABEL[category]} 시세** \n\n_듀이 DB 표본(${data?.length ?? 0}곳)이 부족해 웹 검색 결과를 보여드려요._\n\n`;
      return header + formatWebSearchReply(web);
    }
    return `**${region ?? "전체"} ${PLACE_CATEGORY_LABEL[category]} 시세** \n\n아직 충분한 데이터가 없어 평균을 내기 어려워요. [전체 페이지](/venues)에서 직접 확인해보세요.`;
  }

  const prices = data.map((d: any) => d.min_price).filter(Boolean).sort((a: number, b: number) => a - b);
  const avg = Math.round(prices.reduce((s: number, p: number) => s + p, 0) / prices.length);
  const median = prices[Math.floor(prices.length / 2)];
  const min = prices[0];
  const max = prices[prices.length - 1];

  // 신선도 계산
  const updateDays = data
    .filter((d: any) => d.updated_at)
    .map((d: any) => Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000));
  const daysMedian = updateDays.length > 0
    ? [...updateDays].sort((a, b) => a - b)[Math.floor(updateDays.length / 2)]
    : 0;
  const freshLabel = daysMedian <= 14 ? " 최근 2주 내 갱신"
    : daysMedian <= 30 ? " 최근 1달 내 갱신"
    : daysMedian <= 60 ? " 최근 2달 내 갱신"
    : ` 약 ${Math.round(daysMedian / 30)}달 전 갱신 (오래됨)`;

  // 인사이트: 분포 폭으로 시장 특성 코멘트. raw 통계 + "이게 어떤
  // 의미인지" 한 줄 덧붙여 사용자가 다음 결정에 쓸 수 있게.
  const spread = max - min;
  const spreadRatio = median > 0 ? spread / median : 0;
  let marketNote: string;
  if (spreadRatio < 0.5) {
    marketNote = ` 가격대가 비교적 균일해요 — 업체 간 차이가 작은 시장이에요.`;
  } else if (spreadRatio < 1.5) {
    marketNote = ` 가격대가 다양해요 — 옵션·등급에 따라 차이가 크니 견적 비교가 중요해요.`;
  } else {
    marketNote = ` **가격대 편차가 매우 큰 시장**이에요. 최저(${(min / 10000).toLocaleString()}만원)와 최고(${(max / 10000).toLocaleString()}만원) 차이가 ${((max - min) / 10000).toLocaleString()}만원이라 같은 카테고리라도 등급·옵션 확인 필수예요.`;
  }

  return `**${region ?? "전국"} ${PLACE_CATEGORY_LABEL[category]} 시세** 
표본 ${data.length}곳 · ${freshLabel}

- 평균: ${(avg / 10000).toLocaleString()}만원~
- 중간값: ${(median / 10000).toLocaleString()}만원~
- 범위: ${(min / 10000).toLocaleString()} ~ ${(max / 10000).toLocaleString()}만원~

${marketNote}

_표시 가격은 시작가(min_price) 기준 — 옵션·시기에 따라 변동돼요. 인기 업체는 "인기 ${PLACE_CATEGORY_LABEL[category]}"라고 물어봐 주세요._${conflictNote}`;
};

// ════════════════════════════════════════════════════════════
// 인기 업체 (rating 정렬)
// ════════════════════════════════════════════════════════════
export const handlePopularPlaces = async (
  userMessage: string,
  personaCtx: SearchPersonaCtx = {},
): Promise<string> => {
  const category = inferCategory(userMessage);
  const region = inferRegion(userMessage);

  // Broad "TOP 업체" query — pull a wider candidate pool and then drop
  // excluded categories before slicing to 8. When user named a specific
  // category we honor it and only attach a soft persona note.
  const fetchLimit = category ? 8 : 24;

  let query = (supabase as any)
    .from("places")
    .select("place_id, name, category, district, avg_rating, review_count, is_partner")
    .eq("is_active", true)
    .gte("review_count", 5)
    .order("avg_rating", { ascending: false });

  if (category) query = query.eq("category", category);
  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data } = await query.limit(fetchLimit);

  if (!data || data.length === 0) {
    // DB에 후기 5건+ 업체가 없음 → 웹 검색으로 인기 업체 조회
    const web = await callWebSearch("popular", userMessage, {
      category: category ?? undefined,
      region: region ?? undefined,
    });
    if (web.limitMessage) {
      return `**인기 업체 추천** \n\n${web.limitMessage}`;
    }
    if (!web.failed && web.reply) {
      const header = `**인기 업체 추천** \n\n_듀이 DB에 후기가 쌓인 업체가 없어 웹 검색 결과를 보여드려요._\n\n`;
      return header + formatWebSearchReply(web);
    }
    return `**인기 업체 추천** \n\n해당 조건에 충분한 후기가 쌓인 업체가 아직 없어요. 다른 조건으로 시도해보세요.`;
  }

  const excluded = new Set(personaCtx.excludedCategories ?? []);
  const filtered = category
    ? data
    : (data as any[]).filter((p) => {
        const key = PLACE_TO_EXCLUDE_KEY[p.category];
        return !key || !excluded.has(key);
      });
  const shown = filtered.slice(0, 8);

  if (shown.length === 0) {
    return `**인기 업체 추천** \n\n현재 페르소나 설정에 맞는 인기 업체가 부족해요. 마이페이지 > 결혼 정보 설정에서 카테고리를 조정해보시거나, 카테고리·지역을 직접 지정해 다시 물어봐 주세요.`;
  }

  const lines = shown.map((p: any) => {
    const cat = PLACE_CATEGORY_LABEL[p.category] ?? p.category;
    const partner = p.is_partner ? " ⭐" : "";
    return `- **${p.name}** [${cat}] ${p.district ?? ""} —  ${p.avg_rating} (${p.review_count}건)${partner}`;
  }).join("\n");

  const filters = [region && ` ${region}`, category && ` ${PLACE_CATEGORY_LABEL[category]}`]
    .filter(Boolean).join(" · ");

  const conflictNote = category ? personaConflictNote(category, personaCtx) : "";

  // ── 인사이트: 별점 vs 후기 수 균형 분석 ─────────────
  // 후기 적으면서 별점 높은 곳 = 신상 (검증 X), 후기 많고 별점 높은 곳 =
  // 안정형. 사용자가 어떤 곳을 우선시할지 판단에 도움.
  const reliableCount = shown.filter((p: any) => p.review_count >= 30 && p.avg_rating >= 4.3).length;
  const risingCount = shown.filter((p: any) => p.review_count < 20 && p.avg_rating >= 4.5).length;
  const insights: string[] = [];
  if (reliableCount >= 2) {
    insights.push(` 후기 30건+ 검증된 안정형 **${reliableCount}곳** (4.3+, 후기 多)`);
  }
  if (risingCount >= 2) {
    insights.push(` 후기 적지만 평점 높은 떠오르는 곳 **${risingCount}곳** (4.5+, 후기 20건 미만)`);
  }
  const insightBlock = insights.length > 0
    ? `\n\n **선택 가이드**\n${insights.join("\n")}`
    : "";

  return `**인기 업체 TOP ${shown.length}** 
${filters || "전체"}

${lines}${insightBlock}

별점 기준 상위. 자세히 보고 비교는 [전체 페이지](/venues)에서 가능해요.${conflictNote}`;
};

// ════════════════════════════════════════════════════════════
// 비교표 — "강남 호텔 5곳 비교", "스튜디오 비교해줘" 같은 요청 시 표 형태로 응답.
// P1/P2/P3/P7 페르소나(시간 효율 / 데이터 분석)가 "엑셀 직접 비교" 페인 해소.
// 별점·후기·시작가·인증·시군구를 한 줄에 배치.
// ════════════════════════════════════════════════════════════
export const handleVenueCompare = async (
  userMessage: string,
  personaCtx: SearchPersonaCtx = {},
): Promise<string> => {
  const category = inferCategory(userMessage) ?? "wedding_hall";
  const region = inferRegion(userMessage);

  // F#3 — inferCategory 출력은 user-facing 카테고리 slug. DB 컬럼 places.category
  // 와는 일부 다름 ('suit' ↔ 'tailor_shop'). 쿼리 전 변환.
  const inferToDbCategory: Record<string, string> = {
    suit: "tailor_shop",
  };
  const dbCategory = inferToDbCategory[category] ?? category;

  // 비교는 5곳을 기본. 메시지에 숫자가 있으면 그 값(3~10) 으로.
  const numMatch = userMessage.match(/(\d+)\s*곳/);
  const limit = numMatch ? Math.max(3, Math.min(10, Number(numMatch[1]))) : 5;

  let query = (supabase as any)
    .from("places")
    .select("place_id, name, category, city, district, avg_rating, review_count, min_price, is_partner, is_active")
    .eq("category", dbCategory)
    .eq("is_active", true)
    .is("deleted_at", null)
    .gte("review_count", 1)
    .order("avg_rating", { ascending: false, nullsFirst: false });
  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data } = await query.limit(limit);

  if (!data || data.length === 0) {
    return `**${region ?? "전체"} ${PLACE_CATEGORY_LABEL[category]} 비교** \n\n해당 조건에 매칭되는 업체가 없어요. 조건(지역·카테고리)을 바꿔 다시 물어봐 주세요.`;
  }

  // 표 헤더 — 별점·후기·시작가·시군구.
  const tableHeader = "| 업체 | 별점 | 후기 | 시작가 | 위치 |\n|---|---:|---:|---:|---|";
  // F#9·#3·#13 — inferCategory 출력 형식(user-facing slug) 기준 라우트 매핑.
  // App.tsx 라우트와 일치. inferCategory 가 만들 수 없는 'tailor_shop' 같은 DB
  // slug 는 매핑할 필요 없음(쿼리 전에 inferToDbCategory 로 변환됨).
  const detailRoute = (cat: string): string => {
    switch (cat) {
      case "wedding_hall":     return "venue";
      case "studio":           return "studio";
      case "dress_shop":       return "studio";       // dress 는 studio 상세 페이지에서 처리
      case "makeup_shop":      return "studio";       // makeup 도 마찬가지
      case "hanbok":           return "hanbok";
      case "suit":             return "suit";         // App.tsx /suit/:id (NOT tailor_shop)
      case "honeymoon":        return "honeymoon";
      case "jewelry":          return "jewelry";
      case "appliance":        return "appliances";   // App.tsx /appliances/:id (plural)
      case "invitation_venue": return "invitation-venues"; // F#13 plural — App.tsx /invitation-venues/:id
      default:                 return "venue";
    }
  };
  const route = detailRoute(category);
  // F#D5·#9 — CommonMark 특수문자 전체 이스케이프. 표 셀 `|` 와 link `[]()` 외에도
  // `*`/`_`/`` ` ``/`~`/`!`/`{}`/`#`/`+`/`-`/`.` 등 마크다운 의미 가진 문자 모두.
  // backslash 먼저 escape (후속 escape 가 backslash 도입).
  const escapeMd = (s: string): string =>
    s.replace(/\\/g, "\\\\").replace(/([`*_{}\[\]()#+\-.!|~])/g, "\\$1");
  const rows = (data as any[]).map((p) => {
    const star = p.avg_rating != null ? p.avg_rating.toFixed(1) : "-";
    const reviews = p.review_count ?? 0;
    const price = p.min_price ? `${(p.min_price / 10000).toFixed(0)}만~` : "-";
    const loc = p.district ? escapeMd(p.district) : "-";
    const partner = p.is_partner ? " ⭐" : "";
    const link = `[${escapeMd(p.name)}${partner}](/${route}/${p.place_id})`;
    return `| ${link} | ${star} | ${reviews} | ${price} | ${loc} |`;
  });

  const tip =
    category === "wedding_hall"
      ? "별점·시작가는 시작점. **추가금 항목**(원본·헬퍼·식대 보증)이 더 큰 변수예요. 각 업체 상세에서 [계약 전 확인] 카드 꼭 비교."
      : category === "studio"
        ? "스튜디오는 **원본 데이터 포함 여부·보정 컷 수**가 가격 차이의 핵심."
        : "각 업체 상세에서 [계약 전 확인] 카드의 추가금 체크리스트를 비교해보세요.";

  return `**${region ?? "전체"} ${PLACE_CATEGORY_LABEL[category] ?? category} ${data.length}곳 비교**\n\n${tableHeader}\n${rows.join("\n")}\n\n${tip}`;
};

// ════════════════════════════════════════════════════════════
// 명시 발동: 사용자가 "웹에서 찾아줘"라고 명시할 때
// ════════════════════════════════════════════════════════════
// DB 우회. 항상 Gemini Search Grounding으로 답변. 사용자가 의도적으로
// 최신 정보를 요청한 케이스 (예: 신생 업체·트렌드·뉴스성 정보).
export const handleExplicitWebSearch = async (userMessage: string): Promise<string> => {
  const category = inferCategory(userMessage);
  const region = inferRegion(userMessage);

  const web = await callWebSearch("search", userMessage, {
    category: category ?? undefined,
    region: region ?? undefined,
  });

  if (web.limitMessage) {
    return `**웹 검색** \n\n${web.limitMessage}`;
  }
  if (web.failed || !web.reply) {
    return `**웹 검색** \n\n검색 중 일시적 문제가 발생했어요. 잠시 후 다시 시도해주세요.`;
  }

  const filters = [
    region && ` ${region}`,
    category && ` ${PLACE_CATEGORY_LABEL[category]}`,
  ].filter(Boolean).join(" · ");
  const header = filters
    ? `**웹 검색 결과** \n${filters}\n\n`
    : `**웹 검색 결과** \n\n`;

  return header + formatWebSearchReply(web);
};
