/**
 * 방구석 드레스 투어 — Scene/Tone 정의 (2 × 3 = 6 조합)
 *
 * 사용자가 (사진·드레스) 외에 다음 2축을 추가로 선택:
 *  - scene: 본식(CEREMONY) / 웨딩촬영(STUDIO)
 *  - tone:  어두운(DARK) / 밝은(BRIGHT) / 가든(GARDEN)
 *
 * Edge Function 에서 코드값을 받아 promptBlock 을 메인 프롬프트에 주입.
 *
 * 결과물의 기준 시점 = 웨딩 당일(본식/웨딩촬영) — 첨부사진은 "누구인지(identity)"의
 * 근거일 뿐, 당일 스타일링의 근거가 아니다. 카탈로그/맞춤/추천 모두 WEDDING-DAY
 * HAIR·MAKEUP(신랑은 GROOMING) 섹션이 일상 상태 복사를 금지하고 완성 스타일링을
 * 지시한다. 맞춤 모드는 TAILORED 블록으로 사진 무언 분석(얼굴형·체형·언더톤) 기반
 * 개인화를 강제한다(스키마 속성은 고정, 해석만 개인화). 보정 강도는 retouch.ts.
 */

import { shotFramingBlock, type ShotType } from "./shotTypes.ts";
import { retouchBlock, type RetouchLevel } from "./retouch.ts";

export type SceneType = "CEREMONY" | "STUDIO";
export type BgTone = "DARK" | "BRIGHT" | "GARDEN";
export type SceneCode = `${SceneType}_${BgTone}`;

export interface FittingScene {
  code: SceneCode;
  scene: SceneType;
  tone: BgTone;
  /** 풀 라벨 — 카드 제목 */
  label: string;
  /** 짧은 라벨 — 칩·필터 등 */
  shortLabel: string;
  /** 카드 한 줄 설명 */
  description: string;
  /** 카드 썸네일 이미지 경로 (없으면 fallback 표시) */
  thumbnailUrl?: string;
  /** GPT-4o 프롬프트에 주입될 배경 블록 */
  promptBlock: string;
}

