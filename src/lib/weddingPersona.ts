// 페르소나 시스템 — 단일 레지스트리 + 우선순위 룰테이블.
//
// 사용자 wedding_settings 입력으로부터 20개 페르소나 중 하나로 **결정적으로** 분류한다.
// 모든 모드의 정의(라벨/헤더/AI설명/분류조건)를 `PERSONA_REGISTRY` 한 곳에 모아,
// 라벨·헤더·AI설명·derive 가 4곳에 흩어져 드리프트 나던 문제를 없앴다.
//
// 엣지케이스 방지 구조:
//  - 레지스트리 **배열 순서 = 우선순위**. derive 는 위에서부터 첫 match 를 반환 →
//    조합 충돌(임신+재혼+스몰 등)도 항상 같은 결과. 마지막 엔트리(standard_bride)는
//    match=()=>true 라 입력공간을 전수 커버(fall-through 갭 없음).
//  - 모든 모드는 `derivable`(자동분류) 또는 override-only(view-as) 로 명시.
//  - DB 트리거(derive_wedding_persona)와 **같은 우선순위·조건**을 유지해야 한다.
//    현재 기존 16모드는 트리거와 동일. 신규 4모드(remarriage_with_children /
//    budget_analytic / designer_late / first_timer)는 신규 입력 신호(has_children /
//    planning_style)로만 발화하며, 그 신호를 수집·저장하기 전까지는 클라/트리거 모두
//    발생시키지 않는다(실데이터 parity 보존). 활성화 시 트리거도 같은 우선순위로 갱신할 것.
//
// persona_mode override(view-as)는 `user_wedding_settings.persona_mode_overridden_at`
// 마커로 보존(트리거가 marker NOT NULL 이면 자동 derive 스킵). reset 은
// `update({ persona_mode_overridden_at: null })`.

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
  | "remarriage_with_children"
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

/** 성향 페르소나(예식 유형과 직교)를 구분하는 신호. 미지정 시 'standard'. */
export type PlanningStyle = "standard" | "budget_analytic" | "designer" | "beginner";

export interface PersonaInputs {
  wedding_style: WeddingStyle | null;
  ceremony_type: CeremonyType | null;
  marital_history: "first" | "remarriage" | null;
  pregnant: boolean;
  role: UserRole | null;
  country: string | null; // ISO-3166-1 alpha-2, default 'KR'
  wedding_country: string | null; // 예식 국가, default 'KR'
  wedding_region: string | null; // 시도 풀네임 또는 라벨
  has_parents_bride: boolean;
  has_parents_groom: boolean;
  // 신규(선택) — 미제공 시 기존 동작과 동일(해당 모드는 발화 안 함).
  has_children?: boolean; // 재혼 시 자녀 동반 여부 → remarriage_with_children
  planning_style?: PlanningStyle | null; // 성향 페르소나(budget/designer/beginner)
}

const METRO_REGIONS = new Set([
  "서울특별시", "서울", "경기도", "경기", "인천광역시", "인천",
]);

/** derive 보조 — 입력에서 1회 계산하는 파생 신호. */
interface DeriveCtx {
  isInternational: boolean;
  isOverseas: boolean;
  noParents: boolean;
  isRegional: boolean;
  ps: PlanningStyle;
}

function buildCtx(s: PersonaInputs): DeriveCtx {
  const country = s.country ?? "KR";
  const weddingCountry = s.wedding_country ?? "KR";
  return {
    // international = 예식 자체가 해외(wedding_country≠KR) 또는 이중식(dual 은 match 에서 OR).
    // 거주지만 해외(country≠KR)이고 예식은 한국(wedding_country=KR)인 케이스는
    // international 이 아니라 remote_overseas(원격 준비 — 한국 방문 일정 압축·부모 위임).
    // 그래서 예전의 `country !== weddingCountry` 조건은 빼서 remote_overseas 가 가려지지 않게 한다.
    isInternational: weddingCountry !== "KR",
    isOverseas: country !== "KR",
    noParents: !s.has_parents_bride && !s.has_parents_groom,
    isRegional: !!s.wedding_region && !METRO_REGIONS.has(s.wedding_region),
    ps: s.planning_style ?? "standard",
  };
}

