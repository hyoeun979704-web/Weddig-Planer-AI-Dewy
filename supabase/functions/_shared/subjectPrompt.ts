// 성별(신부/신랑) 인지 이미지 프롬프트 빌딩 블록 — 단일 소스.
//
// 배경: dress·hair·sdm·consulting 이미지 함수가 각자 "신부 전제" 프롬프트를 하드코딩해
// 신랑 지원이 불가능했다(예: hair 의 "bride.png"·여성 헤어 목록, dress 의 "드레스" 고정).
// 여기서 성별 분기를 한 번에 정의해 각 함수가 import 하도록 체계화한다. (메이크업은 대상 제외 — 요청.)
//
// 원칙: ① 정체성 고정(identity/faceLock)은 성별 무관 공통 골격 + 대명사만 분기 ② 헤어·예복 등
// 도메인 어휘만 성별별 목록 ③ role 미상/shared 는 신부 기본으로 폴백(기존 동작·회귀 0).

export type SubjectGender = "bride" | "groom";

/** user_wedding_settings.role(bride/groom/shared) → 이미지 주체. shared·미상은 신부 기본. */
export function genderFromRole(role: string | null | undefined): SubjectGender {
  return role === "groom" ? "groom" : "bride";
}

/** 요청 body 의 gender 문자열을 안전 파싱. 유효하지 않으면 신부 기본. */
export function parseGender(v: unknown): SubjectGender {
  return v === "groom" ? "groom" : "bride";
}

const P: Record<SubjectGender, { poss: string; noun: string; ko: string; portrait: string }> = {
  bride: { poss: "her", noun: "woman", ko: "신부", portrait: "clean beauty portrait" },
  groom: { poss: "his", noun: "man", ko: "신랑", portrait: "clean portrait" },
};

export const subjectNounEn = (g: SubjectGender): string => P[g].noun;
export const subjectNounKo = (g: SubjectGender): string => P[g].ko;

/** 정체성 고정(카메라 각도 포함) — grid/single 외 일반 생성용. 대명사만 성별 분기. */
export function identityLock(g: SubjectGender): string {
  const { poss, noun, portrait } = P[g];
  return (
    ` The face must remain UNMISTAKABLY the same ${noun} as the provided photo — reproduce ${poss} ` +
    "exact features: eyes (shape, size, slant, spacing, eyelid type: monolid/double, crease height), " +
    "eyebrows, nose (bridge height & width, tip, nostrils), lips (shape, fullness, philtrum), jawline, " +
    "chin, cheekbones, hairline, face length-to-width ratio, skin texture & tone, and any moles/freckles. " +
    "Do NOT beautify, slim, enlarge eyes, change age, or average toward a generic face. Same camera angle, soft studio lighting and " +
    `framing, neutral natural expression, clean minimal background. ${portrait}, ` +
    "natural skin texture, no plastic skin, no over-smoothing, ultra-high realism, sharp " +
    "focus, professional portrait photography. Do not stylize or cartoonize. No text, no logos, no watermarks."
  );
}

/** 얼굴 정체성만 고정(카메라 각도 문구 제외) — 다각도(single 3뷰) 생성용. */
export function faceLock(g: SubjectGender): string {
  const { poss, noun } = P[g];
  return (
    ` Keep the face UNMISTAKABLY the same ${noun} as the provided photo in every view where the face ` +
    `is visible — reproduce ${poss} exact eyes (shape, size, slant, spacing, eyelid type), eyebrows, nose ` +
    "(bridge, tip, nostrils), lips (shape, fullness), jawline, chin, cheekbones, hairline, face proportions " +
    "and skin tone; do NOT beautify, enlarge eyes, or change age. " +
    "Natural skin texture, no plastic skin, ultra-high realism, sharp focus, soft studio " +
    "lighting, clean minimal light-gray background. Do not stylize or cartoonize. No text, no logos, no watermarks."
  );
}

