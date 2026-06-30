// 취향(무드) 택소노미 — 공급자 태깅·소비자 콜드스타트·추천 매칭이 보는 **단일 통제어휘**.
// 설계: docs/260629_partner_app_master_plan.md §5. 드리프트 차단이 목적 — 무드 값은
// 여기 한 곳에서만 정의하고, tasteQuiz·BusinessGallery 피커·매칭이 전부 import 한다.
//
// 점진적 고도화 원칙(사용자 확정): 새 어휘를 발명하지 않고 **기존 tasteQuiz.MoodTag 6개를
// 그대로 승격**해 연결만 한다(동작 변화 0). 세밀축(공간/컬러)은 후속 증분에서 추가.

/** 매칭 1차 축 — 무드 6개(거친 교집합으로 매칭 밀도 보장). 순서 = 표시 순서. */
export const MOOD_TAGS = ["클래식", "모던", "로맨틱", "빈티지", "미니멀", "볼드"] as const;

export type MoodTag = (typeof MOOD_TAGS)[number];

const MOOD_SET: ReadonlySet<string> = new Set(MOOD_TAGS);

/** 정식 무드 값인지 — 자유텍스트/외부 입력 검증용(타입 가드). */
export function isMoodTag(value: unknown): value is MoodTag {
  return typeof value === "string" && MOOD_SET.has(value);
}

// 기존 자유텍스트 style_tags 를 무드로 정규화하기 위한 **보수적** 동의어 표.
// 확실한 매칭만 매핑하고, 모호하면 매핑하지 않는다(오태깅 < 무태깅). 소문자·공백제거 후 비교.
// (회귀 방지: label vs value — 표시 문구가 아니라 매칭 키를 정확히 맞춘다.)
const MOOD_SYNONYMS: Record<MoodTag, readonly string[]> = {
  클래식: ["클래식", "classic", "정통", "엘레강스", "elegant", "우아"],
  모던: ["모던", "modern", "심플", "simple", "트렌디", "트렌디한", "세련", "감각적"],
  로맨틱: ["로맨틱", "romantic", "러블리", "lovely", "파스텔", "사랑스러운"],
  빈티지: ["빈티지", "vintage", "레트로", "retro", "앤틱", "antique", "웜"],
  미니멀: ["미니멀", "minimal", "미니멀리즘", "깔끔", "내추럴", "natural", "클린", "clean"],
  볼드: ["볼드", "bold", "과감", "화려", "드라마틱", "dramatic", "statement", "포인트"],
};

const NORMALIZE_LOOKUP: ReadonlyMap<string, MoodTag> = new Map(
  (Object.entries(MOOD_SYNONYMS) as [MoodTag, readonly string[]][]).flatMap(
    ([mood, words]) => words.map((w) => [w.replace(/\s+/g, "").toLowerCase(), mood] as const),
  ),
);

/**
 * 자유텍스트 태그 1개 → 무드(확실할 때만), 아니면 null. 기존 free-text style_tags 정규화 배치용.
 * 이미 정식 무드면 그대로, 동의어면 매핑, 모호하면 null(무태깅 유지가 오태깅보다 안전).
 */
export function normalizeToMood(raw: string | null | undefined): MoodTag | null {
  if (!raw) return null;
  const key = raw.replace(/\s+/g, "").toLowerCase();
  if (!key) return null;
  return NORMALIZE_LOOKUP.get(key) ?? null;
}

/**
 * 자유텍스트 태그 배열 → 무드 배열(중복 제거, 입력 순서 보존). 매핑 실패분은 버린다.
 * 공급자 갤러리·정규화 배치에서 기존 태그를 통제어휘로 변환할 때 사용.
 */
export function normalizeTagsToMoods(tags: readonly string[]): MoodTag[] {
  const out: MoodTag[] = [];
  for (const t of tags) {
    const m = normalizeToMood(t);
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}
