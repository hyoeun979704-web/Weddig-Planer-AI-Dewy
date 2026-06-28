// 비교 대상 로더 — place_id 목록 → 카테고리 상세까지 평탄화한 CompareItem[].
// 찜 비교/견적 비교 모두 같은 형태로 수렴(소스 차이는 상위에서 흡수). usePlaceDetail 의
// 매핑(mapPlaceDetailRow)·SELECT 를 재사용해 드리프트를 막는다.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapPlaceDetailRow, PLACE_DETAIL_SELECT, type LegacyDetail } from "@/hooks/usePlaceDetail";

export interface CompareQuote {
  priceMin: number | null;
  priceMax: number | null;
  message: string | null;
}

export interface CompareItem {
  placeId: string;
  name: string;
  image: string | null;
  category: string;
  detail: LegacyDetail;
  /** 견적 비교일 때만 — 업체가 이 요청에 응답한 가격/메시지. */
  quote?: CompareQuote;
}

export function useCompareItems(
  placeIds: string[],
  quoteByPlace?: Record<string, CompareQuote>,
) {
  // 입력 순서 보존 — 사용자가 고른/응답순 컬럼 순서가 흔들리지 않게.
  const idsKey = placeIds.join(",");
  const query = useQuery({
    queryKey: ["compare-items", idsKey],
    queryFn: async (): Promise<CompareItem[]> => {
      if (placeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("places")
        .select(PLACE_DETAIL_SELECT)
        .in("place_id", placeIds);
      if (error) throw error;
      const byId = new Map<string, LegacyDetail>();
      for (const row of (data ?? []) as unknown[]) {
        const d = mapPlaceDetailRow(row);
        byId.set(d.id, d);
      }
      // 입력 순서대로 정렬 + 삭제/누락된 place 는 제외.
      return placeIds
        .map((id) => byId.get(id))
        .filter((d): d is LegacyDetail => !!d)
        .map((d) => ({
          placeId: d.id,
          name: d.name,
          image: d.thumbnail_url,
          category: d.category,
          detail: d,
          quote: quoteByPlace?.[d.id],
        }));
    },
    enabled: placeIds.length > 0,
  });

  return { items: query.data ?? [], loading: query.isLoading };
}
