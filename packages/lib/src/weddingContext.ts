// 통합 개인화 컨텍스트 — "고립된 섬"으로 흩어진 사용자 신호를 한 곳으로 모으는 단일 소스.
//
// 배경(유기성 배선 Wave 0): 지금까지 퍼스널컬러 컨설팅 결과(wedding_consulting_reports.
// analysis)·AI 메모리 선호(user_ai_memory.preference)·페르소나는 각각 컨설팅 보드 렌더,
// 챗봇 프롬프트, 홈 헤더에만 쓰이고 **추천 생성(드레스·메이크업)에는 전혀 흐르지 않았다**.
// 이 모듈은 그 죽은 컨텍스트를 하나의 PersonalizationContext 로 합성해 추천 surface 가
// "사용자가 한 번 표현한 사실"을 재사용하게 한다.
//
// 순수 함수만 둔다(React·supabase 의존 없음) — 조합/추출 로직을 단위 테스트로 고정한다.
// I/O(쿼리)는 useWeddingContext 훅이 담당.

import type { WeddingStyle } from "./weddingStyle";
import type { WeddingPersonaMode } from "./weddingPersona";

/** wedding_consulting_reports.analysis 의 부분 형태(우리가 재사용하는 필드만). */
export interface ConsultingAnalysis {
  season_ko?: string | null;
  season_en?: string | null;
  keywords?: unknown;
  axes?: {
    undertone?: string | null;
    temperature?: string | null;
  } | null;
  // dress_white / necklines / silhouettes / metal / makeup 는 객체 또는 문자열 배열일 수
  // 있어 방어적으로 파싱한다(LLM 출력 — 스키마 강제 불가).
  dress_white?: { name?: string | null } | string | null;
  metal?: string | null;
  necklines?: unknown;
  silhouettes?: unknown;
  makeup?: {
    lip?: NamedSwatch;
    cheek?: NamedSwatch;
    eye?: NamedSwatch;
  } | null;
}

type NamedSwatch = { name?: string | null } | string | null | undefined;

/** user_ai_memory 행의 경량 형태. */
export interface MemoryFactLite {
  fact_type: string;
  fact_text: string;
}

export type ColorTone = "warm" | "cool" | "neutral" | null;
export type BudgetBand = "lean" | "mid" | "premium" | null;

export interface PersonalizationContext {
  personaMode: WeddingPersonaMode | null;
  weddingStyle: WeddingStyle;
  colorTone: ColorTone;
  /** "가을 웜" 같은 표시용 시즌 라벨. */
  seasonLabel: string | null;
  recommendedSilhouettes: string[];
  recommendedNecklines: string[];
  dressWhiteName: string | null;
  metal: string | null;
  makeupLip: string | null;
  makeupCheek: string | null;
  makeupEye: string | null;
  /** 분위기 키워드(컨설팅 keywords + 선호 메모리에서 추출). */
  styleTags: string[];
  budgetBand: BudgetBand;
  /** UI 노출용 짧은 칩(한국어). */
  summaryChips: string[];
  /** 컨설팅 분석이 합성됐는지(퍼스널컬러 기반 칩 노출 가드). */
  hasConsulting: boolean;
  /** 추천에 주입할 신호가 하나라도 있는지. */
  hasData: boolean;
}

// 알려진 스타일 키워드 — 선호 메모리 fact_text 에서 스캔. label(표시)이 아니라 매칭 값.
const STYLE_KEYWORDS = [
  "미니멀", "클래식", "모던", "빈티지", "로맨틱", "내추럴",
  "럭셔리", "심플", "화려", "우아", "러블리", "시크",
] as const;

const WARM_TOKENS = ["웜", "warm", "봄", "가을", "spring", "autumn", "fall"];
const COOL_TOKENS = ["쿨", "cool", "여름", "겨울", "summer", "winter"];
const NEUTRAL_TOKENS = ["뉴트럴", "중성", "neutral"];

/** undertone/시즌 문자열 → 톤 분류. 입력 없거나 모호하면 null. */
export function extractColorTone(
  undertone?: string | null,
  seasonKo?: string | null,
): ColorTone {
  const hay = `${undertone ?? ""} ${seasonKo ?? ""}`.toLowerCase();
  if (!hay.trim()) return null;
  // 뉴트럴을 웜/쿨보다 먼저(중성 토큰이 더 구체적).
  if (NEUTRAL_TOKENS.some((t) => hay.includes(t))) return "neutral";
  if (WARM_TOKENS.some((t) => hay.includes(t))) return "warm";
  if (COOL_TOKENS.some((t) => hay.includes(t))) return "cool";
  return null;
}

