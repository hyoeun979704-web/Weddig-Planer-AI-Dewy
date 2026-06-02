import type { WeddingPersonaMode } from "@/lib/weddingPersona";

/**
 * 상세 페이지 추천 캐러셀의 페르소나 맞춤 카피.
 *
 * 19개 persona_mode 를 8개 톤으로 묶어, "비슷한 업체"/"근처 다른 준비" 두 행의
 * 문구를 사용자 맥락(가성비·프리미엄·스몰·셀프·지역·원격·초보)에 맞게 바꾼다.
 * 제목의 카테고리("비슷한 드레스")는 명확성을 위해 유지하고, hint·근처 제목만 맞춤.
 * (PERSONA_HEADER 와 동일한 톤 체계 — 앱 전반의 페르소나 카피와 일관)
 */
export interface RecCopy {
  /** "비슷한 OO" 행의 부제 */
  similarHint: string;
  /** "근처 타 카테고리" 행의 제목 */
  nearbyTitle: string;
  /** "근처 타 카테고리" 행의 부제 */
  nearbyHint: string;
}

type Tone =
  | "standard"
  | "budget"
  | "luxury"
  | "small"
  | "self"
  | "regional"
  | "overseas"
  | "first";

const PERSONA_TONE: Partial<Record<WeddingPersonaMode, Tone>> = {
  budget_analytic: "budget",
  small_budget: "budget",
  luxury_hotel: "luxury",
  small_luxury: "luxury",
  small_intimate: "small",
  small_outdoor: "small",
  remarriage: "small",
  self_no_ceremony: "self",
  single_household: "self",
  designer_late: "self",
  snap_only: "self",
  regional: "regional",
  remote_overseas: "overseas",
  international: "overseas",
  first_timer: "first",
  // standard_bride · standard_groom · pregnancy · no_wedding_travel → standard
};

const COPY: Record<Tone, RecCopy> = {
  standard: {
    similarHint: "같은 지역의 비슷한 곳이에요",
    nearbyTitle: "이 근처에서 다음 준비도",
    nearbyHint: "가까운 곳에서 다음 단계도 함께 둘러보세요",
  },
  budget: {
    similarHint: "같은 지역에서 가격까지 비교해보세요",
    nearbyTitle: "근처에서 다음 준비도 알뜰하게",
    nearbyHint: "동선이 가까우면 발품도 비용도 줄어요",
  },
  luxury: {
    similarHint: "같은 지역의 프리미엄 선택지예요",
    nearbyTitle: "근처에서 이어가는 프리미엄 준비",
    nearbyHint: "가까운 곳으로 모아 후기까지 꼼꼼히 비교해보세요",
  },
  small: {
    similarHint: "스몰웨딩에 어울리는 같은 지역 업체예요",
    nearbyTitle: "근처에서 스몰웨딩 다음 준비",
    nearbyHint: "작고 가까운 동선으로 다음 단계를 묶어보세요",
  },
  self: {
    similarHint: "내 취향에 맞는 같은 지역 업체예요",
    nearbyTitle: "근처에서 내 페이스로 다음 준비",
    nearbyHint: "가까운 곳부터 하나씩 채워가요",
  },
  regional: {
    similarHint: "이 지역의 비슷한 업체예요",
    nearbyTitle: "이 지역에서 다음 준비도",
    nearbyHint: "권역 안에서 동선을 묶어 효율적으로 둘러보세요",
  },
  overseas: {
    similarHint: "같은 지역의 비슷한 곳이에요",
    nearbyTitle: "근처로 모아 방문 일정 한 번에",
    nearbyHint: "가까운 곳을 묶어 한국 방문 일정을 압축해보세요",
  },
  first: {
    similarHint: "같은 지역의 비슷한 곳부터 천천히 봐요",
    nearbyTitle: "다음은 이 근처부터",
    nearbyHint: "뭐부터 할지 막막하면 가까운 곳부터 차근차근",
  },
};

export function recommendationCopy(
  mode: WeddingPersonaMode | null | undefined,
): RecCopy {
  const tone = (mode && PERSONA_TONE[mode]) || "standard";
  return COPY[tone];
}
