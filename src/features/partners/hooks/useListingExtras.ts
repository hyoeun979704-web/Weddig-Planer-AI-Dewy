import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isMoodTag } from "@/lib/tasteTaxonomy";

// 완성도 게이지 확장 신호(M5) — 기본 필드 외에 개인화 루프의 연료(포트폴리오·무드 태깅)
// 충족 여부. 추가 쿼리는 count 1 + 앨범 style_tags 소량 조회(마이그레이션 없음).
//  - hasPortfolio: place_media 1건 이상(사진/메뉴)
//  - hasMood: 앨범 style_tags 에 통제 무드(MOOD_TAGS) 1개 이상 — 취향 매칭 가능 여부

export interface ListingExtras {
  hasPortfolio: boolean;
  hasMood: boolean;
}

const EMPTY: ListingExtras = { hasPortfolio: false, hasMood: false };

export function useListingExtras(placeId: string | null): ListingExtras {
  const { data } = useQuery({
    queryKey: ["listing-extras", placeId],
    enabled: !!placeId,
    staleTime: 60_000,
    queryFn: async (): Promise<ListingExtras> => {
      if (!placeId) return EMPTY;
      const [mediaRes, albumsRes] = await Promise.all([
        supabase.from("place_media").select("*", { count: "exact", head: true }).eq("place_id", placeId),
        supabase.from("place_media_albums").select("style_tags").eq("place_id", placeId),
      ]);
      const albums = (albumsRes.data ?? []) as { style_tags: string[] | null }[];
      const hasMood = albums.some((a) => (a.style_tags ?? []).some((t) => isMoodTag(t)));
      return { hasPortfolio: (mediaRes.count ?? 0) > 0, hasMood };
    },
  });
  return data ?? EMPTY;
}
