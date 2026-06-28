/**
 * 신부 체형 카테고리 — 드레스 AI 추천에 사용.
 *
 * 한국 웨딩 업계에서 통용되는 6가지 체형 분류. 각 항목은
 * Gemini 프롬프트에 한국어 가이드(어떤 실루엣·네크라인·디테일이
 * 어울리는지)를 함께 전달해 추천 정확도를 높인다.
 *
 * value 는 DB / prompt_params 에 저장되는 UPPER_SNAKE_CASE 키.
 */

export type BodyShape =
  | "STRAIGHT"
  | "WAVE"
  | "SQUARE"
  | "DIAMOND"
  | "ROUND"
  | "INVERTED_TRIANGLE";

export interface BodyShapeOption {
  value: BodyShape;
  label: string;
  shortDescription: string;
  /** 어떤 체형인지 식별 가이드 (사용자 선택 도움) */
  identify: string;
  /** Gemini 추천 프롬프트에 주입될 영어 가이드 — 어울리는 드레스 특징 */
  englishGuide: string;
}

export const BODY_SHAPES: BodyShapeOption[] = [
  {
    value: "STRAIGHT",
    label: "스트레이트형",
    shortDescription: "어깨·허리·힙 비율이 비슷한 직선형 — 균형 잡힌 체형",
    identify:
      "어깨·허리·골반 너비가 거의 같고 허리 라인이 도드라지지 않아요.",
    englishGuide: `STRAIGHT (rectangular) body type — shoulders, waist, and hips
have similar width with little waist definition.
RECOMMEND: silhouettes that create a defined waist and feminine
curves — A-line, ball gown, trumpet, or empire waist. Belt /
sash details, ruched / draped waist, peplum, dropped waist.
Sweetheart, V-neck, off-shoulder necklines (open up the bust line).
AVOID: column / sheath silhouettes (emphasize the lack of curves).`,
  },
  {
    value: "WAVE",
    label: "웨이브형",
    shortDescription: "상체가 좁고 하체가 풍성한 곡선형 (서양 '페어' 체형)",
    identify:
      "어깨가 좁고 허리는 또렷하며 골반·허벅지가 상체보다 풍성해요.",
    englishGuide: `WAVE (pear / triangle) body type — shoulders are narrower than
hips, with a defined waist and fuller lower body.
RECOMMEND: silhouettes that balance the proportion by adding
volume up top — A-line, ball gown, or trumpet with structured
bodice and skirt that gradually flares. Off-shoulder, boat,
bateau, sweetheart with embellished bodice draw the eye upward.
Detailed sleeves (cap, off-shoulder, lace sleeves). Beading or
appliqué concentrated on the bodice.
AVOID: mermaid silhouettes that hug the widest part of the hips,
strapless minimal bodice with full skirt (unbalances).`,
  },
  {
    value: "SQUARE",
    label: "스퀘어형 (H라인)",
    shortDescription: "어깨·허리·힙이 일직선 — 매끈한 직선 실루엣",
    identify:
      "어깨가 약간 각지고 허리 곡선이 거의 없으며 골반도 평평해요.",
    englishGuide: `SQUARE (athletic / H-line) body type — straight shoulder line,
minimal waist definition, narrow hips. Strong angular frame.
RECOMMEND: silhouettes that soften angularity and suggest curves
— A-line, soft trumpet, ball gown with fluid skirts. Sweetheart,
V-neck, deep V soften the shoulder line. Empire waist, ruched
waist details, peplum to fake a waistline. Soft fabrics — chiffon,
tulle, charmeuse. Draped or asymmetric details.
AVOID: strict column / sheath silhouettes, high necklines with
sharp shoulders (amplifies the square frame).`,
  },
  {
    value: "DIAMOND",
    label: "다이아몬드형",
    shortDescription: "허리·복부가 풍성하고 어깨와 하체가 좁은 마름모형",
    identify:
      "어깨와 다리는 가는 편이고 가슴·허리·복부 중앙이 가장 풍성해요.",
    englishGuide: `DIAMOND body type — narrow shoulders and hips with fuller bust /
waist / midsection. Weight concentrated in the middle.
RECOMMEND: silhouettes that skim the midsection and emphasize
the slimmer extremities — A-line, empire waist (gathers just
below the bust, flows over the midsection), or column with
strategic draping. V-neck, sweetheart deepen the bust line and
draw the eye vertically. Vertical seams, vertical beading.
Structured bodice that lifts the bust. Cap or short sleeves
balance the narrow shoulders without bulk.
AVOID: dropped waist, mermaid with tight midsection, horizontal
bodice details, ball gowns with ultra-cinched waist.`,
  },
  {
    value: "ROUND",
    label: "라운드형",
    shortDescription: "전체적으로 동그란 곡선의 풍성한 체형",
    identify:
      "전체 라인이 부드럽고 둥글며 허리 곡선이 풍성한 살집과 어우러져 있어요.",
    englishGuide: `ROUND (full / curvy all-over) body type — soft rounded curves
throughout, fuller bust, midsection, and hips together.
RECOMMEND: silhouettes that create vertical length and a defined
focal point — A-line with structured (not gathered) bodice,
empire waist with smooth skirt, or trumpet that flares from
mid-thigh. V-neck and deep V elongate the torso visually.
Vertical seams, vertical lace, illusion neckline. Mikado, satin
back crepe, or other heavyweight fabrics with structure (avoid
clingy chiffon). Three-quarter or long fitted sleeves elongate.
AVOID: ball gowns with cinched waist (overwhelms the frame),
mermaid silhouettes that hug every curve, high necklines that
shorten the torso, all-over horizontal beading.`,
  },
  {
    value: "INVERTED_TRIANGLE",
    label: "역삼각형",
    shortDescription: "어깨가 넓고 하체는 좁은 V라인 체형",
    identify:
      "어깨가 골반보다 넓고 허리·하체는 가는 편이에요. 운동을 많이 한 체형.",
    englishGuide: `INVERTED TRIANGLE body type — shoulders are noticeably broader
than hips, narrow waist, slim lower body.
RECOMMEND: silhouettes that add volume to the lower body to
balance broad shoulders — full ball gown, A-line with structured
skirt, trumpet that flares dramatically. V-neck, scoop neck,
sweetheart soften and narrow the shoulder line. Avoid extra
bodice embellishment; place beading / lace at the skirt and hem.
Drop waist works because it draws the eye down. Off-shoulder is
OK only if the bodice is plain and the skirt is voluminous.
AVOID: halter, one-shoulder, heavy puff sleeves, structured
shoulders, busy bodice details, mermaid (emphasizes narrow hips).`,
  },
];

export const BODY_SHAPE_BY_VALUE: Record<BodyShape, BodyShapeOption> =
  BODY_SHAPES.reduce((acc, b) => {
    acc[b.value] = b;
    return acc;
  }, {} as Record<BodyShape, BodyShapeOption>);

export const labelOfBodyShape = (
  value: string | null | undefined,
): string => {
  if (!value) return "";
  return BODY_SHAPE_BY_VALUE[value as BodyShape]?.label ?? value;
};
