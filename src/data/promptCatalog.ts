// AI 생성 프롬프트 카탈로그 — 개인 검증(직접 모델에 붙여 테스트)용 단일 모음.
//
// 클라이언트 빌더(드레스·메이크업·스드메·촬영시안·추천)는 **실제 함수를 호출**해
// 렌더하므로 앱이 보내는 것과 동일(드리프트 없음). 헤어 그리드는 엣지 함수 전용 상수라
// 출처와 함께 스냅샷으로 싣고, LLM 텍스트 프롬프트(플래너·컨설팅·청첩장)는 길고 엣지에
// 묶여 있어 출처 파일 참조로 정리한다.

import { buildFittingPrompt, buildRecommendDressPrompt } from "@/data/fittingScenes";
import { buildMakeupPrompt, buildRecommendMakeupPrompt } from "@/data/makeupScenes";
import { buildSdmPrompt } from "@/data/sdmPrompt";
import { buildPhotoshootCutPrompt, CUT_PLAN } from "@/data/photoshootPrompt";

export type PromptKind = "image" | "image-snapshot" | "text-ref";

export interface PromptEntry {
  id: string;
  feature: string;       // 그룹 라벨
  title: string;         // 카드 제목
  kind: PromptKind;
  exampleImage?: string; // 배너 좌측 예시 이미지
  prompt?: string;       // 렌더된/스냅샷 텍스트(복사 대상)
  sourceFile: string;    // 출처(추적)
  note?: string;
}

// ── 대표 샘플 입력(실제 빌더에 넣어 렌더) ───────────────────────────────
const DRESS = "A-line silhouette, sweetheart neckline, cap sleeves, floor-length, soft satin with delicate beading, open back.";
const MAKEUP = "dewy glass-skin base, rose MLBB tinted lip, soft brown gradient eyeshadow, naturally filled straight brows, peach blush.";
const GROOM = "navy slim tuxedo, white shirt, black bow tie, neatly set side-part hair.";
const PREV = "/ai-studio-previews";

// ── 헤어(엣지 전용) 스냅샷 — 출처: supabase/functions/dewy-hair-preview/index.ts ──
const HAIR_IDENTITY =
  " The face must remain UNMISTAKABLY the same person as the provided photo — reproduce her exact features (eyes, eyelid type, brows, nose, lips, jawline, chin, cheekbones, hairline, face ratio, skin tone, moles/freckles). Do NOT beautify, slim, enlarge eyes, change age, or average toward a generic face. Soft studio lighting, clean minimal background, ultra-high realism. No text, no logos, no watermarks.";
const HAIR_STYLE_GRID =
  "Generate a 3x3 grid (9 cells) of ultra-realistic portrait photos of the SAME person with different hairstyles. Only change the hairstyle in each cell, keep perfect facial consistency across all nine. Hairstyles: loose natural waves, soft beach curls, sleek straight hair, high ponytail, low ponytail, messy bun, high bun, braided hairstyle, half-up half-down." + HAIR_IDENTITY;
const HAIR_COLOR_GRID =
  "Generate a 3x3 grid (9 cells) of ultra-realistic portrait photos of the SAME person with different hair colors. Only change the hair color in each cell, keep perfect facial consistency across all nine. Hair colors: natural black, dark brown, chocolate brown, light brown, soft caramel, warm honey blonde, ash brown, copper red, platinum blonde." + HAIR_IDENTITY;

function entry(e: PromptEntry): PromptEntry { return e; }