// ── 헤어 어휘(성별별) ──────────────────────────────────────────────────────────
const HAIR: Record<SubjectGender, string[]> = {
  bride: [
    "loose natural waves", "soft beach curls", "sleek straight hair", "high ponytail",
    "low ponytail", "messy bun", "high bun", "braided updo", "half-up half-down",
    "side-swept waves", "voluminous blowout", "low chignon", "face-framing layers",
    "slicked-back low bun", "romantic loose updo",
  ],
  groom: [
    "clean side part", "natural down perm", "slicked-back undercut", "textured crop",
    "comma-shaped fringe", "two-block cut", "soft natural down style", "middle-part fringe",
    "pompadour", "short quiff", "neat classic cut", "swept-back volume",
    "low fade", "textured side part", "natural loose fringe",
  ],
};
const HAIR_COLOR: Record<SubjectGender, string[]> = {
  bride: [
    "natural black", "dark brown", "chocolate brown", "light brown", "soft caramel",
    "warm honey blonde", "ash brown", "copper red", "platinum blonde", "rose brown",
    "cool dark ash", "golden brown",
  ],
  groom: [
    "natural black", "dark brown", "soft brown", "ash brown", "dark ash",
    "cool charcoal", "warm brown", "medium brown", "natural black-brown",
    "deep espresso", "muted ash brown", "soft dark grey",
  ],
};

export const hairCandidates = (g: SubjectGender): string[] => HAIR[g];
export const hairColorCandidates = (g: SubjectGender): string[] => HAIR_COLOR[g];

/** 헤어 9그리드(스타일) 프롬프트 — 성별 어휘 앞 9개 사용. */
export function hairStyleGrid(g: SubjectGender): string {
  const styles = HAIR[g].slice(0, 9).join(", ");
  return (
    "Generate a 3x3 grid (9 cells) of ultra-realistic portrait photos of the SAME person " +
    "with different hairstyles. Only change the hairstyle in each cell, keep perfect facial " +
    `consistency across all nine. Hairstyles: ${styles}.` + identityLock(g)
  );
}

/** 헤어 9그리드(컬러) 프롬프트. */
export function hairColorGrid(g: SubjectGender): string {
  const colors = HAIR_COLOR[g].slice(0, 9).join(", ");
  return (
    "Generate a 3x3 grid (9 cells) of ultra-realistic portrait photos of the SAME person " +
    "with different hair colors. Only change the hair color in each cell, keep perfect facial " +
    `consistency across all nine. Hair colors: ${colors}.` + identityLock(g)
  );
}

/** 헤어 추천(Gemini) 역할 프롬프트 — 성별별. */
export function hairRecommendRole(g: SubjectGender, kind: "style" | "color"): string {
  const ko = P[g].ko;
  if (kind === "color") {
    return `너는 웨딩 헤어컬러 전문가다. 사진 속 ${ko}의 피부 언더톤(웜/쿨/뉴트럴)·명도·퍼스널컬러를 분석해 가장 잘 어울리는 헤어 컬러를 고른다.`;
  }
  return `너는 웨딩 헤어 스타일리스트다. 사진 속 ${ko}의 얼굴형·이목구비·현재 헤어 길이를 분석해 가장 잘 어울리는 헤어스타일을 고른다.`;
}

/** OpenAI images/edits multipart 파일명(성별) — bride.png 하드코딩 제거용. */
export const subjectFileName = (g: SubjectGender): string => `${g}.png`;

// ── 예복/드레스 어휘(성별별) — dress·sdm 에서 사용 ──────────────────────────────
const ATTIRE: Record<SubjectGender, { en: string; ko: string }> = {
  bride: { en: "wedding dress (bridal gown)", ko: "웨딩드레스" },
  groom: { en: "wedding suit / tuxedo", ko: "예복(웨딩 수트·턱시도)" },
};
export const attireNounEn = (g: SubjectGender): string => ATTIRE[g].en;
export const attireNounKo = (g: SubjectGender): string => ATTIRE[g].ko;