interface PersonaDef {
  id: WeddingPersonaMode;
  /** 모달·온보딩에서 보일 라벨. */
  label: string;
  /** 홈 헤더 카피. */
  header: { title: string; subtitle: string };
  /** AI 플래너 시스템 프롬프트에 주입되는 한 줄 요약. */
  ai: string;
  /** true=입력 신호로 자동분류 / false=수동 view-as 전용. */
  derivable: boolean;
  /** 분류 조건. 배열 순서대로 평가, 첫 true 가 이김. */
  match: (s: PersonaInputs, c: DeriveCtx) => boolean;
}

// ─── 단일 소스: 20 페르소나, 배열 순서 = 우선순위(위가 높음) ──────────────────
//
// 우선순위 원칙: "더 구체적·고유한 경험"이 위. role(신랑) 은 마지막 modifier —
// 다른 페르소나가 있으면 그쪽이 이기고, 신랑 voice 는 미션 layering 으로 더한다.
// 성향 페르소나(budget/designer/first_timer) 는 구체 예식유형보다 아래(otherwise
// standard 인 사용자만 색칠) — AI/큐레이션에서 layering.
export const PERSONA_REGISTRY: readonly PersonaDef[] = [
  {
    id: "pregnancy",
    label: "임신 중 결혼",
    header: { title: "임신 중 결혼 준비", subtitle: "본식 시점 차수에 맞춰 일정·드레스·동선" },
    ai: "임신 중 결혼 페르소나. 차수별 톤(초기:입덧·보수 / 중기:집중·안정 / 후기:항공제약·동선 최소화). 임산부 드레스·일정 압축 우선.",
    derivable: true,
    // 임신은 의료·안전이 international voice 보다 더 critical → 최상위.
    match: (s) => s.pregnant,
  },
  {
    id: "international",
    label: "국제결혼",
    header: { title: "International Wedding", subtitle: "한국 + 해외 일정 조율·영문 자료 생성" },
    ai: "국제결혼 페르소나. 한국 관습 + 외국 가족 영문 안내. 두 식 일정 조율. 출력 언어는 사용자 prefer 따름.",
    derivable: true,
    match: (s, c) => c.isInternational || s.ceremony_type === "dual_ceremony",
  },
  {
    id: "remarriage_with_children",
    label: "재혼·자녀 동반",
    header: { title: "두 번째 시작, 함께", subtitle: "자녀와 함께하는 새 가족 — 식순·동반·정서 가이드" },
    ai: "재혼+자녀 동반 페르소나. 자녀 동반 결혼식 식순·새 가족 형성·자녀 정서 배려·일정 템플릿. 일반 결혼 가이드는 무가치로 가정.",
    derivable: true,
    match: (s) => s.marital_history === "remarriage" && !!s.has_children,
  },
  {
    id: "remarriage",
    label: "재혼",
    header: { title: "두 번째 시작", subtitle: "작고 따뜻하게 — 양가 톤·자녀 동반까지 함께" },
    ai: "재혼 페르소나. 양가 톤 다운, 자녀 동반 결혼식 사례, 작은 가족식 진행 가이드. 일반 결혼 가이드는 무가치하다고 가정.",
    derivable: true,
    match: (s) => s.marital_history === "remarriage",
  },
  {
    id: "snap_only",
    label: "스냅·기념일",
    header: { title: "기념일 스냅", subtitle: "콘셉트별 작가 매칭·라이프 스타일 패키지" },
    ai: "결혼 외 스냅 페르소나. 결혼 정보 완전 숨김. 콘셉트별 작가·기념일 패키지·라이프스타일.",
    derivable: true,
    match: (s) => s.ceremony_type === "snap_only",
  },
  {
    id: "no_wedding_travel",
    label: "노웨딩",
    header: { title: "노웨딩 라이프 시작", subtitle: "신혼여행·신혼집·혼수 중심" },
    ai: "노웨딩 페르소나. 식 정보 숨기고 신혼여행·신혼집·혼수 중심 큐레이션.",
    derivable: true,
    match: (s) => s.ceremony_type === "none",
  },
  {
    id: "self_no_ceremony",
    label: "셀프웨딩",
    header: { title: "셀프웨딩", subtitle: "촬영·양가 인사·혼인신고까지 한 흐름" },
    ai: "셀프·노식 페르소나. 셀프 촬영 노하우·양가 인사 시나리오·혼인신고 체크리스트.",
    derivable: true,
    match: (s) => s.ceremony_type === "self_only",
  },
  {
    id: "small_outdoor",
    label: "야외 가든 웨딩",
    header: { title: "야외 가든 웨딩", subtitle: "우천·음향·계절 — 야외 디테일까지" },
    ai: "야외 가든 페르소나. 우천 대비·음향·의자 배치·계절 가이드 필수.",
    derivable: true,
    match: (s) => s.ceremony_type === "outdoor",
  },
  {
    id: "small_budget",
    label: "알뜰 스몰웨딩",
    header: { title: "알뜰 스몰웨딩", subtitle: "공공시설·DIY·1천만원대 케이스" },
    ai: "1천만원대 저예산 스몰 페르소나. 공공시설·DIY·양가 모두 여유 없음 변형.",
    derivable: true,
    match: (s) => s.ceremony_type === "public_facility",
  },
  {
    id: "small_luxury",
    label: "프라이빗 호텔 스몰",
    header: { title: "프라이빗 호텔 스몰", subtitle: "고급 패키지 비교·진짜 후기·컨시어지" },
    ai: "호텔 스몰 고급 페르소나. 패키지 비교 매트릭스·진짜 후기 검증·프라이빗 옵션.",
    derivable: true,
    // small_intimate 보다 위 — small + hotel 은 intimate 가 아니라 luxury.
    match: (s) => s.wedding_style === "small" && s.ceremony_type === "hotel",
  },
  {
    id: "small_intimate",
    label: "가족 스몰웨딩",
    header: { title: "가족만의 스몰웨딩", subtitle: "40~80명 진짜 스몰·식순·답례품 큐레이션" },
    ai: "40~80명 진짜 스몰 페르소나. 호텔 스몰 패키지가 아니라 레스토랑·하우스·카페형 큐레이션.",
    derivable: true,
    match: (s) =>
      s.ceremony_type === "small_real" ||
      s.ceremony_type === "restaurant" ||
      (s.wedding_style === "small" && s.ceremony_type !== "hotel"),
  },
  {
    id: "single_household",
    label: "1인 진행",
    header: { title: "내 식, 내 페이스로", subtitle: "1인 진행 가이드와 비표준 진행 사례" },
    ai: "부모 부재 1인 진행 페르소나. 양가 분담 시뮬레이션 대신 1인 변형. 친정 역할 부재 가이드·정서적 톤.",
    derivable: true,
    match: (_s, c) => c.noParents,
  },
  {
    id: "remote_overseas",
    label: "해외 거주",
    header: { title: "원격 결혼 준비", subtitle: "한국 방문 일정 압축·부모 위임·시차 안내" },
    ai: "해외 거주 페르소나. 한국 방문 일정 압축·시차 고려·양가 부모 위임 가능 항목 분배.",
    derivable: true,
    match: (_s, c) => c.isOverseas,
  },
  {
    id: "regional",
    label: "지방 결혼",
    header: { title: "지역 결혼 준비", subtitle: "권역 식장·지방 후기·지역 평균까지" },
    ai: "지방 사용자 페르소나. 지역 권역 식장·지방 평균·지방 후기를 우선 노출.",
    derivable: true,
    match: (_s, c) => c.isRegional,
  },
  {
    id: "luxury_hotel",
    label: "호텔 웨딩",
    header: { title: "호텔 웨딩 큐레이션", subtitle: "비교·견적·진짜 후기로 후회 없는 결정" },
    ai: "호텔 웨딩 고스펙 페르소나. 가격보다 품질·효율. 5천~1억 패키지 비교, PDF 견적, 위임 가능 영역 명시.",
    derivable: true,
    match: (s) => s.ceremony_type === "hotel",
  },
  // ── 성향 페르소나(예식유형과 직교) — 구체 유형이 없을 때만 색칠, AI 가 layering ──
  {
    id: "designer_late",
    label: "만혼·디자이너",
    header: { title: "내 컨셉, 내 식", subtitle: "비표준 옵션·하우스·컨셉추얼 큐레이션" },
    ai: "만혼/디자이너 페르소나. 표준 정보 무가치. 하우스·컨셉추얼·핀터레스트 톤 큐레이션, 복잡 가족 관계 가이드.",
    derivable: true,
    match: (_s, c) => c.ps === "designer",
  },
  {
    id: "budget_analytic",
    label: "절약·분석형",
    header: { title: "꼼꼼한 결혼 준비", subtitle: "추가금·숨겨진 비용까지 데이터로 비교" },
    ai: "절약·데이터 분석 페르소나. 추가금 함정·진짜 후기·양가 분담 표준 비율을 데이터로 답한다.",
    derivable: true,
    match: (_s, c) => c.ps === "budget_analytic",
  },
  {
    id: "first_timer",
    label: "결혼 준비 초보",
    header: { title: "결혼 준비 처음이세요?", subtitle: "단계별로 천천히 안내해드릴게요" },
    ai: "결혼 준비 초보 페르소나. 친근 톤·단계별 안내·또래 매칭 우선.",
    derivable: true,
    match: (_s, c) => c.ps === "beginner",
  },
  {
    id: "standard_groom",
    label: "신랑 주도",
    header: { title: "오늘의 결혼 준비", subtitle: "신랑이 챙길 일·예복·예물까지 통합 안내" },
    ai: "신랑 주도형 페르소나. 호칭은 신랑님 또는 중립. 예복·예물·신랑 양가 가이드를 신부 정보보다 먼저.",
    derivable: true,
    // role 은 마지막 modifier — 다른 페르소나가 없을 때만.
    match: (s) => s.role === "groom",
  },
  {
    id: "standard_bride",
    label: "표준 결혼식 신부",
    header: { title: "오늘의 결혼 준비", subtitle: "다음 한 발자국을 함께 정리해드려요" },
    ai: "표준 결혼식 신부 페르소나. 시간 효율·정보 정리·양가 일정 조율이 우선.",
    derivable: true,
    // catch-all — 입력공간 전수 커버.
    match: () => true,
  },
] as const;

