// 초보용 취향 미니퀴즈 — "아직 모르겠어요" 사용자가 사진 없이도 2~3문항으로 자기
// 취향(무드 태그)을 도출하게 한다. 설계: docs/260616_reference_matching_design.md §4.1.
// 결과 무드 태그는 필터·레퍼런스 매칭·포폴 태그와 동일 통제어휘(§3.6) — DRY.
// 순수 함수(같은 답=같은 결과). 비전/임베딩 불필요(Phase 0).

// 무드 어휘 단일 소스 = tasteTaxonomy. 기존 import 호환을 위해 MoodTag 를 그대로 재노출한다.
import type { MoodTag } from "./tasteTaxonomy";
export type { MoodTag } from "./tasteTaxonomy";

export interface QuizOption {
  id: string;
  label: string;
  tags: MoodTag[];
}
export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

// 카테고리 무관 "전역 무드" 진단(§4.1: 1회 진단 → 카테고리 상속).
export const TASTE_QUIZ: QuizQuestion[] = [
  {
    id: "vibe",
    question: "결혼식 전체 분위기는 어느 쪽이 끌리나요?",
    options: [
      { id: "vibe_grand", label: "화려하고 풍성하게", tags: ["볼드", "클래식"] },
      { id: "vibe_simple", label: "심플하고 깔끔하게", tags: ["미니멀", "모던"] },
      { id: "vibe_elegant", label: "우아하고 클래식하게", tags: ["클래식"] },
      { id: "vibe_trendy", label: "트렌디하고 감각적으로", tags: ["모던", "로맨틱"] },
    ],
  },
  {
    id: "color",
    question: "색감은 어떤 톤이 좋으세요?",
    options: [
      { id: "color_white", label: "화이트·뉴트럴", tags: ["미니멀", "모던"] },
      { id: "color_pastel", label: "파스텔·로맨틱", tags: ["로맨틱"] },
      { id: "color_deep", label: "딥·볼드 컬러", tags: ["볼드"] },
      { id: "color_warm", label: "웜·빈티지", tags: ["빈티지", "클래식"] },
    ],
  },
  {
    id: "detail",
    question: "디테일은 어떤 게 마음에 드세요?",
    options: [
      { id: "detail_lace", label: "레이스·자수 디테일", tags: ["로맨틱", "빈티지"] },
      { id: "detail_clean", label: "매끈하고 미니멀", tags: ["미니멀", "모던"] },
      { id: "detail_classic", label: "정통 클래식 실루엣", tags: ["클래식"] },
      { id: "detail_statement", label: "과감한 포인트", tags: ["볼드"] },
    ],
  },
];

const OPTION_BY_ID = new Map<string, QuizOption>(
  TASTE_QUIZ.flatMap((q) => q.options).map((o) => [o.id, o]),
);

/**
 * 선택한 옵션 id 들 → 무드 태그(빈도 내림차순, 동점은 첫 등장 순서). 잘못된 id 는 무시.
 * 답이 없으면 빈 배열(회귀 없음 — 매칭이 0점 처리).
 */
export function scoreTaste(optionIds: string[]): MoodTag[] {
  const count = new Map<MoodTag, number>();
  const firstSeen = new Map<MoodTag, number>();
  let order = 0;
  for (const id of optionIds) {
    const opt = OPTION_BY_ID.get(id);
    if (!opt) continue;
    for (const t of opt.tags) {
      count.set(t, (count.get(t) ?? 0) + 1);
      if (!firstSeen.has(t)) firstSeen.set(t, order++);
    }
  }
  return [...count.keys()].sort(
    (a, b) => (count.get(b)! - count.get(a)!) || (firstSeen.get(a)! - firstSeen.get(b)!),
  );
}

const STORAGE_KEY = "dewy_taste_tags";

// localStorage 영속(Phase 0 — DB user_taste_profiles 영속은 후속). 안전 가드.
export function saveTasteTags(tags: MoodTag[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    /* storage 불가 환경 무시 */
  }
}

export function loadTasteTags(): MoodTag[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MoodTag[]) : [];
  } catch {
    return [];
  }
}