const SCENES: FittingScene[] = [
  // ═══════════════════════════════════════════════
  // 본식 (CEREMONY) — 신부 입장 워킹 모션
  // ═══════════════════════════════════════════════
  {
    code: "CEREMONY_DARK",
    scene: "CEREMONY",
    tone: "DARK",
    label: "본식 — 어두운 홀",
    shortLabel: "어두운 홀",
    description: "샹들리에 럭셔리 홀의 버진로드 입장",
    thumbnailUrl: "/fitting-scenes/ceremony-dark.jpg",
    promptBlock: `A modern luxury indoor wedding ceremony hall in the evening,
captured from the altar's perspective. The hall is EMPTY OF GUESTS —
only the bride is present, walking down the white aisle runner
(virgin road) TOWARD the camera, mid-entrance moment, dress train
flowing gently behind her. She may hold a small bouquet, or her
hands rest naturally. Rows of UNOCCUPIED white ceremony chairs and
floral arrangements line both sides, softly blurred. The chairs MUST
be empty — no audience, no photographers, no staff, no human silhouettes.
Dim ambient warm light from contemporary crystal chandeliers overhead
is the only illumination. Neutral cream walls, polished dark floor.
No daylight, no large windows, no exterior light entering.
Atmosphere: opulent, quiet, intimate — solo bridal entrance.
Lighting: warm chandelier key from above-front only, deep shadows in
the seating area, NO bright daylight.
Mood: bride alone in an empty ceremony hall.`,
  },
  {
    code: "CEREMONY_BRIGHT",
    scene: "CEREMONY",
    tone: "BRIGHT",
    label: "본식 — 밝은 홀",
    shortLabel: "밝은 홀",
    description: "햇살 가득한 모던 홀의 버진로드 입장",
    thumbnailUrl: "/fitting-scenes/ceremony-bright.jpg",
    promptBlock: `A bright modern Korean-style indoor wedding ceremony hall in the
daytime, captured from the altar's perspective. The hall is EMPTY OF
GUESTS — only the bride is present, walking down the white aisle
runner TOWARD the camera, mid-entrance moment, train flowing softly
behind her, holding a small bouquet or hands resting naturally. Rows
of UNOCCUPIED white chairs and elegant white floral arrangements line
both sides, softly blurred. The chairs MUST be empty — no audience,
no photographers, no staff, no human silhouettes. Tall arched windows
with sheer curtains let bright natural light flood the aisle.
Atmosphere: airy, clean, quiet — solo bridal entrance.
Lighting: soft diffused daylight from windows, even fill.
Mood: bride alone in a sunlit ceremony hall.`,
  },
  {
    code: "CEREMONY_GARDEN",
    scene: "CEREMONY",
    tone: "GARDEN",
    label: "본식 — 가든",
    shortLabel: "가든",
    description: "꽃 아치와 야외 버진로드 입장",
    thumbnailUrl: "/fitting-scenes/ceremony-garden.jpg",
    promptBlock: `An outdoor garden wedding ceremony in golden hour, captured from
the altar's perspective. The ceremony space is EMPTY OF GUESTS —
only the bride is present, walking down a white aisle runner TOWARD
the camera, mid-entrance moment, dress train trailing through lush
greenery and pastel blooming flowers. Rows of UNOCCUPIED white
ceremony chairs and floral arrangements on both sides, softly
blurred. The chairs MUST be empty — no audience, no photographers,
no staff, no human silhouettes. A floral arch with cascading roses
and hydrangeas in the distance behind her. Warm sunlight filters
through trees.
Atmosphere: natural, romantic, quiet — solo outdoor bridal entrance.
Lighting: warm golden-hour, rim light through foliage.
Mood: bride alone in an empty garden ceremony.`,
  },

  // ═══════════════════════════════════════════════
  // 웨딩촬영 (STUDIO) — 편집적 스튜디오 컷
  // ═══════════════════════════════════════════════
  {
    code: "STUDIO_DARK",
    scene: "STUDIO",
    tone: "DARK",
    label: "웨딩촬영 — 어두운 톤",
    shortLabel: "어두운 톤",
    description: "감각적인 무디 스튜디오 컷",
    thumbnailUrl: "/fitting-scenes/studio-dark.jpg",
    promptBlock: `A professional wedding photography studio with a moody dark
aesthetic. Deep neutral charcoal-gray seamless backdrop, controlled
studio lighting creating soft directional shadows. Minimal sleek
floral prop or sheer dark fabric drape on one side. Clean editorial
photoshoot composition.
Atmosphere: sophisticated editorial.
Lighting: dramatic warm key from upper-left, soft fill, subtle rim
light separating bride from background.
Mood: moody editorial studio.`,
  },
  {
    code: "STUDIO_BRIGHT",
    scene: "STUDIO",
    tone: "BRIGHT",
    label: "웨딩촬영 — 밝은 톤",
    shortLabel: "밝은 톤",
    description: "깨끗한 화이트 스튜디오 컷",
    thumbnailUrl: "/fitting-scenes/studio-bright.jpg",
    promptBlock: `A professional wedding photography studio with a clean bright
aesthetic. Light cream or soft off-white seamless backdrop, soft
even studio lighting, optional minimal white florals on one side.
Modern minimal editorial bridal portrait composition.
Atmosphere: light, modern, editorial.
Lighting: soft diffused key from upper-left, even fill, slight
warmth.
Mood: bright editorial studio.`,
  },
  {
    code: "STUDIO_GARDEN",
    scene: "STUDIO",
    tone: "GARDEN",
    label: "웨딩촬영 — 가든",
    shortLabel: "가든",
    description: "골든아워 야외 편집 컷",
    thumbnailUrl: "/fitting-scenes/studio-garden.jpg",
    promptBlock: `An outdoor garden bridal photoshoot setting. The bride stands in a
curated garden space — lush green foliage and blooming pastel
flowers (roses, peonies, hydrangeas) softly out of focus around her,
golden-hour sunlight filtering through. Editorial photoshoot
framing, not a ceremony.
Atmosphere: natural, romantic, editorial.
Lighting: warm golden-hour, rim light from behind through foliage.
Mood: garden editorial.`,
  },
];

export const FITTING_SCENES = SCENES;

export const SCENES_BY_TYPE: Record<SceneType, FittingScene[]> = {
  CEREMONY: SCENES.filter((s) => s.scene === "CEREMONY"),
  STUDIO: SCENES.filter((s) => s.scene === "STUDIO"),
};

export const sceneByCode = (code: SceneCode): FittingScene | undefined =>
  SCENES.find((s) => s.code === code);

export const SCENE_TYPE_LABEL: Record<SceneType, string> = {
  CEREMONY: "본식",
  STUDIO: "웨딩촬영",
};

export const SCENE_TYPE_DESC: Record<SceneType, string> = {
  CEREMONY: "신부 입장 — 버진로드 위에서",
  STUDIO: "스튜디오 — 편집 포즈 컷",
};

