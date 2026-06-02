/**
 * 메이크업 메타데이터 → AI 프롬프트용 자연어 묘사
 *
 * makeup_samples 테이블의 enum / 배열 값을 영어 자연어 구로 변환해서
 * 메이크업 프롬프트의 MAKEUP SCHEMA 섹션에 주입한다. 레퍼런스
 * 이미지(Image 2)를 모델이 그대로 카피하도록 메타데이터로 한 번 더 강제.
 */

export interface MakeupMetadata {
  name?: string | null;
  base_finish?: string | null;
  lip_color?: string | null;
  lip_finish?: string | null;
  eye_style?: string | null;
  eye_color?: string | null;
  blush_color?: string | null;
  blush_placement?: string | null;
  brow_shape?: string | null;
  contour_intensity?: string | null;
  details?: string[] | null;
  mood?: string[] | null;
}

const BASE_FINISH: Record<string, string> = {
  DEWY: "high-shine dewy 'glass-skin' base — intense lit-from-within moisture with a visible wet-look sheen on the high points (forehead, cheekbones, nose bridge), plump and glowing; medium coverage, real skin texture kept",
  GLOWY: "luminous satin-glow base — soft natural radiance (a healthy glow, NOT a wet shine), light-to-medium coverage, skin texture visible",
  SATIN: "satin base — a soft SEMI-MATTE finish between dewy and matte, smooth with only a subtle natural sheen (no wet shine, but not flat); medium coverage, the most photo-friendly wedding base",
  MATTE: "true MATTE base — soft velvet, shine-free and smoothly blurred (modern soft matte, never flat/cakey); medium-to-full coverage, even poreless-looking complexion",
  NATURAL_SKIN: "skin-like 'no-makeup' base — sheer barely-there coverage that lets real skin texture, pores and a few natural marks show through; fresh and breathable, only lightly evened out",
};

const LIP_COLOR: Record<string, string> = {
  MLBB: "MLBB lip color — slightly enhanced version of natural lip tone",
  NUDE: "nude lip color (warm beige-pink)",
  PEACH: "peach lip color (warm soft orange-pink)",
  CORAL: "coral lip color (vivid orange-pink)",
  ROSE: "rose lip color (cool muted pink)",
  RED: "classic red lip color (true red)",
  BERRY: "berry lip color (deep cool pink-purple)",
  MAUVE: "mauve lip color (dusty cool pink-brown)",
};

const LIP_FINISH: Record<string, string> = {
  TINTED: "blurred tinted-stain finish — color pressed into the lips like a juicy tint with soft edges and low shine (Korean 물들임)",
  GLOSSY: "high-shine glossy lips — a thin natural base topped with a plump glass/oil-like gloss (쫀쫀한 글로시), juicy and reflective",
  SATIN: "satin lips — smooth full color with a soft comfortable mid-sheen (not matte, not high-gloss)",
  MATTE: "soft modern matte lips — full velvet color, shine-free but smooth and skin-friendly (never dry or cakey)",
  BLURRED: "blurred fade lips — soft diffused edges with color concentrated in the center fading outward (페이드 / halo lip)",
};

const EYE_STYLE: Record<string, string> = {
  NATURAL: "natural soft eye — a diffused wash through the crease, no harsh lines, just subtle warmth and definition",
  KOREAN_INNER: "Korean inner-corner shading (이너 음영) — warm tone packed at the inner corner and inner crease, blended outward; adds depth and a deeper-set eye without looking dark",
  BARE: "bare eye — skin-toned lid with no visible shadow, only an invisible hair-thin tightline between the lashes",
  DOLL: "round doll-eye — shadow rounded under the lower lash line plus a bright inner-corner highlight to enlarge and round the eye",
  CAT_EYE: "cat-eye — elongated winged liner lifting up-and-out from the outer corner, slightly smoked for a foxy lift",
  SMOKY: "smoky eye — darkest at the lash line, gradient-blended up into a soft sultry halo around the eye",
  GLITTER: "glitter/pearl eye — reflective foil or pearl pressed onto the lid center to catch light, over a sheer wash",
};

const EYE_COLOR: Record<string, string> = {
  NEUTRAL: "neutral beige-taupe shadow tones",
  PEACH: "warm peach shadow tones",
  ROSE_BROWN: "rose-brown shadow tones (cool pink-brown)",
  BROWN: "warm brown shadow tones",
  BURGUNDY: "burgundy shadow tones (deep wine-red)",
  BRONZE: "bronze shadow tones (warm metallic brown)",
  PLUM: "plum shadow tones (cool muted purple)",
};

const BLUSH_COLOR: Record<string, string> = {
  PEACH: "soft peach blush",
  PINK: "soft pink blush",
  CORAL: "coral blush",
  ROSE: "rose blush",
  NUDE: "muted nude blush",
  NONE: "no blush",
};

