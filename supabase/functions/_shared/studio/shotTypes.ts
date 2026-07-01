// 촬영 컷(shot type) 단일 소스 — 실제 웨딩촬영 구성(전신/상반신/클로즈업)을 그대로 필터로.
//
// 핵심: 출력 컷을 입력/선택에 맞추면 "없는 하체를 지어내 다리가 짧아지는" 실패 모드가
// 사라진다. 상반신·클로즈업은 다리를 아예 렌더하지 않으므로 셀카로도 퀄이 안정적이고,
// 전신은 발 강제 대신 늘씬·로우앵글 프레이밍으로 비율을 살린다(다리 짧음 회귀 대응).
// 드레스 투어·스드메 미리보기 양쪽 프롬프트가 공유.

export type ShotType = "full" | "bust" | "closeup";

export const SHOT_TYPES: { value: ShotType; ko: string; desc: string; uploadHint: string }[] = [
  { value: "full", ko: "전신 컷", desc: "머리부터 드레스 자락까지",
    uploadHint: "전신이 보이는 사진을 올려주세요 (정면·곧은 자세 권장)." },
  { value: "bust", ko: "상반신 컷", desc: "허리 위 — 드레스 상의·네크라인",
    uploadHint: "상반신 사진이면 충분해요. 다리는 합성하지 않아요." },
  { value: "closeup", ko: "클로즈업", desc: "얼굴·헤어·메이크업·네크라인",
    uploadHint: "얼굴이 잘 보이는 사진이면 충분해요. 셀카도 좋아요." },
];

export const shotTypeKo = (v: ShotType): string =>
  SHOT_TYPES.find((s) => s.value === v)?.ko ?? v;

/**
 * 컷별 프레이밍 지시 블록. longGown=true 면 전신 컷에서 발을 강제하지 않는다(플로어 자락).
 */
export function shotFramingBlock(shot: ShotType, longGown = true): string {
  if (shot === "closeup") {
    return `FRAMING — close-up bridal portrait (head & shoulders only).
Frame the face, hair and shoulders. Emphasize the bride's face (identity), makeup,
hairstyle and the gown's neckline / upper detail. Do NOT render or invent the body
below the upper chest. Vertical 3:4, photorealistic.`;
  }
  if (shot === "bust") {
    return `FRAMING — waist-up (bust) bridal portrait.
Frame from roughly the waist / upper hip upward. Do NOT render or invent the legs or
lower body. Emphasize face (identity), hair, makeup and the bodice / neckline of the
gown, with natural elegant upper-body proportions. Vertical 3:4, photorealistic.`;
  }
  const feet = longGown
    ? `The floor-length gown falls naturally to the ground; it is completely fine if the
feet are hidden under the hem. Do NOT force both feet or the entire body into frame if
that would compress or shorten the legs/torso.`
    : `Legs and feet may be visible; keep proportions natural and elegant.`;
  return `FRAMING — elegant full-length bridal portrait.
- Render flattering, tastefully ELONGATED proportions: long legs, a high apparent
  waistline, and a natural head size (about 1/7.5 of body height). Do NOT render an
  oversized head or short/compressed legs.
- Photograph from a slightly LOW camera angle (around waist height) for an elegant,
  leggy line.
- ${feet}
- Vertical 3:4, photorealistic.`;
}
