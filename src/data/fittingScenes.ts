/**
 * 방구석 드레스 투어 — Scene/Tone 정의 (2 × 3 = 6 조합)
 *
 * 사용자가 (사진·드레스) 외에 다음 2축을 추가로 선택:
 *  - scene: 본식(CEREMONY) / 웨딩촬영(STUDIO)
 *  - tone:  어두운(DARK) / 밝은(BRIGHT) / 가든(GARDEN)
 *
 * Edge Function 에서 코드값을 받아 promptBlock 을 메인 프롬프트에 주입.
 */

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
  opts: { custom?: boolean } = {},
): string => {
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);

  const isCeremony = scene.scene === "CEREMONY";
  // 맞춤(custom)=참조 드레스 사진(Image 2) 없이 SCHEMA 텍스트만으로 드레스를 지시.
  const custom = !!opts.custom;

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

  return `You're generating a photorealistic Korean bridal portrait.

${referencesBlock}

TOP PRIORITY — IDENTITY MATCH
The face in the output must clearly be the same person from Image 1.
Eye shape and size, nose, lips, jawline, face shape, and overall
likeness must match closely enough that someone who knows the person
would immediately recognize her. Do not average the face toward a
generic "AI bridal model" look. This takes priority over all other
instructions.

TASK
Produce a single full-body bridal photograph of the bride from
Image 1 wearing ${taskDressSource}, in the venue described
below. Vertical 3:4, photorealistic.

BRIDE — keep exactly from Image 1
- Face: SAME PERSON, recognizable at a glance. Match eye shape and
  size, nose bridge, lip shape, jawline, face proportions
- Skin tone, complexion, age
- Hair color and natural texture (bridal updos/waves okay, identity
  stays)
- Body proportions:
  · Full-body input → COPY EVERYTHING from the photo (height, build,
    torso/leg ratio, shoulder width, hand size). The photo is the
    source of truth, NOT a generic ideal.
  · Upper-body input → infer a plausible body from the visible
    torso and head; do not default to a generic slim model

${dressSectionHeader}
- Silhouette, fit, length, train, neckline, sleeves, back design
- Color, fabric texture, sheen
- All decorative work — embroidery, beading, lace, trim, feathers,
  ruffles, applique — at the same positions and scale
- Drapes naturally; visible skin matches the dress's coverage
${dressSchemaBlock}
BODY PROPORTIONS
- PRIMARY RULE — if Image 1 shows the bride's full body (head to
  feet or close to it), the PHOTO WINS. Copy her actual height,
  leg-to-torso ratio, shoulder width, arm length, hand size, and
  waistline position exactly as visible in Image 1. Do not normalize
  toward an "ideal" body. Do not slim, lengthen, or stretch her.
- FALLBACK — only when Image 1 is a head/upper-body crop and the
  lower body is not visible, infer realistic adult Korean woman
  proportions: ~7 to 7.5 heads tall, shoulders ~1.5–1.8× head width,
  hands sized to face (closed fist ≈ face from chin to hairline),
  arms reach mid-thigh.
- ALWAYS — never produce doll-like / chibi proportions (oversized
  head, tiny hands, shortened torso, missing neck). Never stretch
  the body to 9-head fashion-illustration proportions.

VENUE
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
): string => {
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);

  const isCeremony = scene.scene === "CEREMONY";

  return `You're generating a photorealistic Korean bridal portrait.

REFERENCE
- Image 1: the bride (user's photo). This is the only reference.

TOP PRIORITY — IDENTITY MATCH
The face in the output must clearly be the same person from Image 1.
Match her eye shape and size, nose, lips, jawline, face shape, and
overall likeness so closely that someone who knows her would
recognize her immediately. Do NOT drift toward a generic "AI bridal
model" look. This rule takes priority over everything else.

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

BRIDE — keep exactly from Image 1
- Face: SAME PERSON, recognizable at a glance
- Skin tone, complexion, age, hair color and natural texture
- Body proportions:
  · Full-body input → COPY EVERYTHING from the photo (height, build,
    torso/leg ratio, shoulder width, hand size). The photo wins.
  · Upper-body input → infer a plausible Korean woman body
    consistent with the stated "${bodyShapeLabel}" body type.
- Never produce doll-like / chibi or stretched fashion-illustration
  proportions.

VENUE
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
