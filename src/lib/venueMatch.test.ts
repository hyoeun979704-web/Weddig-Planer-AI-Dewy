import { describe, it, expect } from "vitest";
import {
  scoreVenueMatch,
  rankByVenueMatch,
  VENUE_MATCH_PLACE_ID,
  VENUE_MATCH_NAME,
  type PortfolioVenue,
} from "./venueMatch";

const pf = (venuePlaceId: string | null, venueName: string | null = null): PortfolioVenue => ({
  venuePlaceId,
  venueName,
});

describe("scoreVenueMatch", () => {
  it("place_id 정확 일치 → 최강 신호(sameVenue)", () => {
    const m = scoreVenueMatch({ placeId: "hall-1", name: "T웨딩홀" }, [pf("hall-1")]);
    expect(m).toEqual({ score: VENUE_MATCH_PLACE_ID, sameVenue: true, byName: false });
  });

  it("place_id 불일치 + 식장명 일치 → 폴백(byName)", () => {
    const m = scoreVenueMatch({ placeId: "hall-1", name: "T웨딩홀" }, [pf(null, "T웨딩홀")]);
    expect(m).toEqual({ score: VENUE_MATCH_NAME, sameVenue: false, byName: true });
  });

  it("place_id 정확 일치가 식장명 일치보다 우선(여러 포폴 중 하나라도 place_id)", () => {
    const m = scoreVenueMatch({ placeId: "hall-1", name: "T웨딩홀" }, [pf(null, "T웨딩홀"), pf("hall-1")]);
    expect(m.sameVenue).toBe(true);
    expect(m.score).toBe(VENUE_MATCH_PLACE_ID);
  });

  it("식장명은 부분문자열이 아니라 정확 일치(다른 지점 오인 방지)", () => {
    const m = scoreVenueMatch({ placeId: null, name: "T웨딩홀" }, [pf(null, "T웨딩홀 강남점")]);
    expect(m.score).toBe(0);
  });

  it("식장명 trim 후 비교", () => {
    const m = scoreVenueMatch({ placeId: null, name: " T웨딩홀 " }, [pf(null, "T웨딩홀")]);
    expect(m.byName).toBe(true);
  });

  it("매칭 없음 → 0점", () => {
    expect(scoreVenueMatch({ placeId: "hall-1", name: "A홀" }, [pf("hall-9", "B홀")]).score).toBe(0);
  });

  it("사용자 식장 정보 없음/포폴 없음 → 0점(회귀 없음)", () => {
    expect(scoreVenueMatch(null, [pf("hall-1")]).score).toBe(0);
    expect(scoreVenueMatch({ placeId: null, name: null }, [pf("hall-1")]).score).toBe(0);
    expect(scoreVenueMatch({ placeId: "hall-1", name: "A홀" }, []).score).toBe(0);
  });

  it("빈 문자열 식장명은 매칭으로 치지 않음", () => {
    expect(scoreVenueMatch({ placeId: null, name: "" }, [pf(null, "")]).score).toBe(0);
  });
});

describe("rankByVenueMatch", () => {
  interface V {
    id: string;
    portfolios: PortfolioVenue[];
  }
  const get = (v: V) => v.portfolios;

  it("같은 식장 보유 업체를 앞으로, 동점은 입력 순서 유지(안정 정렬)", () => {
    const user = { placeId: "hall-1", name: "T웨딩홀" };
    const items: V[] = [
      { id: "a", portfolios: [pf("hall-9")] }, // 매칭 0
      { id: "b", portfolios: [pf("hall-1")] }, // 같은 식장
      { id: "c", portfolios: [pf(null, "T웨딩홀")] }, // 이름 폴백
      { id: "d", portfolios: [] }, // 매칭 0
    ];
    const ranked = rankByVenueMatch(user, items, get);
    expect(ranked.map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
    expect(ranked[0].venueMatch.sameVenue).toBe(true);
    expect(ranked[1].venueMatch.byName).toBe(true);
  });

  it("사용자 식장 없으면 입력 순서 그대로(회귀 없음)", () => {
    const items: V[] = [
      { id: "a", portfolios: [pf("hall-1")] },
      { id: "b", portfolios: [pf("hall-2")] },
    ];
    const ranked = rankByVenueMatch(null, items, get);
    expect(ranked.map((r) => r.id)).toEqual(["a", "b"]);
    expect(ranked.every((r) => r.venueMatch.score === 0)).toBe(true);
  });
});