/**
 * 메인 프롬프트 빌더 — Edge Function 에서 사용
 *
 * GPT-4o (gpt-image-1) 에 두 장의 이미지(사용자 사진·드레스)와 함께
 * 이 프롬프트 텍스트를 전송해서 합성 결과를 받는다.
 *
 * dressDescription 은 dress_samples 메타데이터를 영어 자연어로
 * 직렬화한 문단(생성: src/lib/dressDescription.ts).
 */
export const buildFittingPrompt = (
  sceneCode: SceneCode,
  dressDescription: string = "",
  opts: { custom?: boolean; shotType?: ShotType; gender?: "bride" | "groom"; retouch?: RetouchLevel } = {},
): string => {
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);

  // 신랑(예복)은 별도 빌더 — 신부 프롬프트(튜닝됨)를 그대로 보존해 회귀 0.
  if (opts.gender === "groom") {
    return buildGroomFittingPrompt(scene, dressDescription, !!opts.custom, opts.shotType ?? "full", opts.retouch ?? "natural");
  }

  const isCeremony = scene.scene === "CEREMONY";
  // 맞춤(custom)=참조 드레스 사진(Image 2) 없이 SCHEMA 텍스트만으로 드레스를 지시.
  const custom = !!opts.custom;
  const shotType: ShotType = opts.shotType ?? "full";
  // 짧은/미디 키워드가 없으면 웨딩드레스 기본 = 플로어렝스로 가정(발 강제 안 함).
  const longGown = !/short|mini|midi|knee|짧|미니|미디|무릎/i.test(dressDescription);

  const retouch = retouchBlock(opts.retouch ?? "natural", "bride");

  const dressSchemaBlock = dressDescription
    ? custom
      ? `\nDRESS SCHEMA — render this dress exactly\n${dressDescription}\nRender precisely these attributes. Do not invent a different\nsilhouette, fabric, neckline, or detail set.\n`
      : `\nDRESS SCHEMA — match these attributes exactly\n${dressDescription}\nIf the dress in Image 2 disagrees with any attribute above, the\nattribute list above wins. Do not invent a different silhouette,\nfabric, or detail set.\n`
    : "";

  const referencesBlock = custom
    ? `REFERENCES
- Image 1: the bride (user's photo). This is the only reference.`
    : `REFERENCES
- Image 1: the bride (user's photo)
- Image 2: a wedding dress on a headless mannequin`;
  const taskDressSource = custom
    ? "the wedding dress described in DRESS SCHEMA below"
    : "the exact dress from Image 2";
  const dressSectionHeader = custom
    ? "DRESS — render exactly as specified in DRESS SCHEMA"
    : "DRESS — keep exactly from Image 2";
  // 결과물의 기준 시점 = 웨딩 당일(본식/촬영). 첨부사진은 "누구인지"의 근거일 뿐,
  // 당일 스타일링(헤어·메이크업)의 근거가 아니다 — 일상 상태 복사 앵커 제거.
  const occasionNoun = isCeremony
    ? "her actual wedding ceremony"
    : "her professional wedding photoshoot";
  // 맞춤 모드: 스키마 속성은 고정하되, 스키마가 비워둔 선택은 사진 분석 기반으로 개인화.
  const tailoringBlock = custom
    ? `TAILORED TO HER — the schema is fixed, the interpretation is personal
Silently analyze Image 1 first: her face shape, body proportions, and skin
undertone. Follow the DRESS SCHEMA attributes exactly as specified — but every
choice the schema leaves open (how the fit sits on her body, the hairstyle,
makeup tones, jewelry scale, pose nuance) must be chosen specifically to
flatter HER, never a generic default.

`
    : "";

  return `You're generating a photorealistic Korean bridal portrait.

${referencesBlock}

TOP PRIORITY — IDENTITY MATCH (most important rule)
The face in the output must be UNMISTAKABLY the same person from Image 1 —
someone who knows her must recognize her instantly. Reproduce her exact
facial features; do NOT beautify, slim, enlarge eyes, or average toward a
generic "AI bridal model":
- Eyes: same shape, size, slant / canthal tilt, spacing, and eyelid type
  (monolid / inner or outer double eyelid, and crease height)
- Eyebrows: same shape, thickness, arch and position
- Nose: same bridge height and width, tip shape, nostril width
- Lips: same shape, fullness, width, and lip-to-philtrum proportion
- Face: same jawline, chin shape, cheekbone position and height, hairline,
  and overall face length-to-width ratio
- Keep her exact skin tone and undertone, plus any moles, freckles, or other
  distinctive marks
This identity match takes priority over every other instruction below.

TASK
Produce a single bridal photograph of the bride from Image 1 wearing
${taskDressSource}, in the venue described below.

${shotFramingBlock(shotType, longGown)}

${tailoringBlock}BRIDE — identity from Image 1, styling from her wedding day
- Face: the SAME PERSON — reproduce EVERY feature exactly as detailed in
  IDENTITY MATCH above (eyes, eyelid type, brows, nose, lips, jawline, chin,
  cheekbones, proportions). Recognizable at a glance; no beautification.
- Skin tone, complexion, age
- Keep her recognizable build, but follow the FRAMING above for proportions
  (flattering and elegant — do not copy an unflattering posture or angle).
- Image 1 shows WHO she is — NOT how she is styled today. This portrait is
  ${occasionNoun}: do NOT carry the photo's everyday hair, bare face or daily
  makeup, casual clothing, or ambient lighting into the output.

WEDDING-DAY HAIR — restyled by a professional Korean bridal stylist
- Silently note her face shape and the dress neckline, then restyle her hair
  into ONE polished bridal style that flatters both — e.g. a soft low updo
  with delicate face-framing strands, romantic waves, an elegant half-up, or
  a clean chignon${isCeremony ? " (veil-friendly, ceremony-proof)" : " (editorial, camera-ready)"}.
- Keep her natural hair color and hairline: the STYLING transforms, the
  identity does not.

WEDDING-DAY MAKEUP — complete professional bridal makeup
- Apply a COMPLETE Korean bridal makeup look regardless of what she wears in
  Image 1 — even if she is bare-faced, and replacing any everyday makeup:
  flawless even base, groomed and defined brows, soft eye definition with
  curled lashes, a healthy blush, and an elegant lip tone chosen to suit her
  skin undertone. Wedding-day polished — elegant, NOT heavy glam.
- Makeup is painted ONTO her exact features. Do NOT change her identity,
  facial features, eye/lip shape, bone structure, skin tone, or age — she
  must still clearly be the same person, on her wedding day.

${dressSectionHeader}
- Silhouette, fit, length, train, neckline, sleeves, back design
- Color: the exact shade and tone of the dress
- Fabric / material — reproduce it PRECISELY, do NOT substitute a generic
  satin: same fiber and weave, surface texture, sheen level (matte / soft
  satin / high-gloss / metallic), opacity vs sheerness, stiffness vs fluid
  drape, and the way it catches light and folds
- All decorative work — embroidery, beading, lace, trim, feathers,
  ruffles, applique — at the same positions and scale
- Drapes naturally; visible skin matches the dress's coverage
${dressSchemaBlock}
BODY PROPORTIONS
- Follow the FRAMING section above for shot range and proportions. Keep her
  recognizable build and identity, but render a flattering, elegant bridal line.
- Never produce doll-like / chibi proportions (oversized head, tiny hands,
  shortened torso, missing neck), and never an awkward short-legged crop.

${retouch ? retouch + "\n\n" : ""}VENUE
${scene.promptBlock}

POSE
${
  isCeremony
    ? `- Mid-stride walking motion down the aisle, slight contrapposto