// 레지스트리가 모든 모드를 정확히 1회씩 정의하는지 컴파일 타임 보강(테스트로도 검증).
type _RegistryIds = (typeof PERSONA_REGISTRY)[number]["id"];
type _AssertAllCovered = WeddingPersonaMode extends _RegistryIds ? true : never;
export const _PERSONA_REGISTRY_COVERS_ALL: _AssertAllCovered = true;

/** 입력 신호로부터 페르소나 모드를 분류. DB 트리거와 정확히 같은 우선순위를 유지한다. */
export function derivePersonaMode(s: PersonaInputs): WeddingPersonaMode {
  const ctx = buildCtx(s);
  for (const def of PERSONA_REGISTRY) {
    if (def.match(s, ctx)) return def.id;
  }
  return "standard_bride"; // 도달 불가(catch-all 존재) — 타입 안전용.
}

const byId = <T>(pick: (d: PersonaDef) => T): Record<WeddingPersonaMode, T> =>
  Object.fromEntries(PERSONA_REGISTRY.map((d) => [d.id, pick(d)])) as Record<WeddingPersonaMode, T>;

/** 페르소나별 홈 헤더 카피·도움말. (레지스트리 파생) */
export const PERSONA_HEADER: Record<WeddingPersonaMode, { title: string; subtitle: string }> =
  byId((d) => d.header);

