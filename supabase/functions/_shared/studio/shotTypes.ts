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
 * subject: 신부(기본) 텍스트는 기존 그대로(회귀 0), 신랑은 makeup/gown 등 신부 어휘를
 * 그루밍/수트 어휘로 치환한 별도 분기(신랑 렌더에 "bridal/makeup/gown" 잔존하던 결함 교정).
 */
export function shotFramingBlock(
  shot: ShotType,
  longGown = true,
  subject: "bride" | "groom" = "bride",
): string {
  // 렌즈 앵커 — 커뮤니티 검증 어휘(85mm 인물 압축·105mm 매크로 뷰티샷·50mm 자연 원근).
  // 조명은 씬 블록이 결정하므로 여기선 렌즈 룩(원근·압축·배경 흐림)만 지시한다.
  const isGroom = subject === "groom";
  if (shot === "closeup") {
    if (isGroom) {
      return `FRAMING — close-up groom portrait (head & shoulders only).
Frame the face, hair and shoulders. Emphasize the groom's face (identity), grooming,
hairstyle and the suit's collar / lapel / tie detail. Do NOT render or invent the body
below the upper chest. Rendered with the look of a 105mm macro portrait lens —
flattering compression, crisp ultra-detailed skin texture, creamy background
falloff. Vertical 3:4, photorealistic.`;
    }
    return `FRAMING — close-up bridal portrait (head & shoulders only).
Frame the face, hair and shoulders. Emphasize the bride's face (identity), makeup,
hairstyle and the gown's neckline / upper detail. Do NOT render or invent the body
below the upper chest. Rendered with the look of a 105mm macro portrait lens —
flattering compression, crisp ultra-detailed skin texture, creamy background
falloff. Vertical 3:4, photorealistic.`;
  }
  if (shot === "bust") {
    if (isGroom) {
      return `FRAMING — waist-up (bust) groom portrait.
Frame from roughly the waist / upper hip upward. Do NOT render or invent the legs or
lower body. Emphasize face (identity), hair, grooming and the jacket / shirt / tie of
the suit, with natural upper-body proportions. Rendered with the look of an
85mm portrait lens — natural facial compression, softly blurred background.
Vertical 3:4, photorealistic.`;
    }
    return `FRAMING — waist-up (bust) bridal portrait.
Frame from roughly the waist / upper hip upward. Do NOT render or invent the legs or
lower body. Emphasize face (identity), hair, makeup and the bodice / neckline of the
gown, with natural elegant upper-body proportions. Rendered with the look of an
85mm portrait lens — natural facial compression, softly blurred background.
Vertical 3:4, photorealistic.`;
  }
  if (isGroom) {
    return `FRAMING — elegant full-length groom portrait.
- Render natural, well-tailored proportions with a natural head size (about 1/7.5 of
  body height). Do NOT render an oversized head or short/compressed legs.
- Photograph from a slightly LOW camera angle (around waist height) for a confident,
  elongated line.
- Legs and feet may be visible; keep proportions natural.
- Rendered with the look of a 50mm lens on a full-frame camera — natural
  perspective, no wide-angle distortion.
- Vertical 3:4, photorealistic.`;
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
- Rendered with the look of a 50mm lens on a full-frame camera — natural
  perspective, no wide-angle distortion.
- Vertical 3:4, photorealistic.`;
}
