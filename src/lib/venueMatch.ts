// "같은 식장 포폴 우선" 매칭 — 사용자가 확정한 식장(user_wedding_settings.
// wedding_venue_place_id / _name)과 같은 장소에서 진행한 포트폴리오(place_media.
// venue_place_id / venue_name)를 가진 업체를 우선 노출하기 위한 순수 점수 함수.
// 설계: docs/260616_reference_matching_design.md §3.5·§5.
//
// 신호 강도: 같은 place_id(정확·결정적) > 식장명 일치(폴백·이름 정규화). 둘 다
// 없으면 0점(회귀 없음 — 기존 정렬 유지). 점수는 순수 함수(같은 입력=같은 결과).
// label vs value 교훈: 식장명은 부분문자열이 아니라 trim 후 정확 일치로 본다
// (예: "T웨딩홀 강남점" ≠ "T웨딩홀" — 다른 지점을 같은 곳으로 오인하지 않음).

/** 사용자가 확정한 예식 식장. */
export interface UserVenue {
  placeId: string | null;
  name: string | null;
}

/** 한 업체 포트폴리오 항목이 가리키는 진행 장소. */
export interface PortfolioVenue {
  venuePlaceId: string | null;
  venueName: string | null;
}

export interface VenueMatch {
  /** 정렬 키(클수록 같은 식장 신호가 강함). */
  score: number;
  /** place_id 정확 일치(가장 강한 신호). */
  sameVenue: boolean;
  /** 식장명만 일치(폴백 — 미등록 식장 대응). */
  byName: boolean;
}

// 같은 식장(place_id)은 지역(quoteMatch.regionMatch=1000)보다 강한 신호로 둔다
// (설계: venue > style > region). 식장명 폴백은 정확도가 낮아 보수적으로 더 낮게.
export const VENUE_MATCH_PLACE_ID = 2000;
export const VENUE_MATCH_NAME = 800;

const norm = (s: string | null | undefined) => (s ?? "").trim();

const NONE: VenueMatch = { score: 0, sameVenue: false, byName: false };

/**
 * 사용자 확정 식장과 업체 포트폴리오들 사이의 같은-식장 매칭 점수.
 * 포폴 중 하나라도 같은 식장을 가리키면 매칭(가장 강한 신호 1건이면 충분).
 */
export function scoreVenueMatch(user: UserVenue | null, portfolios: PortfolioVenue[]): VenueMatch {
  if (!user) return NONE;
  const userPlaceId = norm(user.placeId);
  const userName = norm(user.name);
  if (userPlaceId === "" && userName === "") return NONE;
  if (!portfolios || portfolios.length === 0) return NONE;

  let sameVenue = false;
  let byName = false;
  for (const p of portfolios) {
    if (userPlaceId !== "" && norm(p.venuePlaceId) === userPlaceId) {
      sameVenue = true;
      break; // 정확 일치를 찾으면 더 볼 필요 없음(최강 신호)
    }
    if (userName !== "" && norm(p.venueName) === userName) {
      byName = true; // 계속 돌며 place_id 정확 일치가 있는지 우선 확인
    }
  }

  if (sameVenue) return { score: VENUE_MATCH_PLACE_ID, sameVenue: true, byName: false };
  if (byName) return { score: VENUE_MATCH_NAME, sameVenue: false, byName: true };
  return NONE;
}

/**
 * 업체 목록을 같은-식장 매칭 내림차순으로 안정 정렬(동점은 입력 순서 유지 —
 * 기존 정렬을 그룹 안에서 보존). 각 항목에 `venueMatch` 를 부착해 반환하므로
 * 호출부가 배지("T웨딩홀에서 촬영한 포트폴리오 있어요")를 그릴 수 있다.
 *
 * @param getPortfolios 업체 → 그 업체의 포트폴리오 장소 목록 추출기.
 */
export function rankByVenueMatch<T>(
  user: UserVenue | null,
  items: T[],
  getPortfolios: (item: T) => PortfolioVenue[],
): Array<T & { venueMatch: VenueMatch }> {
  return items
    .map((item, i) => ({ item, i, venueMatch: scoreVenueMatch(user, getPortfolios(item)) }))
    .sort((a, b) => b.venueMatch.score - a.venueMatch.score || a.i - b.i)
    .map(({ item, venueMatch }) => ({ ...item, venueMatch }));
}
