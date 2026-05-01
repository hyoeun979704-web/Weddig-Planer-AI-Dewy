/**
 * 자유 텍스트 기반 places 검색·통계 핸들러
 * - 지역별 식장 평균 시세
 * - 카테고리·지역 자유 검색
 * - 인기 업체 랭킹
 */

import { supabase } from "@/integrations/supabase/client";

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

const REGION_KEYWORDS = [
  "강남", "강북", "강동", "강서", "서초", "송파", "마포", "용산",
  "종로", "중구", "성동", "광진", "동대문", "성북", "도봉",
  "노원", "은평", "양천", "구로", "금천", "관악", "동작",
  "영등포", "서대문", "중랑", "강화",
  "서울", "경기", "인천", "성남", "수원", "용인", "안양", "고양",
  "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충남", "충북", "전남", "전북", "경남", "경북", "제주",
  "천안", "청주", "춘천", "원주", "제천",
];

const inferCategory = (text: string): string | null => {
  for (const [kw, cat] of Object.entries(PLACE_CATEGORY_KEYWORDS)) {
    if (text.includes(kw)) return cat;
  }
  return null;
};

const inferRegion = (text: string): string | null => {
  for (const r of REGION_KEYWORDS) {
    if (text.includes(r)) return r;
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
export const handleFreeTextSearch = async (userMessage: string): Promise<string> => {
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
      region && `📍 ${region}`,
      category && `🏷️ ${PLACE_CATEGORY_LABEL[category]}`,
      budget && `💰 ${budget}만원`,
    ].filter(Boolean).join(" · ");
    return `**검색 결과** 🔍\n${filters}\n\n조건에 맞는 업체를 찾지 못했어요 🌿\n다른 지역·카테고리로 시도해보시거나 [전체 페이지](/venues)에서 직접 살펴보세요.`;
  }

  // 정렬: partner > rating
  const sorted = [...data].sort((a: any, b: any) => {
    if (a.is_partner !== b.is_partner) return b.is_partner ? 1 : -1;
    return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
  });

  const lines = sorted.slice(0, 8).map((p: any) => {
    const region = p.district || p.city || "";
    const price = p.min_price ? `${(p.min_price / 10000).toLocaleString()}만원~` : "가격 문의";
    const star = p.avg_rating ? `★${p.avg_rating}` : "";
    const partner = p.is_partner ? " ⭐" : "";
    return `• **${p.name}** (${region}) ${price} ${star}${partner}`;
  }).join("\n");

  const summary = [
    region && `📍 ${region}`,
    category && `🏷️ ${PLACE_CATEGORY_LABEL[category]}`,
  ].filter(Boolean).join(" · ");

  return `**검색 결과 ${data.length}건 (상위 8)** 🔍\n${summary}\n\n${lines}\n\n자세히 보기: ${
    category === "wedding_hall" ? "[웨딩홀](/venues)" :
    category === "studio" ? "[스튜디오](/studios)" :
    "[전체 카테고리](/venues)"
  }`;
};

// ════════════════════════════════════════════════════════════
// 카테고리·지역 평균 시세
// ════════════════════════════════════════════════════════════
export const handleAveragePrice = async (userMessage: string): Promise<string> => {
  const category = inferCategory(userMessage) ?? "wedding_hall";
  const region = inferRegion(userMessage);

  let query = (supabase as any)
    .from("places")
    .select("min_price, district")
    .eq("category", category)
    .eq("is_active", true)
    .not("min_price", "is", null);

  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data } = await query;

  if (!data || data.length < 3) {
    return `**${region ?? "전체"} ${PLACE_CATEGORY_LABEL[category]} 시세** 💰\n\n아직 충분한 데이터가 없어 평균을 내기 어려워요. [전체 페이지](/venues)에서 직접 확인해보세요.`;
  }

  const prices = data.map((d: any) => d.min_price).filter(Boolean).sort((a: number, b: number) => a - b);
  const avg = Math.round(prices.reduce((s: number, p: number) => s + p, 0) / prices.length);
  const median = prices[Math.floor(prices.length / 2)];
  const min = prices[0];
  const max = prices[prices.length - 1];

  return `**${region ?? "전국"} ${PLACE_CATEGORY_LABEL[category]} 시세** 💰\n표본 ${data.length}곳 기준\n\n` +
    `• 평균: ${(avg / 10000).toLocaleString()}만원~\n` +
    `• 중간값: ${(median / 10000).toLocaleString()}만원~\n` +
    `• 최저: ${(min / 10000).toLocaleString()}만원~\n` +
    `• 최고: ${(max / 10000).toLocaleString()}만원~\n\n` +
    `* 표시 가격은 시작가(min_price) 기준이며 옵션·시기에 따라 변동돼요.`;
};

// ════════════════════════════════════════════════════════════
// 인기 업체 (rating 정렬)
// ════════════════════════════════════════════════════════════
export const handlePopularPlaces = async (userMessage: string): Promise<string> => {
  const category = inferCategory(userMessage);
  const region = inferRegion(userMessage);

  let query = (supabase as any)
    .from("places")
    .select("place_id, name, category, district, avg_rating, review_count, is_partner")
    .eq("is_active", true)
    .gte("review_count", 5)
    .order("avg_rating", { ascending: false });

  if (category) query = query.eq("category", category);
  if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);

  const { data } = await query.limit(8);

  if (!data || data.length === 0) {
    return `**인기 업체 추천** 🌟\n\n해당 조건에 충분한 후기가 쌓인 업체가 아직 없어요. 다른 조건으로 시도해보세요.`;
  }

  const lines = data.map((p: any) => {
    const cat = PLACE_CATEGORY_LABEL[p.category] ?? p.category;
    const partner = p.is_partner ? " ⭐" : "";
    return `• **${p.name}** [${cat}] ${p.district ?? ""} — ★ ${p.avg_rating} (${p.review_count}건)${partner}`;
  }).join("\n");

  const filters = [region && `📍 ${region}`, category && `🏷️ ${PLACE_CATEGORY_LABEL[category]}`]
    .filter(Boolean).join(" · ");

  return `**인기 업체 TOP ${data.length}** 🌟\n${filters || "전체"}\n\n${lines}\n\n별점 기준 상위. [전체 비교](/venues)에서 더 많은 옵션을 보실 수 있어요.`;
};
