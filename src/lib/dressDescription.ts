/**
 * 드레스 메타데이터 → AI 프롬프트용 자연어 묘사
 *
 * dress_samples 테이블의 enum/배열 값을 영어 자연어 구로 변환하여
 * GPT-4o 이미지 편집 프롬프트의 DRESS 섹션에 주입한다. 모델이
 * 입력 드레스 이미지를 카피하는 것을 메타데이터로 한 번 더 강제.
 */

export interface DressMetadata {
  name?: string | null;
  silhouette?: string | null;
  neckline?: string | null;
  sleeve?: string | null;
  length?: string | null;
  fabric?: string | null;
  details?: string[] | null;
  back_design?: string | null;
  color?: string | null;
  waist?: string | null;
  mood?: string[] | null;
}

const SILHOUETTE: Record<string, string> = {
  A_LINE: "A-line silhouette gently flaring from the waist to the floor",
  BALL: "full ball gown silhouette with a voluminous puffy skirt",
  MERMAID: "mermaid silhouette hugging the body through the hips and flaring at the knees",
  TRUMPET: "trumpet silhouette fitted through the hips and flaring from mid-thigh",
  SHEATH: "slim sheath silhouette following the body's natural line",
  EMPIRE: "empire silhouette with a raised waistline just below the bust",
  COLUMN: "straight column silhouette",
};

const NECKLINE: Record<string, string> = {
  SWEETHEART: "sweetheart neckline",
  OFF_SHOULDER: "off-shoulder neckline sitting just below the shoulders",
  ILLUSION: "illusion neckline with sheer fabric and delicate appliqué",
  V_NECK: "V-neckline",
  DEEP_V: "deep V-neckline",
  BOAT: "boat neckline (wide horizontal across the collarbones)",
  HALTER: "halter neckline",
  STRAPLESS: "strapless straight neckline",
  HIGH_NECK: "high neckline at the base of the throat",
  SQUARE: "square neckline",
  ONE_SHOULDER: "asymmetric one-shoulder neckline",
};

const SLEEVE: Record<string, string> = {
  SLEEVELESS: "sleeveless",
  OFF_SHOULDER: "off-shoulder sleeves draped just below the shoulder",
  LONG: "long fitted sleeves",
  CAP: "cap sleeves",
  THREE_QUARTER: "three-quarter length sleeves",
  PUFF: "puff sleeves",
  BISHOP: "bishop sleeves (gathered at the wrist)",
  SHORT: "short fitted sleeves",
  SPAGHETTI: "spaghetti straps",
};

const LENGTH: Record<string, string> = {
  FLOOR: "floor length, no train",
  SHORT_TRAIN: "with a short train (sweep train, ~30–50cm)",
  CHAPEL_TRAIN: "with a chapel train (~1m)",
  CATHEDRAL_TRAIN: "with a dramatic cathedral train (2m+)",
  TEA: "tea-length (mid-calf)",
  MIDI: "midi length (knee to mid-calf)",
  MINI: "mini length (above the knee)",
};

const FABRIC: Record<string, string> = {
  SATIN: "lustrous satin fabric with a soft sheen",
  SILK: "fine silk fabric",
  TULLE: "layered tulle (soft mesh) creating airy volume",
  LACE: "delicate lace fabric",
  CHIFFON: "lightweight chiffon",
  ORGANZA: "crisp organza with structured volume",
  TAFFETA: "structured taffeta with subtle sheen",
  MIKADO: "heavyweight Mikado silk with structure",
  CREPE: "matte crepe with fluid drape",
  VELVET: "soft velvet",
};

const DETAIL: Record<string, string> = {
  BEADING: "intricate beadwork across the bodice and skirt",
  LACE: "lace appliqué",
  EMBROIDERY: "delicate embroidered detailing",
  SEQUINS: "subtle sequin embellishments",
  PEARLS: "pearl embellishments",
  FEATHERS: "feather accents",
  RUFFLES: "soft ruffled tiers",
  BOWS: "bow details",
  MINIMAL: "minimal embellishment — clean simple lines",
  HANDWORK: "intricate hand-stitched detailing",
  CRYSTAL: "crystal embellishments",
  FLORAL_APPLIQUE: "3D floral appliqué",
};

const BACK: Record<string, string> = {
  CORSET: "corset back with visible lacing",
  ZIPPER: "concealed zipper back",
  BUTTONS: "row of fabric-covered buttons down the back",
  LOW_BACK: "low open back",
  KEYHOLE: "keyhole cutout back",
  ILLUSION_BACK: "illusion back with sheer paneling and appliqué",
  V_BACK: "V-shaped open back",
  COWL_BACK: "draped cowl back",
};

const COLOR: Record<string, string> = {
  PURE_WHITE: "pure bright white",
  IVORY: "ivory",
  OFF_WHITE: "soft off-white",
  CHAMPAGNE: "champagne",
  BLUSH: "blush pink",
  NUDE: "nude/skin tone",
  SILVER: "silver",
};

const WAIST: Record<string, string> = {
  NATURAL: "natural waistline at the narrowest point of the torso",
  EMPIRE: "empire waistline (high, just below the bust)",
  DROP: "drop waist (below the natural waist)",
};

const MOOD: Record<string, string> = {
  CLASSIC: "classic",
  MODERN: "modern",
  MINIMAL: "minimal",
  BOHEMIAN: "bohemian",
  ROMANTIC: "romantic",
  GLAM: "glamorous",
  VINTAGE: "vintage",
  EDGY: "edgy",
};

const lookup = (
  table: Record<string, string>,
  key: string | null | undefined,
): string | null => (key ? table[key] ?? null : null);

const arrayLookup = (
  table: Record<string, string>,
  keys: string[] | null | undefined,
): string[] => (keys ?? []).map((k) => table[k]).filter(Boolean);

/**
 * 드레스 메타데이터를 영어 문단으로 직렬화. 빈 필드는 건너뜀.
 */
export const describeDress = (dress: DressMetadata): string => {
  const lines: string[] = [];

  const silhouette = lookup(SILHOUETTE, dress.silhouette);
  if (silhouette) lines.push(`- Silhouette: ${silhouette}.`);

  const neckline = lookup(NECKLINE, dress.neckline);
  if (neckline) lines.push(`- Neckline: ${neckline}.`);

  const sleeve = lookup(SLEEVE, dress.sleeve);
  if (sleeve) lines.push(`- Sleeves: ${sleeve}.`);

  const length = lookup(LENGTH, dress.length);
  if (length) lines.push(`- Length: ${length}.`);

  const fabric = lookup(FABRIC, dress.fabric);
  if (fabric) lines.push(`- Fabric: ${fabric} (this is the dominant material).`);

  const details = arrayLookup(DETAIL, dress.details);
  if (details.length) {
    lines.push(`- Surface details: ${details.join("; ")}.`);
  }

  const back = lookup(BACK, dress.back_design);
  if (back) lines.push(`- Back: ${back}.`);

  const color = lookup(COLOR, dress.color);
  if (color) lines.push(`- Color: ${color}.`);

  const waist = lookup(WAIST, dress.waist);
  if (waist) lines.push(`- Waist: ${waist}.`);

  const moods = arrayLookup(MOOD, dress.mood);
  if (moods.length) {
    lines.push(`- Overall mood: ${moods.join(", ")}.`);
  }

  return lines.join("\n");
};
