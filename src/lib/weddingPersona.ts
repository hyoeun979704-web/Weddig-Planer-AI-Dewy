// 페르소나 시트 v1(P1~P20) 매핑 — 사용자 wedding_settings 입력으로부터
// 자동 분류되는 페르소나 enum과 UX 분기에 쓰이는 헬퍼를 제공한다.
//
// DB 측 trigger(derive_wedding_persona)와 동기 — 두 곳의 우선순위 로직이
// 동일해야 한다. DB 트리거는 영속화 정합성을, 클라이언트 헬퍼는 즉시 분기를
// 책임진다. 둘 다 같은 입력을 받아 같은 결과를 내야 한다.

import type { WeddingStyle } from "./weddingStyle";

export type WeddingPersonaMode =
  | "standard_bride"
  | "standard_groom"
  | "luxury_hotel"
  | "budget_analytic"
  | "designer_late"
  | "first_timer"
  | "regional"
  | "remarriage"
  | "remote_overseas"
  | "single_household"
  | "small_intimate"
  | "small_outdoor"
  | "small_luxury"
  | "small_budget"
  | "self_no_ceremony"
  | "no_wedding_travel"
  | "snap_only"
  | "pregnancy"
  | "international";

export type UserRole = "bride" | "groom" | "shared";

export type CeremonyType =
  | "standard"
  | "hotel"
  | "small_real"
  | "outdoor"
  | "restaurant"
  | "public_facility"
  | "self_only"
  | "none"
  | "snap_only"
  | "dual_ceremony";

export interface PersonaInputs {
  wedding_style: WeddingStyle | null;
  ceremony_type: CeremonyType | null;
  marital_history: "first" | "remarriage" | null;
  pregnant: boolean;
  role: UserRole | null;
  country: string | null;            // ISO-3166-1 alpha-2, default 'KR'
  wedding_country: string | null;    // 예식 국가, default 'KR'
  wedding_region: string | null;     // 시도 풀네임 또는 라벨
  has_parents_bride: boolean;
  has_parents_groom: boolean;
}

const METRO_REGIONS = new Set([
  "서울특별시", "서울", "경기도", "경기", "인천광역시", "인천",
]);

/** 입력 신호로부터 페르소나 모드를 분류. DB 트리거와 정확히 같은 로직을 유지한다.
 *
 * 우선순위 원칙 (Round 8 A 정정):
 * - "더 구체적·고유한 경험" 이 우선. 임신/재혼/국제/스몰계열/ceremony_type 특화 등.
 * - role(신랑/신부) 은 **수식자(modifier)** 로 마지막에 적용 — 다른 페르소나가 있으면
 *   그 페르소나가 이김. 신랑 voice 는 미션 layering + header 보조 자막으로 따로 더한다
 *   (`isGroomMode` 헬퍼 + getMissionsForStyle 의 role 옵션).
 * - 이전엔 role 이 hotel/regional/overseas 보다 위에 있어 호텔 신랑이 luxury_hotel
 *   큐레이션을 못 받고 standard_groom 으로 빠지는 회귀 있었음. role 은 가장 마지막에. */
export function derivePersonaMode(s: PersonaInputs): WeddingPersonaMode {
  const country = s.country ?? "KR";
  const weddingCountry = s.wedding_country ?? "KR";
  const isInternational = weddingCountry !== "KR" || country !== weddingCountry;
  const isOverseas = country !== "KR";
  const noParents = !s.has_parents_bride && !s.has_parents_groom;
  const isRegional = !!s.wedding_region && !METRO_REGIONS.has(s.wedding_region);

  if (isInternational) return "international";
  if (s.pregnant) return "pregnancy";
  if (s.marital_history === "remarriage") return "remarriage";

  if (s.ceremony_type === "snap_only") return "snap_only";
  if (s.ceremony_type === "none") return "no_wedding_travel";
  if (s.ceremony_type === "self_only") return "self_no_ceremony";

  // 스몰 계열 ceremony_type 은 wedding_style 과 무관하게 small_* 페르소나로 매핑.
  // UI 가 "진짜 스몰 (40~80명)" / "야외" / "공공시설" / "레스토랑" 을 ceremony_type
  // 선택만으로 노출하므로, wedding_style='general' 인 채로 골라도 그 의도를 살린다.
  if (s.ceremony_type === "outdoor") return "small_outdoor";
  if (s.ceremony_type === "public_facility") return "small_budget";
  if (s.ceremony_type === "small_real" || s.ceremony_type === "restaurant") return "small_intimate";
  if (s.wedding_style === "small") {
    if (s.ceremony_type === "hotel") return "small_luxury";
    return "small_intimate";
  }

  if (noParents) return "single_household";
  if (isOverseas) return "remote_overseas";
  if (isRegional) return "regional";
  if (s.ceremony_type === "hotel") return "luxury_hotel";

  // role 은 마지막에 — 다른 페르소나가 있으면 그쪽이 이기고, 없을 때만 standard_groom.
  // 다른 페르소나 + role=groom 케이스는 missions/header 의 groom layering 으로 처리.
  if (s.role === "groom") return "standard_groom";

  return "standard_bride";
}