- Dress train flowing behind her (natural fabric movement)
- May hold a small bouquet at waist height, or hands rest naturally
- Soft confident smile, eyes engaging with camera ahead
- Slight tilt of head okay`
    : `- Natural standing pose with subtle contrapposto
- One hand may rest at hip, touch collarbone, lift the skirt edge,
  or hold a small bouquet; the other arm relaxed
- Soft natural smile, eyes warm and engaged
- Slight head tilt okay`
}
- Avoid symmetric mannequin-stiff stance with arms hanging straight
  and hands clasped at center
- Full body or 3/4 body visible, centered
- Subtle natural movement in fabric

DO NOT
- Drift the face toward generic / idealized features
- Copy the everyday hair, daily makeup, or casual clothing from Image 1 —
  she is fully wedding-styled in the output
- Slim, broaden, or alter the bride's body
- Modify any dress detail
- Show a mannequin, stand, or pole
- Add watermarks, text, logos, sparkle marks
- Stylize (cartoon, illustration, anime)
${
  isCeremony
    ? `- Add guests, audience, photographers, officiants, staff, or any
  other people besides the bride. The ceremony space must be EMPTY
  except for her.
- Place anyone in the ceremony chairs — every chair must be UNOCCUPIED.
- Show silhouettes, blurred crowds, or human shapes in the background.`
    : "- Place the bride on a wedding aisle (this is a studio shoot)"
}

Output: one photorealistic 3:4 vertical image.`;
};

