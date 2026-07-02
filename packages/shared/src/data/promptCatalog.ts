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
import { hairStyleGrid, hairColorGrid } from "../../../../supabase/functions/_shared/subjectPrompt.ts";

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

// ── 헤어 — 스냅샷 사본 대신 엣지와 같은 단일 소스에서 직접 렌더(드리프트 0).
// (기존 스냅샷은 identityLock 구판 + "braided hairstyle" 오기 + 출처 파일 표기가
//  이관 전 경로라 어드민이 보는 것 ≠ 실제였다 — 품질검토 교정)
const HAIR_STYLE_GRID = hairStyleGrid("bride");
const HAIR_COLOR_GRID = hairColorGrid("bride");

function entry(e: PromptEntry): PromptEntry { return e; }

export const PROMPT_CATALOG: PromptEntry[] = [
  // ── 드레스 투어 (컷 필터 비교) ──
  entry({ id: "dress-full", feature: "방구석 드레스 투어", title: "드레스 · 전신 컷", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "full" }) }),
  entry({ id: "dress-bust", feature: "방구석 드레스 투어", title: "드레스 · 상반신 컷", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "bust" }) }),
  entry({ id: "dress-closeup", feature: "방구석 드레스 투어", title: "드레스 · 클로즈업", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "closeup" }) }),
  entry({ id: "dress-custom", feature: "방구석 드레스 투어", title: "드레스 · 맞춤(텍스트) 전신", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt(custom)",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { custom: true, shotType: "full" }) }),
  entry({ id: "dress-recommend", feature: "방구석 드레스 투어", title: "드레스 · AI 추천(체형)", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildRecommendDressPrompt",
    prompt: buildRecommendDressPrompt("STUDIO_BRIGHT", "웨이브", "상체가 가늘고 하체에 볼륨 — A라인·엠파이어로 허리선을 강조") }),

  entry({ id: "dress-full-retouch-studio", feature: "방구석 드레스 투어", title: "드레스 · 전신(화보 보정 — UI 기본)", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts + retouch.ts",
    note: "retouch_level=studio — 실제 UI 기본값 렌더", prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "full", retouch: "studio" }) }),
  entry({ id: "dress-full-retouch-glam", feature: "방구석 드레스 투어", title: "드레스 · 전신(풀 보정)", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts + retouch.ts",
    prompt: buildFittingPrompt("STUDIO_BRIGHT", DRESS, { shotType: "full", retouch: "glam" }) }),
  entry({ id: "suit-groom-full", feature: "방구석 드레스 투어", title: "예복(신랑) · 전신 맞춤", kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/fittingScenes.ts → buildFittingPrompt(gender=groom)",
    note: "신랑 변형 — 씬 중립화·그루밍 프레이밍 검증용", prompt: buildFittingPrompt("CEREMONY_BRIGHT", GROOM, { custom: true, shotType: "full", gender: "groom", retouch: "studio" }) }),

  // ── 메이크업 ──
  entry({ id: "makeup", feature: "착붙 메이크업", title: "메이크업 시연", kind: "image",
    exampleImage: `${PREV}/banner-makeup.webp`, sourceFile: "src/data/makeupScenes.ts → buildMakeupPrompt",
    prompt: buildMakeupPrompt("STUDIO_NATURAL", MAKEUP) }),
  entry({ id: "makeup-recommend", feature: "착붙 메이크업", title: "메이크업 · AI 추천", kind: "image",
    exampleImage: `${PREV}/banner-makeup.webp`, sourceFile: "src/data/makeupScenes.ts → buildRecommendMakeupPrompt",
    prompt: buildRecommendMakeupPrompt("STUDIO_NATURAL") }),

  // ── 스드메 미리보기(합본) ──
  entry({ id: "sdm", feature: "스드메 미리보기", title: "스드메 합본 · 전신", kind: "image",
    exampleImage: `${PREV}/banner-sdm.webp`, sourceFile: "src/data/sdmPrompt.ts → buildSdmPrompt",
    prompt: buildSdmPrompt({ sceneCode: "STUDIO_BRIGHT", makeupDescription: MAKEUP, hairStyle: "loose natural waves",
      dressDescription: DRESS, dressCustom: false, dressLength: "floor", shotType: "full", referenceMode: "image" }) }),

  // ── 웨딩촬영 시안 8컷 ──
  ...CUT_PLAN.map((cut) => entry({
    id: `photoshoot-${cut.index}`, feature: "웨딩촬영 시안", title: `촬영시안 #${cut.index} · ${cut.ko}`, kind: "image",
    exampleImage: `${PREV}/banner-dress.webp`, sourceFile: "src/data/photoshootPrompt.ts → buildPhotoshootCutPrompt",
    prompt: buildPhotoshootCutPrompt({ cut, brideDescription: DRESS, groomDescription: GROOM,
      sceneText: "soft bright indoor studio, neutral backdrop", propsText: "", refsText: "", longGown: true }),
  })),

  // ── 헤어(엣지 전용 스냅샷) ──
  entry({ id: "hair-style", feature: "헤어 변형", title: "헤어 · 스타일 9그리드", kind: "image",
    exampleImage: `${PREV}/banner-hair.webp`, sourceFile: "supabase/functions/_shared/subjectPrompt.ts → hairStyleGrid",
    note: "엣지와 동일 단일 소스에서 렌더 — 추천 시 어울림 순으로 동적 재생성됨", prompt: HAIR_STYLE_GRID }),
  entry({ id: "hair-color", feature: "헤어 변형", title: "헤어 · 컬러 9그리드", kind: "image",
    exampleImage: `${PREV}/banner-hair.webp`, sourceFile: "supabase/functions/_shared/subjectPrompt.ts → hairColorGrid",
    note: "엣지와 동일 단일 소스에서 렌더", prompt: HAIR_COLOR_GRID }),

  // ── LLM 텍스트 프롬프트(엣지 — 길어서 출처 참조) ──
  entry({ id: "ai-planner", feature: "LLM 텍스트", title: "AI 플래너 시스템+근거주입", kind: "text-ref",
    exampleImage: `${PREV}/banner-consulting.webp`, sourceFile: "supabase/functions/ai-planner/index.ts + grounding.ts",
    note: "시스템 프롬프트 + 가격/업체 근거주입(buildPriceGrounding·buildVendorGrounding). 엣지 정의 — 파일 참조." }),
  entry({ id: "wedding-consulting", feature: "LLM 텍스트", title: "웨딩 컨설팅 리포트", kind: "text-ref",
    exampleImage: `${PREV}/banner-consulting.webp`, sourceFile: "supabase/functions/wedding-consulting/index.ts",
    note: "퍼스널컬러·헤어·메이크업·드레스 A4 리포트 생성 프롬프트. 엣지 정의 — 파일 참조." }),
  entry({ id: "invitation-illustration", feature: "LLM 텍스트", title: "청첩장 일러스트 생성", kind: "text-ref",
    exampleImage: `${PREV}/banner-invitation.webp`, sourceFile: "supabase/functions/invitation-illustration/index.ts",
    note: "청첩장 일러스트 이미지 생성 프롬프트. 엣지 정의 — 파일 참조." }),
  entry({ id: "invitation-text", feature: "LLM 텍스트", title: "청첩장 문구 제안", kind: "text-ref",
    exampleImage: `${PREV}/banner-invitation.webp`, sourceFile: "supabase/functions/invitation-text-suggest/index.ts",
    note: "청첩장 인사말/문구 제안 프롬프트. 엣지 정의 — 파일 참조." }),
];

export const PROMPT_FEATURES = Array.from(new Set(PROMPT_CATALOG.map((p) => p.feature)));
