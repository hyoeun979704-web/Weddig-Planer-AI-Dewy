/**
 * 찜 목록 검색·종류별 조회 핸들러
 *
 * 두 가지 진입:
 *  1. 종류별 ("찜한 영상", "찜한 식장") → itemType만 매칭
 *  2. 키워드 검색 ("찜에서 드레스 영상") → itemType + keyword 매칭
 *
 * 결과 모호 시 LLM 컨텍스트 주입을 위한 raw 데이터를 함께 반환할 수 있다.
 * (현 단계에서는 즉답만, LLM 컨텍스트 주입은 d-2에서 추가)
 */

import { supabase } from "@/integrations/supabase/client";

// favorites.item_type 값 ↔ 사용자 친화적 라벨·소스 테이블 매핑
export const ITEM_TYPE_MAP = {
  place: { label: "장소·업체", table: "places", idCol: "place_id", titleCol: "name" },
  product: { label: "상품", table: "products", idCol: "id", titleCol: "name" },
  tip_video: { label: "영상·팁", table: "tip_videos", idCol: "id", titleCol: "title" },
  community_post: { label: "커뮤니티 글", table: "community_posts", idCol: "id", titleCol: "title" },
  deal: { label: "특가", table: "partner_deals", idCol: "id", titleCol: "description" },
} as const;

export type ItemTypeKey = keyof typeof ITEM_TYPE_MAP;

/** 사용자 자연어에서 카테고리 키워드 → item_type 추론 */
export const inferItemType = (text: string): ItemTypeKey | "any" => {
  const lower = text.toLowerCase();
  if (/영상|비디오|video|유튜브|youtube|채널/.test(lower)) return "tip_video";
  if (/식장|웨딩홀|스튜디오|드레스샵|메이크업|한복|예복|신혼여행|예물|업체/.test(lower)) return "place";
  if (/상품|제품|쇼핑/.test(lower)) return "product";
  if (/특가|할인|쿠폰|딜/.test(lower)) return "deal";
  if (/게시글|글|커뮤니티|후기/.test(lower)) return "community_post";
  return "any";
};

/** places.category 키워드 매칭 (예: "드레스" → dress_shop) */
const inferPlaceCategory = (text: string): string | null => {
  const lower = text.toLowerCase();
  if (/웨딩홀|식장|결혼식장|예식장/.test(lower)) return "wedding_hall";
  if (/스튜디오|촬영|사진/.test(lower)) return "studio";
  if (/드레스샵|드레스/.test(lower)) return "dress_shop";
  if (/메이크업|메이컵|뷰티/.test(lower)) return "makeup_shop";
  if (/한복/.test(lower)) return "hanbok";
  if (/예복|정장|턱시도/.test(lower)) return "suit";
  if (/신혼여행|허니문/.test(lower)) return "honeymoon";
  if (/예물|반지|쥬얼리|jewelry/.test(lower)) return "jewelry";
  if (/가전|혼수/.test(lower)) return "appliance";
  return null;
};

interface FavoriteResult {
  itemType: ItemTypeKey;
  itemId: string;
  title: string;
  subtitle?: string; // category, channel_name 등
}

/**
 * 핵심 검색 함수
 *
 * @param userId - 사용자 ID
 * @param itemType - 종류 필터 (any = 전체)
 * @param keyword - 키워드 (제목·설명 ILIKE 매칭)
 */
export const queryFavorites = async (
  userId: string,
  itemType: ItemTypeKey | "any",
  keyword?: string,
): Promise<FavoriteResult[]> => {
  // 1. favorites 조회 (itemType 필터)
  let favQuery = (supabase as any)
    .from("favorites")
    .select("item_id, item_type")
    .eq("user_id", userId);

  if (itemType !== "any") {
    favQuery = favQuery.eq("item_type", itemType);
  }
  const { data: favs } = await favQuery;
  if (!favs || favs.length === 0) return [];

  // 2. item_type별로 그룹화
  const idsByType: Record<string, string[]> = {};
  for (const f of favs as Array<{ item_id: string; item_type: string }>) {
    if (!(f.item_type in ITEM_TYPE_MAP)) continue;
    (idsByType[f.item_type] ??= []).push(f.item_id);
  }

  // 3. 각 그룹별로 콘텐츠 테이블 조회
  const results: FavoriteResult[] = [];
  for (const [type, ids] of Object.entries(idsByType)) {
    const map = ITEM_TYPE_MAP[type as ItemTypeKey];
    if (!map) continue;

    const baseQuery = (supabase as any)
      .from(map.table)
      .select(`${map.idCol}, ${map.titleCol}${type === "place" ? ", category, district" : ""}${type === "tip_video" ? ", channel_name, description" : ""}${type === "product" ? ", category, description" : ""}`)
      .in(map.idCol, ids)
      .limit(50);

    const { data } = await baseQuery;
    if (!data) continue;

    for (const row of data as any[]) {
      const title = row[map.titleCol] ?? "(제목 없음)";
      let subtitle: string | undefined;
      if (type === "place") subtitle = row.district || row.category;
      else if (type === "tip_video") subtitle = row.channel_name;
      else if (type === "product") subtitle = row.category;

      // 키워드 필터 (클라이언트 측 — 작은 데이터셋이라 OK)
      if (keyword) {
        const haystack = `${title} ${subtitle ?? ""} ${row.description ?? ""}`.toLowerCase();
        if (!haystack.includes(keyword.toLowerCase())) continue;
      }

      results.push({
        itemType: type as ItemTypeKey,
        itemId: row[map.idCol],
        title,
        subtitle,
      });
    }
  }

  return results;
};