/** 모달·온보딩에서 사용자에게 보일 페르소나 라벨. (레지스트리 파생) */
export const PERSONA_LABEL: Record<WeddingPersonaMode, string> = byId((d) => d.label);

/** AI 플래너 시스템 프롬프트에 주입되는 페르소나 컨텍스트 한 줄 요약. */
export function describePersonaForAI(mode: WeddingPersonaMode): string {
  const def = PERSONA_REGISTRY.find((d) => d.id === mode);
  return (def ?? PERSONA_REGISTRY[PERSONA_REGISTRY.length - 1]).ai;
}

/** 자동분류 가능한 모드 목록(나머지는 view-as 전용). */
export const DERIVABLE_MODES: WeddingPersonaMode[] = PERSONA_REGISTRY.filter((d) => d.derivable).map(
  (d) => d.id,
);

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

/** 재혼 계열(자녀 동반 포함) 모드 — 톤 다운·가족식 분기. */
export function isRemarriageMode(mode: WeddingPersonaMode): boolean {
  return mode === "remarriage" || mode === "remarriage_with_children";
}

/** 양가 부모 협업·분담 시뮬레이터 활성화 여부. */
export function familyCollaborationEnabled(
  s: Pick<PersonaInputs, "has_parents_bride" | "has_parents_groom">,
): boolean {
  return s.has_parents_bride || s.has_parents_groom;
}
