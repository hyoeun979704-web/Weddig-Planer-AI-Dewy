/**
 * 메이크업 시뮬레이션 — Scene/Tone 정의 (2 × 3 = 6)
 *
 * 드레스 시뮬레이션과 같은 구조이되, 메이크업은 얼굴 클로즈업이라
 * 배경보다는 *조명 환경* 이 더 중요. promptBlock 도 그에 맞게 재작성.
 *
 *   - scene: 본식 메이크업(CEREMONY) / 웨딩촬영 메이크업(STUDIO)
 *   - tone:  실내 조명(INDOOR) / 자연광(NATURAL) / 골든아워(GOLDEN)
 */

import { makeupOptionCatalog } from "@/lib/makeupDescription";

export type MakeupSceneType = "CEREMONY" | "STUDIO";
export type MakeupLightTone = "INDOOR" | "NATURAL" | "GOLDEN";
export type MakeupSceneCode = `${MakeupSceneType}_${MakeupLightTone}`;

export interface MakeupScene {
  code: MakeupSceneCode;
  scene: MakeupSceneType;
  tone: MakeupLightTone;
  label: string;
  shortLabel: string;
  description: string;
  thumbnailUrl?: string;
  /** 프롬프트에 주입되는 LIGHTING 블록 */
  promptBlock: string;
}

const SCENES: MakeupScene[] = [
  {
    code: "CEREMONY_INDOOR",
    scene: "CEREMONY",
    tone: "INDOOR",
    label: "본식 — 식장 조명",
    shortLabel: "식장 조명",
    description: "샹들리에·웜톤 실내 조명 아래에서 어떻게 보이는지",
    thumbnailUrl: "/makeup-scenes/ceremony-indoor.jpg",
    promptBlock: `Indoor wedding ceremony hall lighting. Warm overhead key
light (~3200K), soft fill, no harsh shadows. The bride is captured
in a clean close-up bridal portrait, neutral cream-toned background
softly blurred — no chairs, no guests, no aisle visible (the focus
is the face). Slight backlight rim catches the hair.
Atmosphere: warm, intimate ceremony lighting.`,
  },
  {
    code: "CEREMONY_NATURAL",
    scene: "CEREMONY",
    tone: "NATURAL",
    label: "본식 — 자연광",
    shortLabel: "자연광",
    description: "창가·하우스 웨딩의 부드러운 자연광",
    thumbnailUrl: "/makeup-scenes/ceremony-natural.jpg",
    promptBlock: `Soft daylight from large window. Diffused natural light
washes the face evenly (~5500K), with the brightest edge from the
side. Clean off-white background softly blurred — no chairs, no
guests visible. Skin texture remains true to natural light.
Atmosphere: airy, modern, bright bridal portrait.`,
  },
  {
    code: "CEREMONY_GOLDEN",
    scene: "CEREMONY",
    tone: "GOLDEN",
    label: "본식 — 골든아워",
    shortLabel: "골든아워",
    description: "야외 가든 본식, 따뜻한 햇살 아래",
    thumbnailUrl: "/makeup-scenes/ceremony-golden.jpg",
    promptBlock: `Outdoor golden-hour sunlight. Warm directional sun
(~4000K) skimming the face from one side, gentle rim light through
hair. Background: out-of-focus garden greenery and pastel blooms —
no ceremony chairs, no guests, just bokeh foliage. Skin gets a warm
honeyed glow from the late-afternoon sun.
Atmosphere: warm, romantic, outdoor bridal portrait.`,
  },

  {
    code: "STUDIO_INDOOR",
    scene: "STUDIO",
    tone: "INDOOR",
    label: "웨딩촬영 — 무디 스튜디오",
    shortLabel: "무디 스튜디오",
    description: "어두운 배경의 감각적인 컷",
    thumbnailUrl: "/makeup-scenes/studio-indoor.jpg",
    promptBlock: `Professional photography studio with moody dark
aesthetic. Deep charcoal seamless backdrop. Controlled key light
from upper-left (warm), soft fill, subtle rim light separating
bride from background. Studio softbox quality, sharp on the face.
Atmosphere: editorial moody close-up.`,
  },
  {
    code: "STUDIO_NATURAL",
    scene: "STUDIO",
    tone: "NATURAL",
    label: "웨딩촬영 — 화이트 스튜디오",
    shortLabel: "화이트 스튜디오",
    description: "깨끗한 화이트 배경의 편집 컷",
    thumbnailUrl: "/makeup-scenes/studio-natural.jpg",
    promptBlock: `Professional photography studio with clean bright
aesthetic. Soft off-white seamless backdrop. Even diffused softbox
key from upper-left, balanced fill, gentle warmth. Editorial modern
bridal close-up.
Atmosphere: light, modern, editorial.`,
  },
  {
    code: "STUDIO_GOLDEN",
    scene: "STUDIO",
    tone: "GOLDEN",
    label: "웨딩촬영 — 야외 골든아워",
    shortLabel: "야외 골든아워",
    description: "야외 편집 컷, 자연광 백릿",
    thumbnailUrl: "/makeup-scenes/studio-golden.jpg",
    promptBlock: `Outdoor bridal photoshoot in golden hour. Warm
late-afternoon sunlight, the face lit from a 45° front-side angle,
hair haloed by backlight. Background: lush green foliage and pastel
blooms softly out of focus.
Atmosphere: natural, romantic, editorial outdoor portrait.`,
  },
];

