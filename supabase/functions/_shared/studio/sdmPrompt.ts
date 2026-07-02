// 스드메 미리보기 — 합성 프롬프트 단일 소스.
//
// 개별 도구(드레스/메이크업/헤어)와 달리, 장소+메이크업+헤어+드레스를 한 번의
// gpt-image edits 호출로 합성한다(순차 재생성 X → 신원·비율 1회 고정).
//
// 다리 짧음 회귀 대응(사용자 실사용 피드백): "발을 무조건 프레임에 넣으려다" 하체가
// 압축돼 다리가 짧아졌다. → 발 강제 금지 + 드레스 길이별 적응 프레이밍 + 로우앵글 +
// 늘씬한 비율 명시. 얼굴은 그대로 잠그되(identity) 몸 비율은 플래터링하게 허용.

import { sceneByCode, neutralizeVenueForGroom, type SceneCode } from "./fittingScenes.ts";
import { shotFramingBlock, type ShotType } from "./shotTypes.ts";
import { retouchBlock, type RetouchLevel } from "./retouch.ts";

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

/** 신랑 SDM 헤어 옵션(남성). 신부 목록과 대칭 — value=모델 지시 영어, ko=표시. */
export const SDM_GROOM_HAIR_STYLES: { value: string; ko: string }[] = [
  { value: "clean side part", ko: "클린 사이드파트" },
  { value: "natural down perm", ko: "내추럴 다운펌" },
  { value: "slicked-back undercut", ko: "슬릭백" },
  { value: "comma-shaped fringe", ko: "쉼표머리" },
  { value: "two-block cut", ko: "투블럭" },
  { value: "pompadour", ko: "포마드" },
  { value: "middle-part fringe", ko: "가르마" },
  { value: "textured short crop", ko: "짧은 크롭" },
];

/** 성별별 SDM 헤어 목록. */
export const sdmHairStyles = (gender: "bride" | "groom"): { value: string; ko: string }[] =>
  gender === "groom" ? SDM_GROOM_HAIR_STYLES : SDM_HAIR_STYLES;

