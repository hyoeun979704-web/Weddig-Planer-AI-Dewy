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
 */
export const buildFittingPrompt = (sceneCode: SceneCode): string => {
  const scene = sceneByCode(sceneCode);
  if (!scene) throw new Error(`unknown scene code: ${sceneCode}`);

  const isCeremony = scene.scene === "CEREMONY";

  return `You're generating a photorealistic Korean bridal portrait.

REFERENCES
- Image 1: the bride (user's photo)
- Image 2: a wedding dress on a headless mannequin

TOP PRIORITY — IDENTITY MATCH
The face in the output must clearly be the same person from Image 1.
Eye shape and size, nose, lips, jawline, face shape, and overall
likeness must match closely enough that someone who knows the person
would immediately recognize her. Do not average the face toward a
generic "AI bridal model" look. This takes priority over all other
instructions.

TASK
Produce a single full-body bridal photograph of the bride from
Image 1 wearing the exact dress from Image 2, in the venue described
below. Vertical 3:4, photorealistic.

BRIDE — keep exactly from Image 1
- Face: SAME PERSON, recognizable at a glance. Match eye shape and
  size, nose bridge, lip shape, jawline, face proportions
- Skin tone, complexion, age
- Hair color and natural texture (bridal updos/waves okay, identity
  stays)
- Body proportions:
  · Full-body input → copy actual height, build, torso/leg ratio
  · Upper-body input → infer plausible body from visible torso;
    do not default to a generic slim model

DRESS — keep exactly from Image 2
- Silhouette, fit, length, train, neckline, sleeves, back design
- Color, fabric texture, sheen
- All decorative work — embroidery, beading, lace, trim, feathers,
  ruffles, applique — at the same positions and scale
- Drapes naturally; visible skin matches the dress's coverage

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