export const MAKEUP_SCENES = SCENES;

export const MAKEUP_SCENES_BY_TYPE: Record<MakeupSceneType, MakeupScene[]> = {
  CEREMONY: SCENES.filter((s) => s.scene === "CEREMONY"),
  STUDIO: SCENES.filter((s) => s.scene === "STUDIO"),
};

export const makeupSceneByCode = (
  code: MakeupSceneCode,
): MakeupScene | undefined => SCENES.find((s) => s.code === code);

export const MAKEUP_SCENE_TYPE_LABEL: Record<MakeupSceneType, string> = {
  CEREMONY: "본식 메이크업",
  STUDIO: "촬영 메이크업",
};

export const MAKEUP_SCENE_TYPE_DESC: Record<MakeupSceneType, string> = {
  CEREMONY: "식장 환경에서 어떻게 보일지",
  STUDIO: "촬영 환경에서 어떻게 보일지",
};

/**
 * 헤어 자동 스타일링 블록.
 *
 * 사용자 본인 머리(색·길이·질감)는 유지하되, 선택한 컷(본식/촬영)·무드(컨셉)·
 * 조명에 어울리는 신부 헤어스타일로 자동 스타일링하도록 지시한다.
 */
const HAIR_BY_SCENE: Record<MakeupSceneType, string> = {
  CEREMONY:
    "a CURRENT 2026 Korean bridal style — e.g. a soft low bun with gentle crown volume and deliberate fine face-framing wispy strands (trendy 잔머리 연출), or a soft half-up; modern, soft and pretty, never stiff or old-fashioned",
  STUDIO:
    "a current modern editorial style — e.g. soft glossy waves worn down, a soft half-up, or a soft low bun with face-framing wispy strands and crown volume; trendy and natural, never retro",
};

const buildHairBlock = (scene: MakeupScene): string =>
  `HAIR — style HER OWN hair like a CURRENT Korean bridal salon (modern, NOT DIY, NOT old-fashioned)
- Keep her hair color and length from Image 1, styled the way a trendy 2026 wedding
  hair stylist would: ${HAIR_BY_SCENE[scene.scene]}
- Keep her eyebrows fully visible; her forehead MAY be softly framed by bangs or
  side-swept pieces (no need to fully expose the forehead)
- The fine face-framing wispy strands (잔머리 연출) are INTENTIONAL and stylist-placed —
  soft and pretty, never frizzy, never messy/home-done, never stiff or plastic
- Keep her own hair color, but render it with natural depth and a soft light sheen
  (a rich dark tone, not a flat jet-black block)
- Suit the makeup mood/concept above and the
  ${MAKEUP_SCENE_TYPE_LABEL[scene.scene]} setting under the given lighting`;

/**
 * 메인 메이크업 프롬프트 빌더. Edge Function 에서 사용.
 *
 * GPT-4o(gpt-image-2) 에 사용자 셀카 + 메이크업 레퍼런스 이미지를 함께
 * 보내며, 이 프롬프트는 "사용자 얼굴 그대로, 메이크업만 카피" 를 강제.
 */