export const sdmHairKo = (value: string): string =>
  [...SDM_HAIR_STYLES, ...SDM_GROOM_HAIR_STYLES].find((s) => s.value === value)?.ko ?? value;

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
  /** 촬영 컷 — 전신/상반신/클로즈업. 상반신·클로즈업은 다리를 렌더하지 않는다. */
  shotType: ShotType;
  referenceMode: SdmReferenceMode;
  /** 신부(기본) vs 신랑. 신랑은 드레스→예복, 메이크업→그루밍. */
  gender?: "bride" | "groom";
  /** 보정 강도 — 미지정은 natural(기존 동작). */
  retouch?: RetouchLevel;
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
    dressCustom, dressLength, shotType, referenceMode,
  } = args;
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);

  const dressByImage = !dressCustom && referenceMode === "image";
  const longGown = isLongGown(dressLength);
  const retouch = retouchBlock(args.retouch ?? "natural", args.gender ?? "bride");

  // 신랑(예복+그루밍+남성헤어) — 별도 조립. 신부 프롬프트는 아래 그대로 보존(회귀 0).
  if (args.gender === "groom") {
    const gRefs = ["- Image 1: the groom (user's photo). His identity is the single source of truth."];
    if (dressByImage) gRefs.push("- Image 2: the wedding suit on a headless mannequin. Use ONLY the suit, NOT any body or face.");
    const suit = dressDescription.trim() || "a classic well-fitted Korean wedding suit, notch lapel, navy or black";
    const gVenue = neutralizeVenueForGroom(scene.promptBlock);
    return `You are generating a single photorealistic Korean groom portrait that combines
the chosen background, grooming, hairstyle and suit into ONE final look.

REFERENCES
${gRefs.join("\n")}

TOP PRIORITY — IDENTITY MATCH (most important rule)
The face must be UNMISTAKABLY the same person as Image 1 — instantly recognizable.
Reproduce his exact eyes (shape, size, slant, eyelid type, spacing), eyebrows, nose
(bridge, tip, nostrils), lips (shape, fullness, philtrum), jawline, chin, cheekbones,
hairline, face length-to-width ratio, skin tone/undertone, and any moles or freckles.
Do NOT beautify, slim, enlarge eyes, change age, or average toward a generic AI
groom model. This overrides every instruction below.
Image 1 shows WHO he is — do NOT carry the photo's ambient lighting or casual
clothing into the output (grooming, hair and suit are specified below).

${shotFramingBlock(shotType, false, "groom")}
Keep his recognizable build and identity; render a clean, well-tailored line
within the framing above. Never doll-like / chibi proportions.

GROOMING — clean, wedding-ready (NOT makeup)
Neat groomed skin and brows; keep any facial hair neatly trimmed (do not add or
remove it). Enhance only; keep his exact features, bone structure, skin tone and age.

HAIR — restyle ONLY the hair
Style his hair as: ${hairStyle.trim() || "a neat men's wedding hairstyle"}. Keep his face and identity unchanged.

${dressByImage ? "SUIT — use the exact suit from Image 2" : "SUIT — render exactly as described below"}
${suit}
Reproduce the fit, lapel, buttons, shirt, tie or bow tie, pocket square, and fabric
texture/sheen precisely. ${dressByImage ? "If Image 2 disagrees with the text, the suit in Image 2 wins." : "Do not invent a different silhouette or fabric."}

${retouch ? retouch + "\n\n" : ""}BACKGROUND / SCENE
${gVenue}

OUTPUT
One single composited image. No text, no watermark, no collage, no grid. No bouquet,
veil, or bridal elements.`;
  }

  // 첨부 이미지 역할 — Image 1 은 항상 신부. 드레스는 카탈로그+image 모드일 때만 이미지.
  const refs: string[] = ["- Image 1: the bride (user's photo). Her identity is the single source of truth."];
  if (dressByImage) refs.push("- Image 2: the wedding dress on a headless mannequin. Use ONLY the dress, NOT any body or face.");

  // 컷별 프레이밍 — 상반신/클로즈업은 다리 미렌더, 전신은 늘씬·로우앵글(다리 짧음 회귀 방지).
  const framing = shotFramingBlock(shotType, longGown);

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
Reproduce her exact eyes (shape, size, slant, eyelid type, spacing), eyebrows, nose
(bridge, tip, nostrils), lips (shape, fullness, philtrum), jawline, chin, cheekbones,
hairline, face length-to-width ratio, skin tone/undertone, and any moles or freckles.
Do NOT beautify, slim, enlarge eyes, change age, or average toward a generic AI
bridal model. This overrides every instruction below.
Image 1 shows WHO she is — do NOT carry the photo's ambient lighting or casual
clothing into the output (makeup, hair and dress are specified below).

${framing}
Keep her recognizable build and identity; render a flattering, elegant bridal line
within the framing above. Never doll-like / chibi proportions.

MAKEUP — apply to her face without changing identity
${makeup}
Enhance only; keep her exact features, eye/lip shape, bone structure, skin tone and age.

HAIR — restyle ONLY the hair
Style her hair as: ${hairStyle}. Keep her face and identity unchanged.

${dressHeader}
${dressDescription || "an elegant Korean bridal wedding gown"}
Reproduce the silhouette, neckline, sleeves, length, fabric texture/sheen, and all
decorative work precisely. ${dressByImage ? "If Image 2 disagrees with the text, the dress in Image 2 wins." : "Do not invent a different silhouette or fabric."}

${retouch ? retouch + "\n\n" : ""}BACKGROUND / SCENE
${scene.promptBlock}

OUTPUT
One single composited image. No text, no watermark, no collage, no grid.`;
}