const BLUSH_PLACEMENT: Record<string, string> = {
  APPLE: "placed on the apples of the cheeks (looking forward, the rounded high point when smiling)",
  UNDER_EYE: "placed just under the eyes across the upper cheekbone — Korean 'aegyo-sal blush'",
  OUTER_CHEEK: "placed on the outer cheekbone for a contoured effect",
  DRAPED: "draped diagonally from the cheekbone toward the temple",
  NONE: "no blush applied",
};

const BROW: Record<string, string> = {
  KOREAN_STRAIGHT:
    "clearly made-up straight brows (Korean 일자) — brushed up and softly filled with brow product into a clean low-arch flat shape, tinted to match the hair; visibly groomed, NOT bare natural brows",
  SOFT_ARCH:
    "clearly made-up soft-arch brows with a gentle peak — brushed up and filled, softly defined edges, tinted to match the hair; visibly groomed, NOT bare natural brows",
  NATURAL_FLAT:
    "groomed natural brows — hairs brushed up and lightly filled with feathered strokes so they read neatly done, tinted close to the hair; tidy and defined, NOT bare untouched brows",
  FEATHERY:
    "feathered laminated-look brows — individual hairs brushed upward and set, lightly filled for a full fluffy texture, tinted to match the hair; clearly groomed and trendy, NOT bare brows",
  DEFINED:
    "boldly defined brows — fully filled in with crisp clean edges and a structured shape, slightly fuller, tinted; clearly made up and prominent, NOT bare natural brows",
};

const CONTOUR: Record<string, string> = {
  NONE: "no contour",
  SUBTLE: "very subtle contour — almost imperceptible",
  NATURAL: "natural contour adding gentle dimension under cheekbones and along the jaw",
  DEFINED: "defined contour with visible shaping under the cheekbones, sides of the nose, and along the jawline",
};

const DETAIL: Record<string, string> = {
  HIGHLIGHT: "soft highlighter on the high points (tops of cheekbones, brow bone, bridge of nose, Cupid's bow)",
  INNER_CORNER: "shimmer pressed into the inner corners of the eyes",
  GLITTER_TEAR: "small accent of fine glitter on the lower lash center to catch light",
  OMBRE_LIP: "ombré gradient lip — deeper in the center fading toward the edges",
  OVERLINE: "subtly over-lined lips — lip liner drawn just slightly beyond the natural lip line to create a fuller, plumper pout (glam over-lip technique)",
  FAUX_FRECKLE: "delicate faux freckles across the nose bridge and upper cheeks",
  LASH_EXT: "emphasized false lashes / lash extensions — long, dense, curled and well-separated, more dramatic toward the outer corner",
};

const MOOD: Record<string, string> = {
  SOFT_KOREAN: "soft Korean bridal mood",
  ETHEREAL: "ethereal, dreamy mood",
  GLAMOROUS: "glamorous, statement mood",
  FRESH_NATURAL: "fresh, no-makeup-makeup mood",
  CLASSIC: "classic timeless bridal mood",
  ROMANTIC: "romantic, soft-feminine mood",
};

const lookup = (
  table: Record<string, string>,
  key: string | null | undefined,
): string | null => (key ? table[key] ?? null : null);

const arrayLookup = (
  table: Record<string, string>,
  keys: string[] | null | undefined,
): string[] => (keys ?? []).map((k) => table[k]).filter(Boolean);

export const describeMakeup = (m: MakeupMetadata): string => {
  const lines: string[] = [];

  const base = lookup(BASE_FINISH, m.base_finish);
  if (base) lines.push(`- Base finish: ${base}.`);

  const lipColor = lookup(LIP_COLOR, m.lip_color);
  if (lipColor) lines.push(`- Lip color: ${lipColor}.`);

  const lipFinish = lookup(LIP_FINISH, m.lip_finish);
  if (lipFinish) lines.push(`- Lip finish: ${lipFinish}.`);

  const eyeStyle = lookup(EYE_STYLE, m.eye_style);
  if (eyeStyle) lines.push(`- Eye style: ${eyeStyle}.`);

  const eyeColor = lookup(EYE_COLOR, m.eye_color);
  if (eyeColor) lines.push(`- Eye color: ${eyeColor}.`);

  const blushColor = lookup(BLUSH_COLOR, m.blush_color);
  if (blushColor) lines.push(`- Blush color: ${blushColor}.`);

  const blushPlacement = lookup(BLUSH_PLACEMENT, m.blush_placement);
  if (blushPlacement) lines.push(`- Blush placement: ${blushPlacement}.`);

  const brow = lookup(BROW, m.brow_shape);
  if (brow) lines.push(`- Brow: ${brow}.`);

  const contour = lookup(CONTOUR, m.contour_intensity);
  if (contour) lines.push(`- Contour: ${contour}.`);

  const details = arrayLookup(DETAIL, m.details);
  if (details.length) lines.push(`- Extra details: ${details.join("; ")}.`);

  const moods = arrayLookup(MOOD, m.mood);
  if (moods.length) lines.push(`- Overall mood: ${moods.join(", ")}.`);

  return lines.join("\n");
};
