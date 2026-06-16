import { describe, it, expect } from "vitest";
import {
  extractColorTone,
  extractRankedNames,
  extractStyleTagsFromMemory,
  deriveBudgetBand,
  buildPersonalizationContext,
  buildDressPromptAddendum,
  buildMakeupPromptAddendum,
  type ConsultingAnalysis,
  type MemoryFactLite,
} from "./weddingContext";

describe("extractColorTone", () => {
  it("maps warm tokens (undertone or season)", () => {
    expect(extractColorTone("웜", null)).toBe("warm");
    expect(extractColorTone(null, "가을 뮤트")).toBe("warm");
    expect(extractColorTone("warm", null)).toBe("warm");
  });
  it("maps cool tokens", () => {
    expect(extractColorTone("쿨", null)).toBe("cool");
    expect(extractColorTone(null, "여름 라이트")).toBe("cool");
  });
  it("prefers neutral when present", () => {
    expect(extractColorTone("뉴트럴 웜", null)).toBe("neutral");
  });
  it("returns null on empty/ambiguous input", () => {
    expect(extractColorTone(null, null)).toBeNull();
    expect(extractColorTone("", "")).toBeNull();
    expect(extractColorTone("미정", "분석불가")).toBeNull();
  });
});

describe("extractRankedNames", () => {
  it("reads name from objects and dedups, respects limit", () => {
    const input = [{ name: "A라인" }, { name: "머메이드" }, { name: "A라인" }, { name: "벨라인" }];
    expect(extractRankedNames(input, 2)).toEqual(["A라인", "머메이드"]);
  });
  it("accepts plain string entries", () => {
    expect(extractRankedNames(["스퀘어", "보트"])).toEqual(["스퀘어", "보트"]);
  });
  it("returns [] for non-arrays / empty", () => {
    expect(extractRankedNames(null)).toEqual([]);
    expect(extractRankedNames(undefined)).toEqual([]);
    expect(extractRankedNames("nope")).toEqual([]);
    expect(extractRankedNames([{}, { name: "" }])).toEqual([]);
  });
});

describe("extractStyleTagsFromMemory", () => {
  it("picks known style keywords only from preference facts", () => {
    const facts: MemoryFactLite[] = [
      { fact_type: "preference", fact_text: "신부는 미니멀하고 모던한 스타일 선호" },
      { fact_type: "budget", fact_text: "예산 미니멀하게" }, // 비-preference → 무시
    ];
    expect(extractStyleTagsFromMemory(facts)).toEqual(["미니멀", "모던"]);
  });
  it("returns [] when no known keyword", () => {
    expect(
      extractStyleTagsFromMemory([{ fact_type: "preference", fact_text: "딱히 없음" }]),
    ).toEqual([]);
  });
});

describe("deriveBudgetBand", () => {
  it("bands by total budget (만원)", () => {
    expect(deriveBudgetBand(0, 200)).toBeNull();
    expect(deriveBudgetBand(1500, 100)).toBe("lean");
    expect(deriveBudgetBand(3000, 200)).toBe("mid");
    expect(deriveBudgetBand(5000, 200)).toBe("mid");
    expect(deriveBudgetBand(8000, 300)).toBe("premium");
  });
});

const FULL_ANALYSIS: ConsultingAnalysis = {
  season_ko: "가을 뮤트",
  season_en: "Autumn Muted",
  keywords: ["고급스러운", "따뜻한"],
  axes: { undertone: "웜", temperature: "warm" },
  dress_white: { name: "아이보리" },
  metal: "골드",
  necklines: [{ name: "스퀘어" }, { name: "보트" }],
  silhouettes: [{ name: "A라인" }, { name: "머메이드" }],
  makeup: { lip: { name: "브릭" }, cheek: { name: "코랄" }, eye: { name: "브라운" } },
};

describe("buildPersonalizationContext", () => {
  it("synthesizes a full context from consulting + memory", () => {
    const ctx = buildPersonalizationContext({
      personaMode: "standard_bride",
      weddingStyle: "general",
      totalBudget: 4000,
      guestCount: 200,
      consultingAnalysis: FULL_ANALYSIS,
      memoryFacts: [{ fact_type: "preference", fact_text: "클래식 무드 좋아함" }],
    });
    expect(ctx.colorTone).toBe("warm");
    expect(ctx.seasonLabel).toBe("가을 뮤트");
    expect(ctx.recommendedSilhouettes).toEqual(["A라인", "머메이드"]);
    expect(ctx.dressWhiteName).toBe("아이보리");
    expect(ctx.metal).toBe("골드");
    expect(ctx.makeupLip).toBe("브릭");
    expect(ctx.styleTags).toContain("고급스러운");
    expect(ctx.styleTags).toContain("클래식"); // 메모리 보강
    expect(ctx.budgetBand).toBe("mid");
    expect(ctx.hasConsulting).toBe(true);
    expect(ctx.hasData).toBe(true);
    expect(ctx.summaryChips[0]).toBe("퍼스널컬러: 가을 뮤트");
  });

  it("degrades gracefully with no consulting / no memory", () => {
    const ctx = buildPersonalizationContext({
      personaMode: null,
      weddingStyle: "general",
      totalBudget: 0,
      guestCount: 200,
    });
    expect(ctx.colorTone).toBeNull();
    expect(ctx.recommendedSilhouettes).toEqual([]);
    expect(ctx.hasConsulting).toBe(false);
    expect(ctx.hasData).toBe(false);
    expect(ctx.summaryChips).toEqual([]);
  });

  it("falls back to tone-only chip when season label missing", () => {
    const ctx = buildPersonalizationContext({
      personaMode: null,
      weddingStyle: "general",
      totalBudget: 0,
      guestCount: 0,
      consultingAnalysis: { axes: { undertone: "쿨" } },
    });
    expect(ctx.seasonLabel).toBeNull();
    expect(ctx.colorTone).toBe("cool");
    expect(ctx.summaryChips[0]).toBe("퍼스널컬러: 쿨톤");
  });
});

describe("prompt addenda", () => {
  it("dress addendum includes silhouettes/white/metal, marked secondary", () => {
    const ctx = buildPersonalizationContext({
      personaMode: null,
      weddingStyle: "general",
      totalBudget: 0,
      guestCount: 0,
      consultingAnalysis: FULL_ANALYSIS,
    });
    const out = buildDressPromptAddendum(ctx);
    expect(out).toContain("secondary");
    expect(out).toContain("A라인");
    expect(out).toContain("아이보리");
    expect(out).toContain("골드");
  });

  it("makeup addendum includes lip/cheek/eye, marked secondary", () => {
    const ctx = buildPersonalizationContext({
      personaMode: null,
      weddingStyle: "general",
      totalBudget: 0,
      guestCount: 0,
      consultingAnalysis: FULL_ANALYSIS,
    });
    const out = buildMakeupPromptAddendum(ctx);
    expect(out).toContain("secondary");
    expect(out).toContain("브릭");
    expect(out).toContain("코랄");
  });

  it("returns empty string when there is no signal (no-op on prompt)", () => {
    const empty = buildPersonalizationContext({
      personaMode: null,
      weddingStyle: "general",
      totalBudget: 0,
      guestCount: 0,
    });
    expect(buildDressPromptAddendum(empty)).toBe("");
    expect(buildMakeupPromptAddendum(empty)).toBe("");
  });
});