/**
 * 신랑 예복(수트/턱시도) 피팅 프롬프트 — 신부 buildFittingPrompt 의 대칭 빌더.
 * 신부 프롬프트를 건드리지 않고 별도로 둬 회귀 0. 드레스→예복, 부케·신부 메이크업 제거,
 * 남성 그루밍·수트 디테일·남성 포즈로 치환. 씬(장소)의 신부 표현은 중립화(bride→groom).
 * dressDescription 인자에는 신랑 예복 설명(커스텀 텍스트)이 들어온다.
 */
function buildGroomFittingPrompt(
  scene: FittingScene,
  suitDescription: string,
  custom: boolean,
  shotType: ShotType,
  retouchLevel: RetouchLevel = "natural",
): string {
  const isCeremony = scene.scene === "CEREMONY";
  const retouch = retouchBlock(retouchLevel, "groom");
  const suitSchemaBlock = suitDescription
    ? custom
      ? `\nSUIT SCHEMA — render this suit exactly\n${suitDescription}\nRender precisely these attributes. Do not invent a different\nsilhouette, lapel, color, or detail set.\n`
      : `\nSUIT SCHEMA — match these attributes exactly\n${suitDescription}\nIf the suit in Image 2 disagrees with any attribute above, the\nattribute list above wins.\n`
    : "";
  const referencesBlock = custom
    ? `REFERENCES\n- Image 1: the groom (user's photo). This is the only reference.`
    : `REFERENCES\n- Image 1: the groom (user's photo)\n- Image 2: a wedding suit / tuxedo on a headless mannequin`;
  const taskSuitSource = custom
    ? "the wedding suit described in SUIT SCHEMA below"
    : "the exact suit from Image 2";
  const suitSectionHeader = custom
    ? "SUIT — render exactly as specified in SUIT SCHEMA"
    : "SUIT — keep exactly from Image 2";
  const occasionNoun = isCeremony
    ? "his actual wedding ceremony"
    : "his professional wedding photoshoot";
  const tailoringBlock = custom
    ? `TAILORED TO HIM — the schema is fixed, the interpretation is personal
Silently analyze Image 1 first: his face shape, build, and skin undertone.
Follow the SUIT SCHEMA attributes exactly as specified — but every choice the
schema leaves open (how the tailoring sits on his frame, hairstyle, grooming
level, pose nuance) must be chosen specifically to flatter HIM, never a
generic default.

`
    : "";
  // 씬 문구의 신부 표현 중립화(장소 묘사라 대부분 무해, "the bride stands" 류만 치환).
  const venue = scene.promptBlock
    .replace(/\bbride\b/gi, "groom")
    .replace(/\bher\b/gi, "his")
    .replace(/\bshe\b/gi, "he");

  return `You're generating a photorealistic Korean groom portrait.

${referencesBlock}

TOP PRIORITY — IDENTITY MATCH (most important rule)
The face in the output must be UNMISTAKABLY the same person from Image 1 —
someone who knows him must recognize him instantly. Reproduce his exact
facial features; do NOT beautify, slim, enlarge eyes, or average toward a
generic "AI groom model":
- Eyes: same shape, size, slant / canthal tilt, spacing, and eyelid type
  (monolid / inner or outer double eyelid, and crease height)
- Eyebrows: same shape, thickness, arch and position
- Nose: same bridge height and width, tip shape, nostril width
- Lips: same shape, fullness, width, and lip-to-philtrum proportion
- Face: same jawline, chin shape, cheekbone position and height, hairline,
  and overall face length-to-width ratio
- Keep his exact skin tone and undertone, plus any moles, freckles, or other
  distinctive marks
This identity match takes priority over every other instruction below.

TASK
Produce a single wedding photograph of the groom from Image 1 wearing
${taskSuitSource}, in the venue described below.

${shotFramingBlock(shotType, false)}

${tailoringBlock}GROOM — identity from Image 1, styling from his wedding day
- Face: the SAME PERSON — reproduce EVERY feature exactly as in IDENTITY MATCH
  above. Recognizable at a glance; no beautification.
- Skin tone, complexion, age
- Keep his recognizable build, but follow the FRAMING above for proportions.
- Image 1 shows WHO he is — NOT how he is styled today. This portrait is
  ${occasionNoun}: do NOT carry the photo's casual hair, clothing, or ambient
  lighting into the output.

WEDDING-DAY HAIR & GROOMING — styled for his wedding (NOT makeup)
- Restyle his hair into ONE neat wedding-day style chosen to flatter his face
  shape — e.g. a clean side part, natural down styling, or softly swept-back
  volume. Keep his natural hair color and hairline.
- Wedding-day grooming: clean healthy prepared skin, tidy brows; if facial
  hair is present, keep it neatly trimmed — do NOT add or remove it. Natural,
  never made-up.
- Do NOT change his identity, features, bone structure, skin tone, or age —
  he must still clearly be the same person, on his wedding day.

${suitSectionHeader}
- Silhouette and fit (slim / regular), jacket length, lapel type (notch / peak /
  shawl), button count, vest/waistcoat presence, shirt, tie or bow tie, pocket square
- Color: the exact shade and tone
- Fabric / material — reproduce PRECISELY (matte wool / satin tux lapel / textured):
  weave, sheen level, drape, and how it catches light
- All details — buttons, stitching, boutonniere — at the same positions and scale
- Drapes and fits naturally
${suitSchemaBlock}
BODY PROPORTIONS
- Follow the FRAMING section for shot range and proportions. Keep his recognizable
  build and identity, render a flattering, natural line.
- Never doll-like / chibi proportions, never an awkward short-legged crop.

${retouch ? retouch + "\n\n" : ""}VENUE
${venue}

POSE
${
  isCeremony
    ? `- Standing or a slight mid-stride at the aisle, confident upright posture
- Hands natural — adjusting a cuff or jacket button, one hand lightly in a pocket,
  or relaxed at the sides
- Soft confident expression, eyes engaging with camera ahead`
    : `- Natural standing pose with subtle contrapposto
- Hands natural — adjust a cuff, one hand lightly in a pocket, or relaxed
- Soft natural expression, eyes warm and engaged`
}
- Avoid a stiff mannequin stance with arms hanging straight and hands clasped
- Full body or 3/4 body visible, centered

DO NOT
- Drift the face toward generic / idealized features
- Copy the everyday hair or casual clothing from Image 1 — he is fully
  wedding-styled in the output
- Slim, broaden, or alter the groom's body
- Modify any suit detail
- Show a mannequin, stand, or pole
- Add a bouquet, veil, or bridal elements
- Add watermarks, text, logos, sparkle marks
- Stylize (cartoon, illustration, anime)
${
  isCeremony
    ? `- Add guests, audience, photographers, officiants, or staff. The ceremony
  space must be EMPTY except for him; every chair UNOCCUPIED.`
    : "- Place the groom on a wedding aisle (this is a studio shoot)"
}

Output: one photorealistic 3:4 vertical image.`;
}

