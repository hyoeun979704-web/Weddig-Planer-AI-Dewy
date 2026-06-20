// 웨딩촬영 시안 — 컷 계획 + 컷별 프롬프트 단일 소스.
//
// 한 컨셉 = 8컷(신부 단독 전신/상반신, 신랑 단독 전신/상반신, 커플 인물위주 전신/상반신,
// 커플 배경위주 전신/상반신). 컷마다 독립 gpt-image 호출(잡 큐가 1개씩 처리).
// 프레이밍은 shotTypes.shotFramingBlock 재사용. 레퍼런스는 vision으로 텍스트화해 주입.

import { shotFramingBlock, type ShotType } from "@/data/shotTypes";

export type CutSubject = "bride" | "groom" | "couple_person" | "couple_scene";

export interface PhotoshootCut {
  index: number;          // 1~8
  subject: CutSubject;
  framing: ShotType;      // full | bust
  pdf: 1 | 2;             // 1=단독, 2=커플
  ko: string;
}

// 출력 8컷 — PDF 1=단독(#1~4), 2=커플(#5~8).
export const CUT_PLAN: PhotoshootCut[] = [
  { index: 1, subject: "bride", framing: "full", pdf: 1, ko: "신부 단독 · 전신" },
  { index: 2, subject: "bride", framing: "bust", pdf: 1, ko: "신부 단독 · 상반신" },
  { index: 3, subject: "groom", framing: "full", pdf: 1, ko: "신랑 단독 · 전신" },
  { index: 4, subject: "groom", framing: "bust", pdf: 1, ko: "신랑 단독 · 상반신" },
  { index: 5, subject: "couple_person", framing: "full", pdf: 2, ko: "인물 위주 · 전신" },
  { index: 6, subject: "couple_person", framing: "bust", pdf: 2, ko: "인물 위주 · 상반신" },
  { index: 7, subject: "couple_scene", framing: "full", pdf: 2, ko: "배경 위주 · 전신" },
  { index: 8, subject: "couple_scene", framing: "bust", pdf: 2, ko: "배경 위주 · 상반신" },
];

/** P1(단독 4컷)만 — 커플 컷은 P2에서 활성. */
export const SOLO_CUTS = CUT_PLAN.filter((c) => c.subject === "bride" || c.subject === "groom");

const BRIDE_IDENTITY = `The bride must be UNMISTAKABLY the same person as her reference photo —
exact eyes (shape, slant, eyelid type, spacing), brows, nose, lips, jawline, chin,
cheekbones, hairline, skin tone/undertone, and any moles/freckles. Keep her wedding
hair and makeup as shown in her photo. Do NOT beautify or average toward a generic model.`;

// 신랑: 기본 그루밍(내추럴) — 과한 메이크업 금지, 정체성 유지.
const GROOM_IDENTITY = `The groom must be UNMISTAKABLY the same person as his reference photo —
exact facial features, jaw, brows, nose, lips, skin tone, and hairline; keep his set
hairstyle as shown. Apply only subtle natural grooming (even skin, tidy brows, no shine);
NOT visible/heavy makeup. Do NOT change his identity.`;

interface BuildCutArgs {
  cut: PhotoshootCut;
  /** 신부 헤메·드레스 묘사(텍스트). */
  brideDescription?: string;
  /** 신랑 헤어·슈트 묘사(텍스트). */
  groomDescription?: string;
  /** 장소/배경 텍스트. */
  sceneText?: string;
  /** 소품 텍스트(없으면 ""). */
  propsText?: string;
  /** 레퍼런스 vision 분석 텍스트(없으면 ""). */
  refsText?: string;
  /** 전신 컷에서 발 강제 안 함(드레스 롱). */
  longGown?: boolean;
}

/**
 * 컷 1개의 gpt-image edits 프롬프트. 첨부 이미지 역할은 호출부(엣지)가 image[] 순서로
 * 맞춘다: 단독 컷은 해당 인물 사진, 커플 컷은 Image1=신부 / Image2=신랑.
 */
export function buildPhotoshootCutPrompt(args: BuildCutArgs): string {
  const { cut, brideDescription = "", groomDescription = "", sceneText = "", propsText = "", refsText = "", longGown = true } = args;
  const framing = shotFramingBlock(cut.framing, longGown);
  const extras = [
    sceneText && `BACKGROUND / SCENE\n${sceneText}`,
    propsText && `PROPS\n${propsText}`,
    refsText && `REFERENCE STYLE (match pose/composition/mood; do NOT copy any face)\n${refsText}`,
  ].filter(Boolean).join("\n\n");

  let subjectBlock: string;
  let refs: string;
  if (cut.subject === "bride") {
    refs = "- Image 1: the bride (her wedding hair/makeup + dress photo).";
    subjectBlock = `SUBJECT — the bride alone.\n${BRIDE_IDENTITY}\nWEDDING LOOK\n${brideDescription || "her wedding dress, hair and makeup as in the photo"}`;
  } else if (cut.subject === "groom") {
    refs = "- Image 1: the groom (his set hair + suit photo).";
    subjectBlock = `SUBJECT — the groom alone.\n${GROOM_IDENTITY}\nWEDDING LOOK\n${groomDescription || "his suit and set hair as in the photo"}`;
  } else {
    const emphasis = cut.subject === "couple_scene"
      ? "Emphasize the location/scenery; the couple is present but smaller in frame."
      : "The couple is the focus, standing/posing together naturally.";
    refs = "- Image 1: the bride (identity). \n- Image 2: the groom (identity).";
    subjectBlock = `SUBJECT — the couple together (best effort on both identities).\n${BRIDE_IDENTITY}\n${GROOM_IDENTITY}\nKeep BOTH people recognizable; render the bride from Image 1 and the groom from Image 2 — do NOT blend or swap their faces. ${emphasis}\nWEDDING LOOK\nBride: ${brideDescription || "as in her photo"}. Groom: ${groomDescription || "as in his photo"}.`;
  }

  return `You are generating ONE photorealistic Korean wedding photoshoot reference image.

REFERENCES
${refs}

TOP PRIORITY — IDENTITY (overrides everything below)
${subjectBlock}

${framing}

${extras}

OUTPUT
A single elegant editorial wedding-photoshoot image. No text, watermark, collage or grid.`;
}