export const PROMPT_CATALOG: PromptEntry[] = [
  // ── 드레스 투어 (컷 필터 비교) ──
  entry({ id: "dress-full", feature: "방구석 드레스 투어", title: "드레스 · 전신 컷", kind: "image",
    exampleImage: `${PREV}/dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "full" }) }),
  entry({ id: "dress-bust", feature: "방구석 드레스 투어", title: "드레스 · 상반신 컷", kind: "image",
    exampleImage: `${PREV}/dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "bust" }) }),
  entry({ id: "dress-closeup", feature: "방구석 드레스 투어", title: "드레스 · 클로즈업", kind: "image",
    exampleImage: `${PREV}/dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "closeup" }) }),
  entry({ id: "dress-custom", feature: "방구석 드레스 투어", title: "드레스 · 맞춤(텍스트) 전신", kind: "image",
    exampleImage: `${PREV}/dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt(custom)",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { custom: true, shotType: "full" }) }),
  entry({ id: "dress-recommend", feature: "방구석 드레스 투어", title: "드레스 · AI 추천(체형)", kind: "image",
    exampleImage: `${PREV}/dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildRecommendDressPrompt",
    prompt: buildRecommendDressPrompt("STUDIO_BRIGHT", "웨이브", "상체가 가늘고 하체에 볼륨 — A라인·엠파이어로 허리선을 강조") }),

  // ── 메이크업 ──
  entry({ id: "makeup", feature: "착붙 메이크업", title: "메이크업 시연", kind: "image",
    exampleImage: `${PREV}/makeup.webp`, sourceFile: "src/data/makeupScenes.ts → buildMakeupPrompt",
    prompt: buildMakeupPrompt("STUDIO_NATURAL", MAKEUP) }),
  entry({ id: "makeup-recommend", feature: "착붙 메이크업", title: "메이크업 · AI 추천", kind: "image",
    exampleImage: `${PREV}/makeup.webp`, sourceFile: "src/data/makeupScenes.ts → buildRecommendMakeupPrompt",
    prompt: buildRecommendMakeupPrompt("STUDIO_NATURAL") }),

  // ── 스드메 미리보기(합본) ──
  entry({ id: "sdm", feature: "스드메 미리보기", title: "스드메 합본 · 전신", kind: "image",
    exampleImage: `${PREV}/dress.webp`, sourceFile: "src/data/sdmPrompt.ts → buildSdmPrompt",
    prompt: buildSdmPrompt({ sceneCode: "STUDIO_BRIGHT", makeupDescription: MAKEUP, hairStyle: "loose natural waves",
      dressDescription: DRESS, dressCustom: false, dressLength: "floor", shotType: "full", referenceMode: "image" }) }),

  // ── 웨딩촬영 시안 8컷 ──
  ...CUT_PLAN.map((cut) => entry({
    id: `photoshoot-${cut.index}`, feature: "웨딩촬영 시안", title: `촬영시안 #${cut.index} · ${cut.ko}`, kind: "image",
    exampleImage: `${PREV}/dress.webp`, sourceFile: "src/data/photoshootPrompt.ts → buildPhotoshootCutPrompt",
    prompt: buildPhotoshootCutPrompt({ cut, brideDescription: DRESS, groomDescription: GROOM,
      sceneText: "soft bright indoor studio, neutral backdrop", propsText: "", refsText: "", longGown: true }),
  })),

  // ── 헤어(엣지 전용 스냅샷) ──
  entry({ id: "hair-style", feature: "헤어 변형", title: "헤어 · 스타일 9그리드", kind: "image-snapshot",
    exampleImage: `${PREV}/hair.webp`, sourceFile: "supabase/functions/dewy-hair-preview/index.ts (STYLE_GRID)",
    note: "엣지 함수 상수 스냅샷 — 추천 시 어울림 순으로 동적 재생성됨", prompt: HAIR_STYLE_GRID }),
  entry({ id: "hair-color", feature: "헤어 변형", title: "헤어 · 컬러 9그리드", kind: "image-snapshot",
    exampleImage: `${PREV}/hair.webp`, sourceFile: "supabase/functions/dewy-hair-preview/index.ts (COLOR_GRID)",
    note: "엣지 함수 상수 스냅샷", prompt: HAIR_COLOR_GRID }),

  // ── LLM 텍스트 프롬프트(엣지 — 길어서 출처 참조) ──
  entry({ id: "ai-planner", feature: "LLM 텍스트", title: "AI 플래너 시스템+근거주입", kind: "text-ref",
    exampleImage: `${PREV}/consulting.webp`, sourceFile: "supabase/functions/ai-planner/index.ts + grounding.ts",
    note: "시스템 프롬프트 + 가격/업체 근거주입(buildPriceGrounding·buildVendorGrounding). 엣지 정의 — 파일 참조." }),
  entry({ id: "wedding-consulting", feature: "LLM 텍스트", title: "웨딩 컨설팅 리포트", kind: "text-ref",
    exampleImage: `${PREV}/consulting.webp`, sourceFile: "supabase/functions/wedding-consulting/index.ts",
    note: "퍼스널컬러·헤어·메이크업·드레스 A4 리포트 생성 프롬프트. 엣지 정의 — 파일 참조." }),
  entry({ id: "invitation-illustration", feature: "LLM 텍스트", title: "청첩장 일러스트 생성", kind: "text-ref",
    exampleImage: `${PREV}/paper-invitation.webp`, sourceFile: "supabase/functions/invitation-illustration/index.ts",
    note: "청첩장 일러스트 이미지 생성 프롬프트. 엣지 정의 — 파일 참조." }),
  entry({ id: "invitation-text", feature: "LLM 텍스트", title: "청첩장 문구 제안", kind: "text-ref",
    exampleImage: `${PREV}/paper-invitation.webp`, sourceFile: "supabase/functions/invitation-text-suggest/index.ts",
    note: "청첩장 인사말/문구 제안 프롬프트. 엣지 정의 — 파일 참조." }),
];

export const PROMPT_FEATURES = Array.from(new Set(PROMPT_CATALOG.map((p) => p.feature)));
