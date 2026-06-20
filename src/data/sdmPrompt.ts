// 스드메 미리보기 — 합성 프롬프트 단일 소스.
//
// 개별 도구(드레스/메이크업/헤어)와 달리, 장소+메이크업+헤어+드레스를 한 번의
// gpt-image edits 호출로 합성한다(순차 재생성 X → 신원·비율 1회 고정).
//
// 다리 짧음 회귀 대응(사용자 실사용 피드백): "발을 무조건 프레임에 넣으려다" 하체가
// 압축돼 다리가 짧아졌다. → 발 강제 금지 + 드레스 길이별 적응 프레이밍 + 로우앵글 +
// 늘씬한 비율 명시. 얼굴은 그대로 잠그되(identity) 몸 비율은 플래터링하게 허용.

import { sceneByCode, type SceneCode } from "@/data/fittingScenes";

/** 합성에서 참조를 어떻게 줄지 — 이미지 첨부 우선 vs 텍스트(SCHEMA) 우선. A/B 테스트용. */
export type SdmReferenceMode = "image" | "text";

/** 헤어 스타일 옵션 — dewy-hair-preview 의 고정 라벨과 동일(드리프트 방지: 영어 라벨 = 모델 지시값). */
export const SDM_HAIR_STYLES: { value: string; ko: string }[] = [
  { value: "loose natural waves", ko: "내추럴 웨이브" },
  { value: "soft beach curls", ko: "소프트 컬" },
  { value: "sleek straight hair", ko: "스트레이트" },
  { value: "elegant low chignon updo", ko: "낮은 시뇽 업스타일" },
  { value: "romantic half-up half-down", ko: "반묶음" },
  { value: "classic high bun", ko: "높은 번" },
  { value: "low ponytail", ko: "로우 포니테일" },
  { value: "braided updo", ko: "땋은 업스타일" },
];

export const sdmHairKo = (value: string): string =>
  SDM_HAIR_STYLES.find((s) => s.value === value)?.ko ?? value;

interface BuildSdmPromptArgs {
  sceneCode: SceneCode;
  /** describeMakeup() 결과(맞춤) 또는 샘플 기반 텍스트. 빈 문자열이면 "내추럴 신부 메이크업". */
  makeupDescription: string;
  /** SDM_HAIR_STYLES 의 영어 value. */
  hairStyle: string;
  /** describeDress() 결과. catalog 모드면 함께 드레스 이미지가 첨부된다. */
  dressDescription: string;
  /** 카탈로그(레퍼런스 드레스 이미지 있음) vs 맞춤(텍스트만). */
  dressCustom: boolean;
  /** floor/long 이면 발을 강제하지 않는 적응 프레이밍을 쓴다. */
  dressLength?: string | null;
  referenceMode: SdmReferenceMode;
}

// 드레스 길이 → 발 노출 정책. 롱/플로어는 자락이 바닥까지 → 발이 가려져도 정상.
function isLongGown(length?: string | null): boolean {
  if (!length) return true; // 미상이면 웨딩드레스 기본 = 플로어렝스로 가정(안전).
  const v = length.toLowerCase();
  return /(floor|full|long|maxi|train|바닥|롱|풀)/.test(v);
}

export function buildSdmPrompt(args: BuildSdmPromptArgs): string {
  const {
    sceneCode, makeupDescription, hairStyle, dressDescription,
    dressCustom, dressLength, referenceMode,
  } = args;
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);

  const dressByImage = !dressCustom && referenceMode === "image";
  const longGown = isLongGown(dressLength);

  // 첨부 이미지 역할 — Image 1 은 항상 신부. 드레스는 카탈로그+image 모드일 때만 이미지.
  const refs: string[] = ["- Image 1: the bride (user's photo). Her identity is the single source of truth."];
  if (dressByImage) refs.push("- Image 2: the wedding dress on a headless mannequin. Use ONLY the dress, NOT any body or face.");

  // 프레이밍 — 발 강제 금지(다리 짧음 회귀 방지).
  const framing = longGown
    ? `Elegant three-quarter to full-length bridal portrait. The floor-length gown
falls naturally to the ground; it is completely fine if the feet are hidden under
the hem. DO NOT force both feet or the entire body into frame if doing so would
compress or shorten the legs/torso.`
    : `Full-length bridal portrait appropriate to the gown length; legs and feet may
be visible. Keep proportions natural and elegant.`;

  const makeup = makeupDescription.trim() || "soft natural Korean bridal makeup, wedding-ready but not heavy glam";
  const dressHeader = dressByImage
    ? "DRESS — use the exact dress from Image 2"
    : "DRESS — render exactly as described below";

  return `You are generating a single photorealistic Korean bridal portrait that combines
the chosen background, makeup, hairstyle and dress into ONE final look.

REFERENCES
${refs.join("\n")}

TOP PRIORITY — IDENTITY MATCH (most important rule)
The face must be UNMISTAKABLY the same person as Image 1 — instantly recognizable.
Reproduce her exact eyes (shape, slant, eyelid type, spacing), eyebrows, nose,
lips, jawline, chin, cheekbones, hairline, skin tone/undertone, and any moles or
freckles. Do NOT beautify the face, enlarge eyes, or average toward a generic AI
bridal model. This overrides every instruction below.

BODY & FRAMING — flattering, NOT a forced full body
- Keep her recognizable build, but render elegant, tastefully ELONGATED proportions:
  long legs, a high apparent waistline, and a natural head size (about 1/7.5 of body
  height). Do NOT render an oversized head or short/compressed legs.
- Photograph from a slightly LOW camera angle (around waist height) for an elegant,
  leggy line.
- ${framing}
- Vertical 3:4, photorealistic.

MAKEUP — apply to her face without changing identity
${makeup}
Enhance only; keep her exact features, eye/lip shape, bone structure, skin tone and age.

HAIR — restyle ONLY the hair
Style her hair as: ${hairStyle}. Keep her face and identity unchanged.

${dressHeader}
${dressDescription || "an elegant Korean bridal wedding gown"}
Reproduce the silhouette, neckline, sleeves, length, fabric texture/sheen, and all
decorative work precisely. ${dressByImage ? "If Image 2 disagrees with the text, the dress in Image 2 wins." : "Do not invent a different silhouette or fabric."}

BACKGROUND / SCENE
${scene.promptBlock}

OUTPUT
One single composited image. No text, no watermark, no collage, no grid.`;
}
