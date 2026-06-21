import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { placeToVendor, CATEGORY_CARD_TABLE, type Vendor } from "@/lib/placeMappers";

// 취향 스와이프 덱에 쓰는 스타일 핵심 카테고리(비주얼이 취향을 가장 잘 드러내는 순서).
// 슬러그는 places.category 와 동일(검증). favorites item_type 매핑도 존재(PLACE_CATEGORY_TO_ITEM_TYPE).
const DECK_CATEGORIES = ["dress_shop", "studio", "wedding_hall", "makeup_shop"] as const;
const PER_CATEGORY = 5;

// 한 카테고리에서 대표 이미지가 있는 상위 업체를 가져온다. 큐레이션: is_active + 이미지
// 있음(스와이프는 비주얼 판단) → 파트너 등급 > 충실도 > 평점. region 지정 시 내 지역을
// 앞으로(소프트) — 클라 재정렬이 의미 있도록 풀을 넉넉히 가져온 뒤 자른다.
async function fetchStyleCards(slug: string, region: string | null): Promise<Vendor[]> {
  const cardTable = CATEGORY_CARD_TABLE[slug];
  const select = cardTable ? `*, ${cardTable}(*)` : "*";
  const { data, error } = await supabase
    .from("places")
    .select(select)
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("category", slug)
    .not("main_image_url", "is", null)
    .order("partner_rank", { ascending: false })
    .order("data_completeness", { ascending: false })
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .limit(region ? PER_CATEGORY * 4 : PER_CATEGORY);
  if (error) throw error;
  let rows = (data ?? []) as unknown as Parameters<typeof placeToVendor>[0][];
  // 지역 우선(부분문자열 매칭 금지: '충남' vs '충청남도' 회귀 방지 — 정확 일치 stable 정렬).
  if (region) {
    rows = rows
      .map((r, i) => ({ r, i }))
      .sort((a, b) => {
        const am = a.r.city === region ? 0 : 1;
        const bm = b.r.city === region ? 0 : 1;
        return am - bm || a.i - b.i;
      })
      .map(({ r }) => r);
  }
  return rows.slice(0, PER_CATEGORY).map(placeToVendor);
}

// I1 — 온보딩 시각취향 seed. 스타일 카테고리에서 카드를 카테고리별로 가져와 번갈아
// (interleave) 배치해 한 종류로 쏠리지 않게 한다(다양성). 결과는 favorites 로 seed 된다.
export function useStyleSwipeDeck(region: string | null, enabled = true) {
  return useQuery({
    queryKey: ["style-swipe-deck", region ?? null],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Vendor[]> => {
      const perCat = await Promise.all(
        DECK_CATEGORIES.map((slug) => fetchStyleCards(slug, region)),
      );
      // 카테고리를 번갈아 끼워 넣어(라운드로빈) 다양성 확보.
      const deck: Vendor[] = [];
      const maxLen = perCat.reduce((m, l) => Math.max(m, l.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const list of perCat) {
          if (list[i]) deck.push(list[i]);
        }
      }
      return deck;
    },
  });
}