export const buildMakeupPrompt = (
  sceneCode: MakeupSceneCode,
  makeupDescription: string = "",
): string => {
  const scene = makeupSceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown makeup scene code: ${sceneCode}`);

  const schemaBlock = makeupDescription
    ? `\nMAKEUP SCHEMA — apply these attributes precisely\n${makeupDescription}\nIf the reference image in Image 2 disagrees with any attribute\nabove, the attribute list wins. Do not invent unspecified colors\nor finishes.\n`
    : "";

  const hairBlock = buildHairBlock(scene);

  return `You're generating a photorealistic Korean bridal beauty portrait.

REFERENCES
- Image 1: the bride (user's selfie / portrait)
- Image 2: a reference makeup look on a different model

TOP PRIORITY — IDENTITY MATCH
The face in the output must clearly be the same person from Image 1.
Eye shape and size, double-eyelid / monolid type, nose, lip shape,
jawline, face shape, and overall likeness must match closely enough
that someone who knows the person would immediately recognize her.
(Her eyebrows are styled with makeup below — keep them on her own
brow bone, but their grooming, fullness, shape and tone DO change.) DO NOT borrow the face shape, eye shape,
or facial proportions from Image 2. Image 2 is for makeup colors
and placement only. This rule takes priority over all others.

TASK
Produce a single close-up bridal beauty portrait — head and
shoulders, eye-level, sharp focus on the face. The bride wears the
makeup look from Image 2 reinterpreted on her own face. Vertical
3:4 (or square), photorealistic, no text or watermark.

BRIDE — keep exactly from Image 1
- Face: SAME PERSON, recognizable at a glance. Match eye shape and
  size, eyelid type, nose bridge and tip, lip shape, jawline, face
  width
- Skin tone and undertone (do not lighten or change race)
- Bone structure, age, freckles or moles if visible
- Hair color, length and natural texture (see HAIR — restyle, keep identity)

MAKEUP — copy from Image 2, applied to Image 1's face
- Base/skin finish — render EXACTLY the finish in the schema and make
  it clearly read that way: a matte look must look matte (shine-free),
  a dewy look must look wet/glowy, a satin look semi-matte. Do NOT
  default every face to the same dewy skin
- Lip color, shape, and finish; transfer color & finish onto HER lip
  shape. Keep her natural mouth — EXCEPT a subtle over-line is allowed
  ONLY when the schema lists the over-lip detail (then draw just
  slightly past her natural line for fullness; never drastically)
- Eye look — shadow color, placement, intensity; eyeliner style and
  weight; copy onto HER eye shape (do not reshape her eyes)
- LASHES — most brides wear them: add natural-looking curled false
  lashes / extensions, defined and well-separated along her lash line.
  Fuller, longer and more dramatic for glam / smoky / cat-eye / defined
  looks; softer and wispier for natural looks; add lightly defined
  lower lashes for doll-eye looks
- EYEBROWS — restyle WITH MAKEUP (this step is the most often missed,
  do NOT skip it): groom and brush the hairs up, fill in with brow
  product, set the shape and tint per the schema. The brows must look
  clearly made up — NOT her bare natural brows. Keep them on her own
  brow bone, but change the grooming, fullness, shape and tone
- Blush color and placement
- Highlight / contour intensity
${schemaBlock}
${hairBlock}

LIGHTING
${scene.promptBlock}

POSE & FRAMING
- Head-and-shoulders close-up, head straight or slight tilt
- Eyes engaging the camera, soft natural expression, lips relaxed
  or a very subtle smile
- Tasteful neckline visible (skin / collarbone), no specific outfit
  required — neutral white or cream draped fabric, or skin
- Crisp focus on the eyes
- Vertical 3:4 framing

DO NOT
- Borrow face shape, eye shape, nose, lips, or skin tone from Image 2
- Lighten or change the bride's skin tone or undertone
- Reshape any facial feature; only paint makeup ONTO her existing
  features (a subtle lip over-line is the only allowed exception, and
  only when the schema specifies it)
- Add accessories, jewelry, or veil unless clearly suggested by
  Image 1
- Add watermarks, text, logos, brand names
- Stylize (cartoon, illustration, anime, painterly)
- Show the reference model from Image 2 anywhere in the output

Output: one photorealistic vertical 3:4 close-up bridal portrait.`;
};

/**
 * 추천 모드 프롬프트 — 레퍼런스 메이크업 이미지 없이 사용자 셀카만 입력.
 *
 * gpt-image-2 가 셀카를 분석해서 (퍼스널컬러·얼굴형·눈매·입술 등)
 * 그에 어울리는 신부 메이크업을 알아서 디자인해 적용한다.
 *
 * dewy-makeup-recommend Edge Function 에서 사용.
 */
export const buildRecommendMakeupPrompt = (
  sceneCode: MakeupSceneCode,
): string => {
  const scene = makeupSceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown makeup scene code: ${sceneCode}`);

  const hairBlock = buildHairBlock(scene);
  const palette = makeupOptionCatalog();

  return `You're generating a photorealistic Korean bridal beauty portrait.

REFERENCE
- Image 1: the bride (user's selfie). This is the only reference.

TOP PRIORITY — IDENTITY MATCH
The face in the output must clearly be the same person from Image 1.
Match her eye shape and size, eyelid type (monolid / double / hooded),
nose, lip shape, jawline, face shape, skin tone, and overall likeness
so closely that someone who knows her would recognize her immediately.
DO NOT change her facial features. Apply makeup ONTO her existing
features. (Her eyebrows ARE styled with makeup — keep them on her own
brow bone, but their grooming, fullness, shape and tone do change.) This rule takes priority over
everything else.

TASK — analyze HER face, then design the OPTIMAL makeup for it (not a random look)
Act as a senior Korean bridal makeup artist & personal-color expert.
STEP 1 — silently analyze the bride in Image 1:
  - personal color season (warm-spring / cool-summer / warm-autumn / cool-winter)
    and undertone (warm / neutral / cool), skin clarity and texture
  - face shape (round / long / oval / square / heart)
  - eye shape (double-lid / monolid / hooded / down-turned / up-turned)
    and eye spacing
  - lip fullness and Cupid's-bow definition
  - nose bridge / tip, and overall feature balance

STEP 2 — from the MAKEUP PALETTE below, choose for EACH dimension the ONE option
that is OBJECTIVELY MOST FLATTERING for the features you analyzed (this is a
diagnosis, not a style whim). Reason from face → makeup, e.g.:
  - undertone / personal color → lip color, eye-shadow color, blush undertone
    (warm tones for warm seasons, cool tones for cool seasons)
  - eye shape → eye style & liner (hooded → shifted/visible crease; monolid →
    gradient inner shading; down-turned → lifted cat-eye; round → elongated)
  - face shape → contour intensity/placement and blush placement (e.g. round →
    more outer-cheek contour + draped blush; long → horizontal under-eye blush)
  - lip fullness → lip finish & technique (thinner lips → subtle over-line or
    gradient for fullness; full lips → clean precise finish)
  - skin clarity → base finish (clearer skin → dewy/natural; texture to blur →
    satin/matte)
  - balance the focus on one feature (eyes OR lips), not everything at once
Pick a coherent, harmonious result (avoid clashing combos), include lashes and a
few fitting accent details, and stay within the palette (do not invent finishes).

MAKEUP PALETTE — the full professional option set to choose the optimal values from:
${palette}

Produce a single close-up bridal beauty portrait — head and
shoulders, eye-level, sharp focus on the face — wearing the makeup
you just designed. Vertical 3:4, photorealistic.

BRIDE — keep exactly from Image 1
- Face: SAME PERSON, recognizable at a glance
- Skin tone and undertone (DO NOT lighten or alter race)
- Bone structure, age, freckles or moles
- Hair color, length and natural texture (see HAIR — restyle, keep identity)

${hairBlock}

LIGHTING
${scene.promptBlock}

POSE & FRAMING
- Head-and-shoulders close-up, head straight or slight tilt
- Eyes engaging the camera, soft natural expression
- Tasteful neckline visible — neutral white / cream draped fabric
- Crisp focus on the eyes
- Vertical 3:4 framing

DO NOT
- Reshape facial features (eyes, nose, lips, jaw, brow position)
- Lighten or change skin tone / undertone
- Idealize toward a generic "AI beauty" face
- Apply colors that fight her personal color (e.g. cool-toned
  makeup on warm-toned skin)
- Mix conflicting moods (e.g. heavy smoky eye with no-makeup lip)
- Add accessories or veil unless clearly suggested by Image 1
- Add watermarks, text, logos
- Stylize (cartoon, illustration, anime, painterly)

Output: one photorealistic vertical 3:4 close-up bridal portrait.`;
};