/** 페르소나별 홈 헤더 카피·도움말 — 첫 인상에서 "내가 아니다"를 줄이기 위한 분기. */
export const PERSONA_HEADER: Record<WeddingPersonaMode, { title: string; subtitle: string }> = {
  standard_bride: {
    title: "오늘의 결혼 준비",
    subtitle: "다음 한 발자국을 함께 정리해드려요",
  },
  standard_groom: {
    title: "오늘의 결혼 준비",
    subtitle: "신랑이 챙길 일·예복·예물까지 통합 안내",
  },
  luxury_hotel: {
    title: "호텔 웨딩 큐레이션",
    subtitle: "비교·견적·진짜 후기로 후회 없는 결정",
  },
  budget_analytic: {
    title: "꼼꼼한 결혼 준비",
    subtitle: "추가금·숨겨진 비용까지 데이터로 비교",
  },
  designer_late: {
    title: "내 컨셉, 내 식",
    subtitle: "비표준 옵션·하우스·컨셉추얼 큐레이션",
  },
  first_timer: {
    title: "결혼 준비 처음이세요?",
    subtitle: "단계별로 천천히 안내해드릴게요",
  },
  regional: {
    title: "지역 결혼 준비",
    subtitle: "권역 식장·지방 후기·지역 평균까지",
  },
  remarriage: {
    title: "두 번째 시작",
    subtitle: "작고 따뜻하게 — 양가 톤·자녀 동반까지 함께",
  },
  remote_overseas: {
    title: "원격 결혼 준비",
    subtitle: "한국 방문 일정 압축·부모 위임·시차 안내",
  },
  single_household: {
    title: "내 식, 내 페이스로",
    subtitle: "1인 진행 가이드와 비표준 진행 사례",
  },
  small_intimate: {
    title: "가족만의 스몰웨딩",
    subtitle: "40~80명 진짜 스몰·식순·답례품 큐레이션",
  },
  small_outdoor: {
    title: "야외 가든 웨딩",
    subtitle: "우천·음향·계절 — 야외 디테일까지",
  },
  small_luxury: {
    title: "프라이빗 호텔 스몰",
    subtitle: "고급 패키지 비교·진짜 후기·컨시어지",
  },
  small_budget: {
    title: "알뜰 스몰웨딩",
    subtitle: "공공시설·DIY·1천만원대 케이스",
  },
  self_no_ceremony: {
    title: "셀프웨딩",
    subtitle: "촬영·양가 인사·혼인신고까지 한 흐름",
  },
  no_wedding_travel: {
    title: "노웨딩 라이프 시작",
    subtitle: "신혼여행·신혼집·혼수 중심",
  },
  snap_only: {
    title: "기념일 스냅",
    subtitle: "콘셉트별 작가 매칭·라이프 스타일 패키지",
  },
  pregnancy: {
    title: "임신 중 결혼 준비",
    subtitle: "본식 시점 차수에 맞춰 일정·드레스·동선",
  },
  international: {
    title: "International Wedding",
    subtitle: "한국 + 해외 일정 조율·영문 자료 생성",
  },
};