/**
 * 추천 모드 프롬프트 — 참조 드레스 이미지 없이 사용자 사진 1장만 입력.
 *
 * gpt-image-2 가 사용자 사진과 체형 가이드를 읽고 어울리는 드레스를
 * 알아서 결정해서 적용한다. (Gemini 등 별도 추론 단계 없음)
 *
 * dewy-dress-recommend Edge Function 에서 사용.
 */
export const buildRecommendDressPrompt = (
  sceneCode: SceneCode,
  bodyShapeLabel: string,
  bodyShapeGuide: string,
  gender: "bride" | "groom" = "bride",
  opts: { retouch?: RetouchLevel } = {},
): string => {
  if (gender === "groom") return buildRecommendSuitPrompt(sceneCode, bodyShapeLabel, bodyShapeGuide, opts);
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);

  const isCeremony = scene.scene === "CEREMONY";
  const retouch = retouchBlock(opts.retouch ?? "natural", "bride");
  const occasionNoun = isCeremony
    ? "her actual wedding ceremony"
    : "her professional wedding photoshoot";

  return `You're generating a photorealistic Korean bridal portrait.

REFERENCE
- Image 1: the bride (user's photo). This is the only reference.

TOP PRIORITY — IDENTITY MATCH (most important rule)
The face must be UNMISTAKABLY the same person from Image 1 — someone who
knows her recognizes her instantly. Reproduce her exact features; do NOT
beautify, slim, enlarge eyes, or drift toward a generic "AI bridal model":
- Eyes: shape, size, slant / canthal tilt, spacing, eyelid type (monolid /
  inner or outer double eyelid, crease height)
- Eyebrows: shape, thickness, arch, position
- Nose: bridge height & width, tip shape, nostril width
- Lips: shape, fullness, width, lip-to-philtrum proportion
- Face: jawline, chin, cheekbone position, hairline, length-to-width ratio
- Exact skin tone / undertone, plus any moles or freckles
This rule takes priority over everything else.

TASK
Act as a senior Korean bridal stylist. The bride's body type is
"${bodyShapeLabel}". Choose the SINGLE most flattering wedding dress
for this body type and the venue described below, then produce a
single full-body bridal photograph of the bride wearing it. Vertical
3:4, photorealistic.

BRIDE BODY TYPE — choose a flattering dress based on this guide
${bodyShapeGuide}
Pick exactly ONE silhouette, one neckline, one sleeve style, one
back design, one fabric, and a coherent embellishment level that
the guide recommends. Avoid the silhouettes/details the guide warns
against. Stick to bridal colors (white / ivory / off-white /
champagne / blush). The chosen dress must look intentional and
fully designed, not a mix of conflicting elements.

BRIDE — identity from Image 1, styling from her wedding day
- Face: the SAME PERSON — reproduce every feature exactly as detailed in
  IDENTITY MATCH above; recognizable at a glance, no beautification
- Skin tone, complexion, age; keep her natural hair color
- Image 1 shows WHO she is — NOT how she is styled today. This portrait is
  ${occasionNoun}: do NOT carry the photo's everyday hair, bare face or daily
  makeup, casual clothing, or ambient lighting into the output.
- Body proportions:
  · Full-body input → COPY EVERYTHING from the photo (height, build,
    torso/leg ratio, shoulder width, hand size). The photo wins.
  · Upper-body input → infer a plausible Korean woman body
    consistent with the stated "${bodyShapeLabel}" body type.
- Never produce doll-like / chibi or stretched fashion-illustration
  proportions.

WEDDING-DAY HAIR — restyled by a professional Korean bridal stylist
- Silently note her face shape and the neckline of the dress you chose, then
  restyle her hair into ONE polished bridal style that flatters both — e.g. a
  soft low updo with face-framing strands, romantic waves, an elegant
  half-up, or a clean chignon${isCeremony ? " (veil-friendly, ceremony-proof)" : " (editorial, camera-ready)"}.
  Keep her natural hair color and hairline.

WEDDING-DAY MAKEUP — complete professional bridal makeup
- Apply a COMPLETE Korean bridal makeup look regardless of what she wears in
  Image 1 — even if bare-faced, replacing any everyday makeup: flawless even
  base, groomed defined brows, soft eye definition with curled lashes, healthy
  blush, and an elegant lip tone suited to her skin undertone and the dress.
  Wedding-day polished — elegant, NOT heavy glam. Makeup is painted ONTO her
  exact features; identity, feature shapes, skin tone and age stay unchanged.

${retouch ? retouch + "\n\n" : ""}VENUE
${scene.promptBlock}

POSE
${
  isCeremony
    ? `- Mid-stride walking motion down the aisle, slight contrapposto