/** 종류별 찜 — 단순 카운트 + 최근 5개 제목 */
export const handleFavoritesByType = async (
  userId: string,
  itemType: ItemTypeKey,
): Promise<string> => {
  const results = await queryFavorites(userId, itemType);
  const map = ITEM_TYPE_MAP[itemType];

  if (results.length === 0) {
    return `찜한 ${map.label}이 아직 없어요 💗\n관심 있는 항목을 ❤️ 아이콘으로 찜해두시면 여기서 모아 보실 수 있어요.`;
  }

  const lines = results
    .slice(0, 8)
    .map((r) => `• ${r.title}${r.subtitle ? ` — ${r.subtitle}` : ""}`)
    .join("\n");
  const more = results.length > 8 ? `\n\n... 외 ${results.length - 8}건` : "";

  return `찜하신 ${map.label} **${results.length}건** 이에요 💗\n\n${lines}${more}\n\n전체 목록은 [즐겨찾기 페이지](/favorites)에서 확인하실 수 있어요.`;
};

/** 키워드 검색 — itemType + keyword 둘 다 활용 */
export const handleFavoritesSearch = async (
  userId: string,
  keyword: string,
  itemType: ItemTypeKey | "any" = "any",
): Promise<{ reply: string; needsLlmContext: boolean; rawResults?: FavoriteResult[] }> => {
  const results = await queryFavorites(userId, itemType, keyword);

  // 결과 0건 — 게이트 즉답
  if (results.length === 0) {
    const typeLabel = itemType === "any" ? "찜한 항목" : `찜한 ${ITEM_TYPE_MAP[itemType].label}`;
    return {
      reply: `${typeLabel} 중에서 "${keyword}" 와 일치하는 항목을 찾지 못했어요 🌿\n\n다른 키워드로 시도해보시거나, [즐겨찾기 페이지](/favorites)에서 직접 확인해보세요.`,
      needsLlmContext: false,
    };
  }

  // 결과 1~2건 — 게이트 즉답 (확실)
  if (results.length <= 2) {
    const lines = results
      .map((r) => `• ${r.title}${r.subtitle ? ` — ${r.subtitle}` : ""}`)
      .join("\n");
    return {
      reply: `"${keyword}" 와 일치하는 찜한 항목을 찾았어요 ✨\n\n${lines}\n\n[즐겨찾기 페이지](/favorites)에서 자세히 보실 수 있어요.`,
      needsLlmContext: false,
    };
  }

  // 결과 3~10건 — 게이트 즉답 (목록 표시)
  if (results.length <= 10) {
    const lines = results
      .slice(0, 10)
      .map((r) => `• ${r.title}${r.subtitle ? ` — ${r.subtitle}` : ""}`)
      .join("\n");
    return {
      reply: `"${keyword}" 와 일치하는 찜한 항목 **${results.length}건**\n\n${lines}\n\n특정 항목이 어떤 건지 더 알려주시면 자세히 도와드릴게요.`,
      needsLlmContext: false,
    };
  }

  // 결과 10건 초과 — LLM에 컨텍스트로 위임 (d-2에서 활성화 예정)
  return {
    reply: `"${keyword}" 와 일치하는 찜한 항목이 **${results.length}건**으로 너무 많아요 📚\n\n조금 더 구체적인 키워드(예: 채널명·지역·가격대)로 다시 물어봐 주시거나, [즐겨찾기 페이지](/favorites)에서 직접 보시는 게 빠를 거예요.`,
    needsLlmContext: true,
    rawResults: results,
  };
};
