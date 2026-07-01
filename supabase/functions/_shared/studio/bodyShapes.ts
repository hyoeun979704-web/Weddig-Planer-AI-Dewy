/**
 * 체형 카테고리 — 드레스/예복 AI 추천에 사용.
 *
 * 한국 웨딩 업계에서 통용되는 6가지 체형 분류. 각 항목은 gpt-image 프롬프트에
 * 영어 가이드(어떤 실루엣·디테일이 어울리는지)를 함께 전달해 추천 정확도를 높인다.
 *
 * 신부(드레스)와 신랑(예복)은 **같은 6분류**를 공유하되, 표시 카피와 영어 가이드는
 * 성별별로 분기한다(신부=드레스 어드바이스, 신랑=수트 어드바이스). 진입점 분리 패턴과
 * 일관 — DressRecommend 가 `?gender=groom` 이면 groom 필드를 쓴다. 신부 필드는 그대로 보존(회귀 0).
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

export type SubjectGender = "bride" | "groom";

export interface BodyShapeOption {
  value: BodyShape;
  label: string;
  shortDescription: string;
  /** 어떤 체형인지 식별 가이드 (사용자 선택 도움) */
  identify: string;
  /** gpt-image 추천 프롬프트에 주입될 영어 가이드 — 어울리는 드레스 특징 */
  englishGuide: string;
  /** 신랑 표시용 짧은 설명(예복 관점). 없으면 shortDescription 폴백. */
  groomShortDescription?: string;
  /** 신랑 식별 가이드(예복 관점). 없으면 identify 폴백. */
  groomIdentify?: string;
  /** 신랑 예복(수트) 추천 영어 가이드 — buildRecommendSuitPrompt 에 주입. */
  groomEnglishGuide?: string;
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
    groomShortDescription: "어깨·허리 폭이 비슷한 직선형 프레임",
    groomIdentify:
      "어깨와 허리 폭 차이가 크지 않고 상체가 곧은 편이에요.",
    groomEnglishGuide: `STRAIGHT (rectangular) male frame — shoulders and waist have
similar width with little taper. A flat, straight torso line.
RECOMMEND: build a subtle V and vertical line — a tailored (not
skinny) single-breasted 2-button jacket with light shoulder
structure and gentle waist suppression, a mid-width notch or peak
lapel to add angles, and a three-piece / waistcoat for extra shape
and a longer vertical line. Darker tones (navy / charcoal) with
subtle texture. Straight-leg or lightly tapered trousers.
AVOID: boxy oversized jackets, ultra-skinny fits that flatten the
frame, very low button stance, wide low-contrast waistlines.`,
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
    groomShortDescription: "어깨가 좁고 하체가 상대적으로 있는 프레임",
    groomIdentify:
      "어깨가 골반보다 좁은 편이라 상체에 무게를 실으면 균형이 좋아져요.",
    groomEnglishGuide: `WAVE (narrow-shoulder / fuller-lower) male frame — shoulders read
narrower than the hips/lower body.
RECOMMEND: build up and broaden the upper body — a structured
jacket with light shoulder padding, a PEAK lapel to widen the
chest line, and a boutonniere / pocket square to draw the eye up.
Single-breasted with a higher button stance to lift the waistline.
Keep trousers clean and straight (not wide or pleated), ideally a
touch darker than the jacket to de-emphasize the lower body.
AVOID: soft unstructured shoulders, wide pleated trousers that add
lower volume, low button stance, heavy detail below the waist.`,
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
    groomShortDescription: "어깨가 각지고 허리 곡선이 적은 탄탄한 직선형",
    groomIdentify:
      "어깨 라인이 곧고 각져 있으며 허리 굴곡이 크지 않아요.",
    groomEnglishGuide: `SQUARE (athletic / angular H-line) male frame — a straight, squared
shoulder line and a solid torso with little waist taper.
RECOMMEND: a clean, modern tailored fit that follows the frame
without exaggerating it — a NOTCH lapel, minimal shoulder padding
(the shoulder is already strong), and softer wool / flannel fabrics
that reduce hard edges. Navy or mid-grey. A slight waist suppression
keeps it sharp without looking boxy.
AVOID: heavily padded / roped shoulders (over-squares the frame),
stiff boxy cuts, aggressive peak lapels that add more angles.`,
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
    groomShortDescription: "어깨는 좁고 허리·복부 중앙이 풍성한 마름모형",
    groomIdentify:
      "어깨·다리는 가는 편이고 허리·복부 중앙에 무게가 실려 있어요.",
    groomEnglishGuide: `DIAMOND male frame — narrower shoulders with a fuller waist /
midsection. Weight sits in the middle.
RECOMMEND: a single-breasted jacket with a clean vertical line
that SKIMS (never clings) the midsection — light shoulder
structure to widen the top, an open-quarter cut and a slightly
lower button stance to elongate. Dark solid colors (navy /
charcoal / black), optional subtle pinstripe for vertical length.
Straight trousers matching the jacket tone for an unbroken column.
AVOID: waistcoats / double-breasted (add bulk at the middle),
tight buttoning that pulls across the stomach, light colors or
big patterns at the waist, cropped jackets.`,
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
    groomShortDescription: "전체적으로 둥글고 풍성한 체형",
    groomIdentify:
      "상·하체가 고르게 풍성하고 전체 라인이 부드럽게 둥근 편이에요.",
    groomEnglishGuide: `ROUND (full all-over) male frame — soft, full volume distributed
across chest, midsection, and frame.
RECOMMEND: a dark MONOCHROME suit (navy / charcoal / black) with
matching trousers for one long slimming vertical column. A
structured single-breasted 2-button jacket with defined shoulders
and a peak lapel draws the eye up; a tailored-not-tight cut that
drapes cleanly over the body without pulling. Sturdy fabrics that
hold their shape (worsted wool). A crisp vertical shirt placket.
AVOID: double-breasted, light or bright colors, large check /
plaid patterns, tight fits that strain the buttons, short jackets,
contrasting trouser tones that cut the line in half.`,
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
    groomShortDescription: "어깨가 넓고 하체는 좁은 탄탄한 V라인 (수트가 가장 잘 받는 체형)",
    groomIdentify:
      "어깨가 골반보다 뚜렷이 넓고 허리·하체는 가는 편이에요. 운동으로 다져진 V프레임.",
    groomEnglishGuide: `INVERTED TRIANGLE (athletic V) male frame — broad shoulders,
narrow waist and slim lower body. The classic suit-friendly build.
RECOMMEND: lean into the V — a slim / tailored fit that follows
the shoulder-to-waist taper, a NOTCH or PEAK lapel, and minimal
shoulder padding (the shoulder is already broad). Almost any color
works (navy / charcoal / black / ivory tux). Straight or lightly
tapered trousers to keep the lower body balanced, not skinny.
Single-breasted keeps the line clean.
AVOID: added shoulder padding or roped shoulders (over-widens the
top), extreme skinny trousers (over-emphasize the taper), boxy
oversized jackets that hide the frame.`,
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

/** 성별별 식별용 짧은 설명(신랑은 예복 관점 카피, 없으면 신부 폴백). */
export const bodyShapeShortDescription = (
  b: BodyShapeOption,
  gender: SubjectGender = "bride",
): string => (gender === "groom" ? b.groomShortDescription ?? b.shortDescription : b.shortDescription);

/** 성별별 식별 가이드. */
export const bodyShapeIdentify = (
  b: BodyShapeOption,
  gender: SubjectGender = "bride",
): string => (gender === "groom" ? b.groomIdentify ?? b.identify : b.identify);

/** 성별별 영어 추천 가이드 — 프롬프트 빌더에 주입. 신랑 가이드 없으면 신부 가이드 폴백. */
export const bodyShapeGuide = (
  b: BodyShapeOption,
  gender: SubjectGender = "bride",
): string => (gender === "groom" ? b.groomEnglishGuide ?? b.englishGuide : b.englishGuide);