/** AI 플래너 시스템 프롬프트에 주입되는 페르소나 컨텍스트 한 줄 요약. */
export function describePersonaForAI(mode: WeddingPersonaMode): string {
  const map: Record<WeddingPersonaMode, string> = {
    standard_bride: "표준 결혼식 신부 페르소나. 시간 효율·정보 정리·양가 일정 조율이 우선.",
    standard_groom: "신랑 주도형 페르소나. 호칭은 신랑님 또는 중립. 예복·예물·신랑 양가 가이드를 신부 정보보다 먼저.",
    luxury_hotel: "호텔 웨딩 고스펙 페르소나. 가격보다 품질·효율. 5천~1억 패키지 비교, PDF 견적, 위임 가능 영역 명시.",
    budget_analytic: "절약·데이터 분석 페르소나. 추가금 함정·진짜 후기·양가 분담 표준 비율을 데이터로 답한다.",
    designer_late: "만혼/디자이너 페르소나. 표준 정보 무가치. 하우스·컨셉추얼·핀터레스트 톤 큐레이션, 복잡 가족 관계 가이드.",
    first_timer: "결혼 준비 초보 페르소나. 친근 톤·단계별 안내·또래 매칭 우선.",
    regional: "지방 사용자 페르소나. 지역 권역 식장·지방 평균·지방 후기를 우선 노출.",
    remarriage: "재혼 페르소나. 양가 톤 다운, 자녀 동반 결혼식 사례, 작은 가족식 진행 가이드. 일반 결혼 가이드는 무가치하다고 가정.",
    remote_overseas: "해외 거주 페르소나. 한국 방문 일정 압축·시차 고려·양가 부모 위임 가능 항목 분배.",
    single_household: "부모 부재 1인 진행 페르소나. 양가 분담 시뮬레이션 대신 1인 변형. 친정 역할 부재 가이드·정서적 톤.",
    small_intimate: "40~80명 진짜 스몰 페르소나. 호텔 스몰 패키지가 아니라 레스토랑·하우스·카페형 큐레이션.",
    small_outdoor: "야외 가든 페르소나. 우천 대비·음향·의자 배치·계절 가이드 필수.",
    small_luxury: "호텔 스몰 고급 페르소나. 패키지 비교 매트릭스·진짜 후기 검증·프라이빗 옵션.",
    small_budget: "1천만원대 저예산 스몰 페르소나. 공공시설·DIY·양가 모두 여유 없음 변형.",
    self_no_ceremony: "셀프·노식 페르소나. 셀프 촬영 노하우·양가 인사 시나리오·혼인신고 체크리스트.",
    no_wedding_travel: "노웨딩 페르소나. 식 정보 숨기고 신혼여행·신혼집·혼수 중심 큐레이션.",
    snap_only: "결혼 외 스냅 페르소나. 결혼 정보 완전 숨김. 콘셉트별 작가·기념일 패키지·라이프스타일.",
    pregnancy: "임신 중 결혼 페르소나. 차수별 톤(초기:입덧·보수 / 중기:집중·안정 / 후기:항공제약·동선 최소화). 임산부 드레스·일정 압축 우선.",
    international: "국제결혼 페르소나. 한국 관습 + 외국 가족 영문 안내. 두 식 일정 조율. 출력 언어는 사용자 prefer 따름.",
  };
  return map[mode] ?? map.standard_bride;
}

/** 모달·온보딩에서 사용자에게 보일 페르소나 라벨. */
export const PERSONA_LABEL: Record<WeddingPersonaMode, string> = {
  standard_bride: "표준 결혼식 신부",
  standard_groom: "신랑 주도",
  luxury_hotel: "호텔 웨딩",
  budget_analytic: "절약·분석형",
  designer_late: "만혼·디자이너",
  first_timer: "결혼 준비 초보",
  regional: "지방 결혼",
  remarriage: "재혼",
  remote_overseas: "해외 거주",
  single_household: "1인 진행",
  small_intimate: "가족 스몰웨딩",
  small_outdoor: "야외 가든 웨딩",
  small_luxury: "프라이빗 호텔 스몰",
  small_budget: "알뜰 스몰웨딩",
  self_no_ceremony: "셀프웨딩",
  no_wedding_travel: "노웨딩",
  snap_only: "스냅·기념일",
  pregnancy: "임신 중 결혼",
  international: "국제결혼",
};

/** 노식·스냅·노웨딩 페르소나에서 일반 결혼 정보 카드를 숨겨야 하는지. */
export function shouldHideWeddingCeremony(mode: WeddingPersonaMode): boolean {
  return mode === "no_wedding_travel" || mode === "snap_only";
}

/** 신랑 모드인지 — AI 호칭·미션 그리드 분기에 사용. */
export function isGroomMode(role: UserRole | null, mode: WeddingPersonaMode): boolean {
  return role === "groom" || mode === "standard_groom";
}

/** 국제결혼 모드 — i18n·이중 식 일정 분기. */
export function isInternationalMode(mode: WeddingPersonaMode): boolean {
  return mode === "international";
}

/** 양가 부모 협업·분담 시뮬레이터 활성화 여부. */
export function familyCollaborationEnabled(s: Pick<PersonaInputs, "has_parents_bride" | "has_parents_groom">): boolean {
  return s.has_parents_bride || s.has_parents_groom;
}
