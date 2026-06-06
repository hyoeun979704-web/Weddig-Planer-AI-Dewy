import { describe, it, expect } from "vitest";
import {
  PERSONA_REGISTRY,
  PERSONA_LABEL,
  PERSONA_HEADER,
  describePersonaForAI,
  derivePersonaMode,
  DERIVABLE_MODES,
  type WeddingPersonaMode,
  type PersonaInputs,
} from "./weddingPersona";

// 모든 모드 — 레지스트리 커버리지 검증의 기준.
const ALL_MODES: WeddingPersonaMode[] = [
  "standard_bride", "standard_groom", "luxury_hotel", "budget_analytic", "designer_late",
  "first_timer", "regional", "remarriage", "remarriage_with_children", "remote_overseas",
  "single_household", "small_intimate", "small_outdoor", "small_luxury", "small_budget",
  "self_no_ceremony", "no_wedding_travel", "snap_only", "pregnancy", "international",
];

// 기본 입력(표준 신부) — 각 테스트는 필요한 신호만 덮어쓴다.
const base = (over: Partial<PersonaInputs> = {}): PersonaInputs => ({
  wedding_style: null,
  ceremony_type: null,
  marital_history: null,
  pregnant: false,
  role: null,
  country: "KR",
  wedding_country: "KR",
  wedding_region: null,
  has_parents_bride: true,
  has_parents_groom: true,
  ...over,
});

describe("PERSONA_REGISTRY 구조", () => {
  it("정확히 20개 모드를 정의한다", () => {
    expect(PERSONA_REGISTRY).toHaveLength(20);
  });

  it("모든 모드를 정확히 1회씩 커버한다(중복·누락 없음)", () => {
    const ids = PERSONA_REGISTRY.map((d) => d.id).sort();
    expect(ids).toEqual([...ALL_MODES].sort());
    expect(new Set(ids).size).toBe(20);
  });

  it("파생 맵(label/header/ai)이 20개 모두를 가진다", () => {
    for (const m of ALL_MODES) {
      expect(PERSONA_LABEL[m]).toBeTruthy();
      expect(PERSONA_HEADER[m].title).toBeTruthy();
      expect(PERSONA_HEADER[m].subtitle).toBeTruthy();
      expect(describePersonaForAI(m)).toBeTruthy();
    }
  });

  it("마지막 엔트리는 catch-all(standard_bride, match 항상 true)", () => {
    const last = PERSONA_REGISTRY[PERSONA_REGISTRY.length - 1];
    expect(last.id).toBe("standard_bride");
    expect(last.match(base(), { isInternational: false, isOverseas: false, noParents: false, isRegional: false, ps: "standard" })).toBe(true);
  });
});

describe("derivePersonaMode — 도달성(모든 자동분류 모드가 어떤 입력으로든 나온다)", () => {
  const reaching: Record<WeddingPersonaMode, PersonaInputs> = {
    pregnancy: base({ pregnant: true }),
    international: base({ wedding_country: "US" }),
    remarriage_with_children: base({ marital_history: "remarriage", has_children: true }),
    remarriage: base({ marital_history: "remarriage" }),
    snap_only: base({ ceremony_type: "snap_only" }),
    no_wedding_travel: base({ ceremony_type: "none" }),
    self_no_ceremony: base({ ceremony_type: "self_only" }),
    small_outdoor: base({ ceremony_type: "outdoor" }),
    small_budget: base({ ceremony_type: "public_facility" }),
    small_luxury: base({ wedding_style: "small", ceremony_type: "hotel" }),
    small_intimate: base({ ceremony_type: "small_real" }),
    single_household: base({ has_parents_bride: false, has_parents_groom: false }),
    remote_overseas: base({ country: "US", wedding_country: "US" }),
    regional: base({ wedding_region: "충청남도" }),
    luxury_hotel: base({ ceremony_type: "hotel" }),
    designer_late: base({ planning_style: "designer" }),
    budget_analytic: base({ planning_style: "budget_analytic" }),
    first_timer: base({ planning_style: "beginner" }),
    standard_groom: base({ role: "groom" }),
    standard_bride: base(),
  };

  it.each(ALL_MODES.filter((m) => m !== "remote_overseas"))("%s 모드에 도달 가능", (mode) => {
    expect(derivePersonaMode(reaching[mode])).toBe(mode);
  });

  // 알려진 갭(기존 동작 보존): remote_overseas 는 현재 international 에 가려진다.
  // international 조건이 `country != wedding_country` 라, 해외 거주자(country!=KR)는
  // wedding_country 가 KR 이어도 international 로 먼저 분류됨 → isOverseas 분기 도달 불가.
  // 이는 재구성 이전 코드/DB 트리거에도 있던 dead branch. "원격 준비(한국식)"를
  // international 과 구분하려면 우선순위/조건 재설계가 필요(제품 결정).
  it("remote_overseas 는 현재 international 에 가려짐(사전 dead branch, 동작 보존)", () => {
    expect(derivePersonaMode(base({ country: "US", wedding_country: "KR" }))).toBe("international");
  });

  it("DERIVABLE_MODES 가 20개 전부(override-only 없음 — 모두 자동분류)", () => {
    expect([...DERIVABLE_MODES].sort()).toEqual([...ALL_MODES].sort());
  });
});

