import type { WeddingPersonaMode } from "@/lib/weddingPersona";

/**
 * 상세 페이지 추천 캐러셀의 페르소나 맞춤 카피.
 *
 * 19개 persona_mode 를 8개 톤으로 묶어 두 행의 *부제(hint)* 만 맥락에 맞게 바꾼다.
 * 제목("비슷한 드레스" / "이 근처 다른 준비")은 명확성을 위해 고정 — 페르소나 향은
 * hint 가 가볍게 전한다. 문장 톤은 앱 전반(PERSONA_HEADER·RecommendedSection
 * "~ 골랐어요/추천드려요")과 동일하게 짧고 자연스럽게.
 */
export interface RecCopy {
  /** "비슷한 OO" 행 부제 */
  similarHint: string;
  /** "이 근처 다른 준비" 행 부제 */
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
    similarHint: "같은 지역에서 비슷한 곳을 모았어요",
    nearbyHint: "가까운 곳에서 다음 준비도 골라봤어요",
  },
  budget: {
    similarHint: "같은 지역에서 가격도 함께 비교해봐요",
    nearbyHint: "가까운 곳끼리 묶으면 발품이 줄어요",
  },
  luxury: {
    similarHint: "같은 지역의 프리미엄 위주로 골랐어요",
    nearbyHint: "가까운 곳으로 후기까지 비교해봐요",
  },
  small: {
    similarHint: "스몰웨딩에 어울리는 같은 지역 업체예요",
    nearbyHint: "가까운 곳에서 다음 준비도 가볍게 둘러봐요",
  },
  self: {
    similarHint: "취향이 비슷한 같은 지역 업체예요",
    nearbyHint: "가까운 곳부터 하나씩 채워가요",
  },
  regional: {
    similarHint: "이 지역에서 비슷한 곳을 모았어요",
    nearbyHint: "이 지역에서 다음 준비도 이어가요",
  },
  overseas: {
    similarHint: "같은 지역에서 비슷한 곳을 모았어요",
    nearbyHint: "가까운 곳끼리 묶어 방문 일정 한 번에",
  },
  first: {
    similarHint: "같은 지역에서 비슷한 곳부터 천천히 봐요",
    nearbyHint: "다음은 가까운 곳부터 차근차근",
  },
};

export function recommendationCopy(
  mode: WeddingPersonaMode | null | undefined,
): RecCopy {
  const tone = (mode && PERSONA_TONE[mode]) || "standard";
  return COPY[tone];
}