- Dress train flowing behind her (natural fabric movement)
- May hold a small bouquet at waist height, or hands rest naturally
- Soft confident smile, eyes engaging the camera ahead`
    : `- Natural standing pose with subtle contrapposto
- One hand may rest at hip, touch collarbone, lift the skirt edge,
  or hold a small bouquet; the other arm relaxed
- Soft natural smile, eyes warm and engaged`
}
- Full body or 3/4 body visible, centered
- Avoid symmetric mannequin-stiff stance

DO NOT
- Drift the face toward generic / idealized features
- Copy the everyday hair, daily makeup, or casual clothing from Image 1 —
  she is fully wedding-styled in the output
- Slim, broaden, or alter the bride's actual body
- Mix conflicting design elements (e.g. boho lace with sharp modern
  satin column) — the dress must read as one cohesive design
- Show a mannequin, stand, or pole
- Add watermarks, text, logos
- Stylize (cartoon, illustration, anime)
${
  isCeremony
    ? `- Add guests, audience, photographers, officiants, staff, or any
  other people besides the bride. Every ceremony chair must be UNOCCUPIED.`
    : "- Place the bride on a wedding aisle (this is a studio shoot)"
}

Output: one photorealistic 3:4 vertical image.`;
};

/**
 * 신랑 예복 추천 프롬프트 — buildRecommendDressPrompt 의 대칭(수트). 체형 가이드에 맞춰
 * 가장 어울리는 예복(핏·라펠·색)을 골라 전신 합성. 신부판은 손대지 않음(회귀 0).
 */