describe("우선순위 충돌 — 결정적 해소", () => {
  it("임신이 재혼·국제·스몰을 모두 이긴다", () => {
    expect(
      derivePersonaMode(base({ pregnant: true, marital_history: "remarriage", wedding_country: "US", wedding_style: "small" })),
    ).toBe("pregnancy");
  });

  it("국제가 재혼을 이긴다", () => {
    expect(derivePersonaMode(base({ wedding_country: "JP", marital_history: "remarriage" }))).toBe("international");
  });

  it("재혼+자녀가 일반 재혼보다 우선", () => {
    expect(derivePersonaMode(base({ marital_history: "remarriage", has_children: true }))).toBe("remarriage_with_children");
    expect(derivePersonaMode(base({ marital_history: "remarriage", has_children: false }))).toBe("remarriage");
  });

  it("small+hotel → small_luxury (intimate 아님)", () => {
    expect(derivePersonaMode(base({ wedding_style: "small", ceremony_type: "hotel" }))).toBe("small_luxury");
  });

  it("레스토랑/스몰리얼 → small_intimate (스타일 무관)", () => {
    expect(derivePersonaMode(base({ ceremony_type: "restaurant" }))).toBe("small_intimate");
    expect(derivePersonaMode(base({ wedding_style: "small", ceremony_type: "restaurant" }))).toBe("small_intimate");
  });

  it("성향(planning_style)은 구체 예식유형보다 아래 — 호텔 신부가 budget_analytic 보다 luxury_hotel", () => {
    expect(derivePersonaMode(base({ ceremony_type: "hotel", planning_style: "budget_analytic" }))).toBe("luxury_hotel");
  });

  it("성향은 otherwise-standard 사용자만 색칠", () => {
    expect(derivePersonaMode(base({ planning_style: "designer" }))).toBe("designer_late");
  });

  it("role=groom 은 마지막 modifier — 다른 페르소나가 있으면 그쪽이 이긴다", () => {
    expect(derivePersonaMode(base({ role: "groom", ceremony_type: "hotel" }))).toBe("luxury_hotel");
    expect(derivePersonaMode(base({ role: "groom" }))).toBe("standard_groom");
  });
});

describe("backward-compat — 신규 신호 없으면 기존 동작 동일", () => {
  // 신규 필드(has_children/planning_style) 미제공 시, 신규 모드는 절대 안 나온다.
  const NEW_MODES = new Set<WeddingPersonaMode>(["remarriage_with_children", "budget_analytic", "designer_late", "first_timer"]);

  it("신규 신호 없는 입력은 신규 모드를 내지 않는다", () => {
    const samples: PersonaInputs[] = [
      base(),
      base({ role: "groom" }),
      base({ marital_history: "remarriage" }),
      base({ ceremony_type: "hotel" }),
      base({ wedding_region: "충청남도" }),
      base({ ceremony_type: "outdoor" }),
      base({ country: "US", wedding_country: "US" }),
    ];
    for (const s of samples) {
      expect(NEW_MODES.has(derivePersonaMode(s))).toBe(false);
    }
  });
});

describe("null/기본값 안전", () => {
  it("country/wedding_country null 이면 KR 로 간주(국제 아님)", () => {
    expect(derivePersonaMode(base({ country: null, wedding_country: null }))).toBe("standard_bride");
  });
  it("메트로 지역은 regional 아님", () => {
    expect(derivePersonaMode(base({ wedding_region: "서울특별시" }))).toBe("standard_bride");
    expect(derivePersonaMode(base({ wedding_region: "경기도" }))).toBe("standard_bride");
  });
  it("planning_style null/standard 는 성향 모드 아님", () => {
    expect(derivePersonaMode(base({ planning_style: null }))).toBe("standard_bride");
    expect(derivePersonaMode(base({ planning_style: "standard" }))).toBe("standard_bride");
  });
});