/** {name} 객체 또는 문자열 → 이름 문자열. 빈 값이면 null. */
function swatchName(v: NamedSwatch): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object" && typeof v.name === "string") return v.name.trim() || null;
  return null;
}

/** ranked 배열(객체 {name} 또는 문자열 혼재) → 상위 N개 이름. */
export function extractRankedNames(value: unknown, limit = 3): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const name = swatchName(entry as NamedSwatch);
    if (name && !out.includes(name)) out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/** keywords(문자열 배열 가정) → 정제된 문자열 배열. */
function extractKeywords(value: unknown, limit = 4): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const k of value) {
    if (typeof k === "string" && k.trim()) {
      const t = k.trim();
      if (!out.includes(t)) out.push(t);
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** 선호 메모리 fact_text 들에서 알려진 스타일 키워드 추출(중복 제거). */
export function extractStyleTagsFromMemory(facts: MemoryFactLite[]): string[] {
  const out: string[] = [];
  for (const f of facts) {
    if (f.fact_type !== "preference" || typeof f.fact_text !== "string") continue;
    for (const kw of STYLE_KEYWORDS) {
      if (f.fact_text.includes(kw) && !out.includes(kw)) out.push(kw);
    }
  }
  return out;
}

/** 총예산(만원)·하객수 → 예산대. 입력 없으면 null. */
export function deriveBudgetBand(totalBudget: number, _guestCount: number): BudgetBand {
  if (!totalBudget || totalBudget <= 0) return null;
  if (totalBudget < 2000) return "lean"; // 2천만원 미만
  if (totalBudget <= 5000) return "mid"; // 2천~5천만원
  return "premium"; // 5천만원 초과
}

export interface PersonalizationInputs {
  personaMode: WeddingPersonaMode | null;
  weddingStyle: WeddingStyle;
  totalBudget: number;
  guestCount: number;
  consultingAnalysis?: ConsultingAnalysis | null;
  memoryFacts?: MemoryFactLite[];
}

/** 흩어진 신호 → 단일 PersonalizationContext 합성. 순수 함수. */
export function buildPersonalizationContext(
  inputs: PersonalizationInputs,
): PersonalizationContext {
  const a = inputs.consultingAnalysis ?? null;
  const facts = inputs.memoryFacts ?? [];

  const colorTone = a ? extractColorTone(a.axes?.undertone, a.season_ko) : null;
  const seasonLabel = a?.season_ko?.trim() || null;
  const recommendedSilhouettes = extractRankedNames(a?.silhouettes);
  const recommendedNecklines = extractRankedNames(a?.necklines);
  const dressWhiteName = swatchName(a?.dress_white);
  const metal = a?.metal?.trim() || null;
  const makeupLip = swatchName(a?.makeup?.lip);
  const makeupCheek = swatchName(a?.makeup?.cheek);
  const makeupEye = swatchName(a?.makeup?.eye);

  const consultingKeywords = extractKeywords(a?.keywords);
  const memoryTags = extractStyleTagsFromMemory(facts);
  // 컨설팅 키워드 우선, 선호 메모리 태그 보강(중복 제거).
  const styleTags = [...consultingKeywords];
  for (const t of memoryTags) if (!styleTags.includes(t)) styleTags.push(t);

  const budgetBand = deriveBudgetBand(inputs.totalBudget, inputs.guestCount);

  const hasConsulting = !!(colorTone || seasonLabel || recommendedSilhouettes.length);

  const summaryChips = buildSummaryChips({
    colorTone,
    seasonLabel,
    recommendedSilhouettes,
    styleTags,
  });

  return {
    personaMode: inputs.personaMode,
    weddingStyle: inputs.weddingStyle,
    colorTone,
    seasonLabel,
    recommendedSilhouettes,
    recommendedNecklines,
    dressWhiteName,
    metal,
    makeupLip,
    makeupCheek,
    makeupEye,
    styleTags,
    budgetBand,
    summaryChips,
    hasConsulting,
    hasData: summaryChips.length > 0,
  };
}

const TONE_LABEL: Record<Exclude<ColorTone, null>, string> = {
  warm: "웜톤",
  cool: "쿨톤",
  neutral: "뉴트럴톤",
};

function buildSummaryChips(p: {
  colorTone: ColorTone;
  seasonLabel: string | null;
  recommendedSilhouettes: string[];
  styleTags: string[];
}): string[] {
  const chips: string[] = [];
  if (p.seasonLabel) {
    chips.push(`퍼스널컬러: ${p.seasonLabel}`);
  } else if (p.colorTone) {
    chips.push(`퍼스널컬러: ${TONE_LABEL[p.colorTone]}`);
  }
  if (p.recommendedSilhouettes.length) {
    chips.push(`추천 실루엣: ${p.recommendedSilhouettes[0]}`);
  }
  if (p.styleTags.length) {
    chips.push(`선호: ${p.styleTags.slice(0, 2).join("·")}`);
  }
  return chips;
}

/**
 * 드레스 추천 프롬프트에 덧붙일 스타일 선호 절(영문).
 * 신부 정체성(identity) 규칙을 절대 덮어쓰지 않도록 "secondary" 로 명시.
 * 주입할 신호가 없으면 "" 반환(프롬프트 무변경).
 */
export function buildDressPromptAddendum(ctx: PersonalizationContext): string {
  const lines: string[] = [];
  if (ctx.seasonLabel || ctx.colorTone) {
    const tone = ctx.colorTone ? TONE_LABEL[ctx.colorTone] : "";
    lines.push(`- Personal color season: ${ctx.seasonLabel ?? ""} ${tone}`.trim());
  }
  if (ctx.dressWhiteName) lines.push(`- Favor dress white tone: ${ctx.dressWhiteName}`);
  if (ctx.recommendedSilhouettes.length) {
    lines.push(`- Favor silhouettes: ${ctx.recommendedSilhouettes.join(", ")}`);
  }
  if (ctx.recommendedNecklines.length) {
    lines.push(`- Favor necklines: ${ctx.recommendedNecklines.join(", ")}`);
  }
  if (ctx.metal) lines.push(`- Jewelry metal: ${ctx.metal}`);
  if (ctx.styleTags.length) lines.push(`- Overall mood: ${ctx.styleTags.join(", ")}`);
  if (!lines.length) return "";
  return (
    "\n\nSTYLE PREFERENCE (secondary — never override the identity rules above; " +
    "apply only to wardrobe & styling choices):\n" +
    lines.join("\n")
  );
}

/**
 * 메이크업 추천 프롬프트에 덧붙일 색상 선호 절(영문).
 * 신부 정체성 규칙을 덮어쓰지 않게 "secondary" 명시. 신호 없으면 "".
 */
export function buildMakeupPromptAddendum(ctx: PersonalizationContext): string {
  const lines: string[] = [];
  if (ctx.seasonLabel || ctx.colorTone) {
    const tone = ctx.colorTone ? TONE_LABEL[ctx.colorTone] : "";
    lines.push(`- Personal color season: ${ctx.seasonLabel ?? ""} ${tone}`.trim());
  }
  if (ctx.makeupLip) lines.push(`- Lip tone: ${ctx.makeupLip}`);
  if (ctx.makeupCheek) lines.push(`- Cheek tone: ${ctx.makeupCheek}`);
  if (ctx.makeupEye) lines.push(`- Eye tone: ${ctx.makeupEye}`);
  if (ctx.styleTags.length) lines.push(`- Overall mood: ${ctx.styleTags.join(", ")}`);
  if (!lines.length) return "";
  return (
    "\n\nSTYLE PREFERENCE (secondary — never override the identity rules above; " +
    "apply only to makeup color choices):\n" +
    lines.join("\n")
  );
}

/**
 * 서버측 프롬프트 조립(dewy-dress-recommend/dewy-makeup-recommend)의 style_preference
 * 슬롯 페이로드. 애드덤 문자열 대신 구조화 신호만 보내고, 렌더·살균은 서버 단일 소스
 * (supabase/functions/_shared/studio/stylePreference.ts)가 담당한다. 신호 없으면 null.
 */
export function toStylePreferencePayload(
  ctx: PersonalizationContext,
): Record<string, unknown> | null {
  if (!ctx.hasData) return null;
  return {
    season: ctx.seasonLabel ?? undefined,
    tone: ctx.colorTone ?? undefined,
    dress_white: ctx.dressWhiteName ?? undefined,
    silhouettes: ctx.recommendedSilhouettes.length ? ctx.recommendedSilhouettes : undefined,
    necklines: ctx.recommendedNecklines.length ? ctx.recommendedNecklines : undefined,
    metal: ctx.metal ?? undefined,
    style_tags: ctx.styleTags.length ? ctx.styleTags : undefined,
    lip: ctx.makeupLip ?? undefined,
    cheek: ctx.makeupCheek ?? undefined,
    eye: ctx.makeupEye ?? undefined,
  };
}