function buildRecommendSuitPrompt(
  sceneCode: SceneCode,
  bodyShapeLabel: string,
  bodyShapeGuide: string,
  opts: { retouch?: RetouchLevel } = {},
): string {
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);
  const isCeremony = scene.scene === "CEREMONY";
  const retouch = retouchBlock(opts.retouch ?? "natural", "groom");
  const occasionNoun = isCeremony
    ? "his actual wedding ceremony"
    : "his professional wedding photoshoot";
  const venue = scene.promptBlock
    .replace(/\bbride\b/gi, "groom")
    .replace(/\bher\b/gi, "his")
    .replace(/\bshe\b/gi, "he");

  return `You're generating a photorealistic Korean groom portrait.

REFERENCE
- Image 1: the groom (user's photo). This is the only reference.

TOP PRIORITY — IDENTITY MATCH (most important rule)
The face must be UNMISTAKABLY the same person from Image 1 — someone who
knows him recognizes him instantly. Reproduce his exact features; do NOT
beautify, slim, enlarge eyes, or drift toward a generic "AI groom model":
- Eyes: shape, size, slant / canthal tilt, spacing, eyelid type
- Eyebrows, nose (bridge, tip, nostrils), lips (shape, fullness)
- Face: jawline, chin, cheekbone position, hairline, length-to-width ratio
- Exact skin tone / undertone, plus any moles or freckles
This rule takes priority over everything else.

TASK
Act as a senior Korean wedding stylist for grooms. The groom's body type is
"${bodyShapeLabel}". Choose the SINGLE most flattering wedding suit / tuxedo
for this body type and the venue below, then produce a single full-body
photograph of the groom wearing it. Vertical 3:4, photorealistic.

GROOM BODY TYPE — choose a flattering suit based on this guide
${bodyShapeGuide}
Pick exactly ONE coherent look: fit (slim / regular), lapel (notch / peak /
shawl), jacket length, vest or no vest, shirt, tie or bow tie, and a color
(classic black / charcoal / navy / grey / ivory tux). Avoid what the guide
warns against. The suit must look intentional and fully designed.

GROOM — identity from Image 1, styling from his wedding day
- Face: the SAME PERSON — every feature exactly as in IDENTITY MATCH above.
- Skin tone, complexion, age; keep his natural hair color.
- Image 1 shows WHO he is — NOT how he is styled today. This portrait is
  ${occasionNoun}: do NOT carry the photo's casual hair, clothing, or ambient
  lighting into the output.
- Body proportions:
  · Full-body input → COPY the photo's height, build, proportions. The photo wins.
  · Upper-body input → infer a plausible Korean man body consistent with "${bodyShapeLabel}".
- Never doll-like / chibi or stretched proportions.

WEDDING-DAY HAIR & GROOMING — styled for his wedding (NOT makeup)
- Restyle his hair into ONE neat wedding-day style chosen to flatter his face
  shape — e.g. a clean side part, natural down styling, or softly swept-back
  volume. Keep his natural hair color and hairline.
- Wedding-day grooming: clean healthy prepared skin, tidy brows; keep any
  facial hair neatly trimmed (do not add/remove). Identity, features, skin
  tone, age unchanged — the same person, on his wedding day.

${retouch ? retouch + "\n\n" : ""}VENUE
${venue}

POSE
${
  isCeremony
    ? `- Standing or slight mid-stride at the aisle, confident upright posture
- Hands natural — adjusting a cuff/button or lightly in a pocket
- Soft confident expression, eyes to the camera`
    : `- Natural standing pose, subtle contrapposto
- Hands natural — adjust a cuff or hand lightly in a pocket
- Soft natural expression`
}
- Full body or 3/4 body visible, centered
- Avoid symmetric mannequin-stiff stance

DO NOT
- Drift the face toward generic / idealized features
- Copy the everyday hair or casual clothing from Image 1 — he is fully
  wedding-styled in the output
- Slim, broaden, or alter the groom's actual body
- Mix conflicting design elements — the suit must read as one cohesive look
- Show a mannequin, stand, or pole
- Add a bouquet, veil, or bridal elements
- Add watermarks, text, logos
- Stylize (cartoon, illustration, anime)
${
  isCeremony
    ? `- Add guests, audience, photographers, officiants, or staff besides the groom. Every chair UNOCCUPIED.`
    : "- Place the groom on a wedding aisle (this is a studio shoot)"
}

Output: one photorealistic 3:4 vertical image.`;
}
