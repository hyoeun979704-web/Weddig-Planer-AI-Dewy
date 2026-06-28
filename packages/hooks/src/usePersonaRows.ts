import { useQueries } from "@tanstack/react-query";
import { fetchVendorsByCategory, type Vendor } from "@/hooks/useVendors";
import {
  PERSONA_REC_CATEGORIES,
  SLUG_TO_LIST_PATH,
  recRowTitle,
  type RecCategorySlug,
} from "@/lib/personaRecommendations";
import type { WeddingPersonaMode } from "@/lib/weddingPersona";

// 한 행에 보여줄 카드 수. 가로 스크롤이라 12개면 충분(상위 큐레이션 결과).
const PER_ROW = 12;

export interface PersonaRow {
  slug: RecCategorySlug;
  title: string;
  listPath: string;
  vendors: Vendor[];
}

// 페르소나별 카테고리 순서대로 홈 "맞춤 추천" 행 스택을 구성한다. 카테고리마다 개별
// 쿼리(useQueries)로 가져와 카테고리 간 풀 잠식(starvation: 한 카테고리가 공용 풀을
// 독점해 다른 행이 비는 현상) 없이 행마다 상위 N개를 보장한다. 각 쿼리는 limit 으로
// 풀이 제한돼(단일 카테고리 join) 단일 추천 행보다 무겁지 않다.
//
// 결과 0건 행은 여기서 걸러 반환(빈 행 숨김 — dead-end UI 방지, AGENTS.md 큐레이션
// 규칙). excluded 는 사용자가 설정에서 숨긴 카테고리 슬러그(예: 셀프 사용자의 메이크업).
export function usePersonaRows(
  personaMode: WeddingPersonaMode,
  region: string | null,
  excluded: Set<string> = new Set(),
): { rows: PersonaRow[]; isLoading: boolean } {
  const slugs = (PERSONA_REC_CATEGORIES[personaMode] ?? PERSONA_REC_CATEGORIES.standard_bride)
    .filter((s) => !excluded.has(s));

  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["persona-row", slug, region ?? null],
      queryFn: () => fetchVendorsByCategory(slug, region, PER_ROW),
      staleTime: 5 * 60_000,
    })),
  });

  const rows: PersonaRow[] = slugs
    .map((slug, i) => ({
      slug,
      title: recRowTitle(slug),
      listPath: SLUG_TO_LIST_PATH[slug],
      vendors: (results[i]?.data ?? []) as Vendor[],
    }))
    // 빈 행은 숨긴다(공급 0인 카테고리로 빈 영역 만들지 않음).
    .filter((row) => row.vendors.length > 0);

  const isLoading = results.some((r) => r.isLoading);
  return { rows, isLoading };
}
