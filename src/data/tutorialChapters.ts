// New chapter-based tutorial structure. Replaces the flat FEATURE_GUIDES
// list — groups lessons into chapters so the Tutorial page can render a
// progress overview and the first-time welcome sheet can suggest where to
// start. Each lesson keeps the same `targetSelector` coachmark shape the
// existing TutorialOverlay already understands.
//
// Style filtering: when `requiresStyles` is set, the lesson is hidden for
// users whose wedding_style isn't in the list. e.g. SDM lessons skip self,
// 한복 lessons skip self/small. The lesson is still discoverable manually
// via the Tutorial page footer ("내 스타일에 안 보이는 가이드 보기").

import type { WeddingStyle } from "@/lib/weddingStyle";

export interface TutorialLessonStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: "top" | "bottom" | "left" | "right";
}

export interface TutorialLesson {
  id: string;
  title: string;
  description: string;
  /** Page route to navigate to before starting this lesson. */
  route: string;
  /** Number of points awarded on first-time completion. */
  reward: number;
  /** When set, lesson only shown for matching wedding_style. */
  requiresStyles?: WeddingStyle[];
  steps: TutorialLessonStep[];
}

export interface TutorialChapter {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  /** Visual accent class for the chapter card. */
  accent: "rose" | "amber" | "emerald" | "violet" | "sky";
  lessons: TutorialLesson[];
}

// ─────────────────────────────────────────────────────────────────────────
// Lessons
// ─────────────────────────────────────────────────────────────────────────

const HOME_TOUR: TutorialLesson = {
  id: "home-tour",
  title: "홈 화면 둘러보기",
  description: "Dewy를 어디서부터 시작할지 한눈에",
  route: "/",
  reward: 30,
  steps: [
    {
      id: "home-dashboard",
      title: "내 결혼 스타일 대시보드",
      description:
        "결혼 스타일에 따라 D-Day · 진행률 · 다음 액션 · 오늘의 미션이 매일 새로 정렬돼요.",
      targetSelector: "[data-tutorial='persona-dashboard']",
      position: "bottom",
    },
    {
      id: "home-category-tab",
      title: "카테고리 탭",
      description:
        "AI 플래너 · AI 스튜디오 · 꿀팁 · 이벤트 · 쇼핑을 좌우로 전환할 수 있어요.",
      targetSelector: "[data-tutorial='category-tab']",
      position: "bottom",
    },
    {
      id: "home-categories",
      title: "웨딩 서비스 카테고리",
      description:
        "웨딩홀 · 스드메 · 예복 · 한복 · 청첩장 · 예물 · 신혼여행을 빠르게 진입할 수 있어요.",
      targetSelector: "[data-tutorial='home-categories']",
      position: "top",
    },
    {
      id: "home-bottom-nav",
      title: "하단 네비게이션",
      description:
        "스케줄 · 예산 · 홈 · 커뮤니티 · 마이페이지로 언제든 빠르게 이동할 수 있어요.",
      targetSelector: "[data-tutorial='nav-home']",
      position: "top",
    },
  ],
};

const AI_PLANNER: TutorialLesson = {
  id: "ai-planner",
  title: "AI 플래너에게 질문하기",
  description: "결혼 준비 중 막힐 때 가장 먼저 가볼 곳",
  route: "/ai-planner",
  reward: 40,
  steps: [
    {
      id: "ai-header",
      title: "AI 웨딩플래너 Dewy",
      description: "결혼 스타일에 맞춰 첫 질문 카드가 자동으로 바뀌어요.",
      targetSelector: "[data-tutorial='ai-header']",
      position: "bottom",
    },
    {
      id: "ai-suggestions",
      title: "추천 질문 카드",
      description:
        "탭 한 번이면 모달이나 즉답 채팅으로 바로 연결돼요. 셀프 · 스몰 · 일반 결혼식별로 다른 카드가 뜹니다.",
      targetSelector: "[data-tutorial='ai-suggestions']",
      position: "bottom",
    },
    {
      id: "ai-input",
      title: "자유 질문 입력",
      description: "예) “양가 1억 5천 예산이면 어디까지 가능해?”",
      targetSelector: "[data-tutorial='ai-input']",
      position: "top",
    },
  ],
};

const AI_STUDIO: TutorialLesson = {
  id: "ai-studio",
  title: "AI로 드레스 미리 입어보기",
  description: "샵 투어 전에 분위기부터 잡고 가기",
  route: "/ai-studio",
  reward: 50,
  requiresStyles: ["general", "small", "self"],
  steps: [
    {
      id: "studio-entry",
      title: "AI 스튜디오 입구",
      description:
        "드레스 피팅 · 메이크업 시뮬레이션이 여기서 시작돼요.",
      targetSelector: "main",
      position: "bottom",
    },
  ],
};

const SCHEDULE_FLOW: TutorialLesson = {
  id: "schedule",
  title: "체크리스트로 일정 관리",
  description: "D-Day 기반 자동 추천 일정 + 직접 추가",
  route: "/schedule",
  reward: 30,
  steps: [
    {
      id: "schedule-dday",
      title: "D-Day 카드",
      description: "결혼식까지 남은 일수와 전체 진행률이 한눈에 보여요.",
      targetSelector: "[data-tutorial='schedule-dday']",
      position: "bottom",
    },
    {
      id: "schedule-timeline",
      title: "단계별 타임라인",
      description: "기간별 체크리스트를 카테고리로 나눠서 관리해요.",
      targetSelector: "[data-tutorial='schedule-timeline']",
      position: "top",
    },
    {
      id: "schedule-couple",
      title: "커플 연동",
      description: "파트너를 초대하면 일정이 자동 동기화돼요.",
      targetSelector: "[data-tutorial='schedule-couple']",
      position: "top",
    },
    {
      id: "schedule-add",
      title: "일정 추가",
      description: "오른쪽 상단 버튼으로 개인 일정을 직접 넣을 수 있어요.",
      targetSelector: "[data-tutorial='schedule-add']",
      position: "bottom",
    },
  ],
};

const BUDGET_FLOW: TutorialLesson = {
  id: "budget",
  title: "예산 한눈에 정리",
  description: "카테고리별 분배 · 양가 분담 · 변경 이력",
  route: "/budget",
  reward: 30,
  steps: [
    {
      id: "budget-summary",
      title: "예산 요약",
      description: "총 예산 대비 사용 현황이 카드 하나에 모여 있어요.",
      targetSelector: "[data-tutorial='budget-summary']",
      position: "bottom",
    },
    {
      id: "budget-categories",
      title: "카테고리별 현황",
      description:
        "웨딩홀 · 스드메 · 예복 · 한복 등 카테고리별 예산과 지출을 비교해요.",
      targetSelector: "[data-tutorial='budget-categories']",
      position: "top",
    },
    {
      id: "budget-add",
      title: "지출 추가",
      description: "+ 버튼으로 새 지출을 빠르게 기록할 수 있어요.",
      targetSelector: "[data-tutorial='budget-add']",
      position: "top",
    },
    {
      id: "budget-settings",
      title: "예산 설정",
      description: "총 예산과 지역을 바꾸면 평균 비교 기준이 함께 바뀌어요.",
      targetSelector: "[data-tutorial='budget-settings']",
      position: "bottom",
    },
  ],
};

const COMMUNITY: TutorialLesson = {
  id: "community",
  title: "커뮤니티로 묻고 답하기",
  description: "후기 · 정보 · 꿀팁 공유",
  route: "/community",
  reward: 20,
  steps: [
    {
      id: "community-header",
      title: "커뮤니티 홈",
      description: "다른 예비 신혼부부의 글을 둘러보세요.",
      targetSelector: "[data-tutorial='community-header']",
      position: "bottom",
    },
    {
      id: "community-categories",
      title: "카테고리 필터",
      description: "관심 분야로 글을 좁혀 볼 수 있어요.",
      targetSelector: "[data-tutorial='community-categories']",
      position: "bottom",
    },
    {
      id: "community-write",
      title: "글 작성",
      description: "오른쪽 상단 펜 아이콘으로 후기 · 질문을 올려보세요.",
      targetSelector: "[data-tutorial='community-write']",
      position: "bottom",
    },
  ],
};

const COUPLE_FLOW: TutorialLesson = {
  id: "couple",
  title: "커플로 함께 쓰기",
  description: "다이어리 · 투표 · 일정 공유",
  route: "/couple-diary",
  reward: 30,
  steps: [
    {
      id: "couple-entry",
      title: "커플 다이어리 입구",
      description: "파트너와 함께 일기를 남기고, 투표로 안건을 정리해요.",
      targetSelector: "main",
      position: "bottom",
    },
  ],
};

const PREMIUM_PDF: TutorialLesson = {
  id: "premium",
  title: "프리미엄 PDF 도구",
  description: "양가 안내서 · 견적서 · 스태프 가이드",
  route: "/premium/content",
  reward: 40,
  steps: [
    {
      id: "premium-header",
      title: "프리미엄 콘텐츠",
      description:
        "AI 견적서 · 예산 리포트 · 본식 타임라인 PDF를 한 곳에서 만들 수 있어요.",
      targetSelector: "[data-tutorial='premium-header']",
      position: "bottom",
    },
    {
      id: "premium-reports",
      title: "AI 리포트",
      description:
        "결혼 정보만 입력하면 AI가 견적서와 예산 리포트를 자동 생성해요.",
      targetSelector: "[data-tutorial='premium-reports']",
      position: "bottom",
    },
    {
      id: "premium-guides",
      title: "당일용 PDF",
      description: "본식·스냅·스태프 안내서를 결혼 직전에 만들어 전달하세요.",
      targetSelector: "[data-tutorial='premium-guides']",
      position: "bottom",
    },
  ],
};

// Self-wedding focused lesson (no SDM/dress/makeup vendors).
const SELF_DIY: TutorialLesson = {
  id: "self-diy",
  title: "셀프웨딩 DIY 시작",
  description: "촬영 · 부케 · 청첩장을 직접 만드는 길잡이",
  route: "/magazine",
  reward: 30,
  requiresStyles: ["self"],
  steps: [
    {
      id: "self-magazine",
      title: "DIY 매거진",
      description:
        "셀프촬영 로케이션 · DIY 부케 · 직접 만드는 청첩장 가이드를 모아두었어요.",
      targetSelector: "main",
      position: "bottom",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Chapters
// ─────────────────────────────────────────────────────────────────────────

export const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: "basics",
    icon: "🌸",
    title: "기초 둘러보기",
    subtitle: "Dewy의 첫인상을 잡는 시간",
    accent: "rose",
    lessons: [HOME_TOUR],
  },
  {
    id: "ai",
    icon: "✨",
    title: "AI 도구 활용",
    subtitle: "막힐 때 가장 빠른 답을 얻는 법",
    accent: "violet",
    lessons: [AI_PLANNER, AI_STUDIO],
  },
  {
    id: "plan",
    icon: "📅",
    title: "예산 · 일정 관리",
    subtitle: "준비의 핵심 도구 두 가지",
    accent: "emerald",
    lessons: [BUDGET_FLOW, SCHEDULE_FLOW],
  },
  {
    id: "social",
    icon: "💬",
    title: "커뮤니티 · 커플",
    subtitle: "혼자가 아니라 함께",
    accent: "sky",
    lessons: [COMMUNITY, COUPLE_FLOW],
  },
  {
    id: "advanced",
    icon: "💎",
    title: "프리미엄 · 특화",
    subtitle: "결혼 직전 도구와 스타일 특화 레슨",
    accent: "amber",
    lessons: [PREMIUM_PDF, SELF_DIY],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Filter lessons by wedding_style, dropping irrelevant ones. */
export function filterLessonsByStyle(
  lessons: TutorialLesson[],
  style: WeddingStyle | null | undefined
): TutorialLesson[] {
  if (!style) return lessons;
  return lessons.filter(l => !l.requiresStyles || l.requiresStyles.includes(style));
}

/** Get visible chapters for the given style. Chapters with zero remaining
 *  lessons after filter are dropped entirely. */
export function chaptersForStyle(
  style: WeddingStyle | null | undefined
): TutorialChapter[] {
  return TUTORIAL_CHAPTERS
    .map(ch => ({ ...ch, lessons: filterLessonsByStyle(ch.lessons, style) }))
    .filter(ch => ch.lessons.length > 0);
}

/** Total visible lessons across all chapters for the given style. */
export function totalLessonCountForStyle(style: WeddingStyle | null | undefined): number {
  return chaptersForStyle(style).reduce((sum, ch) => sum + ch.lessons.length, 0);
}

/** Find a lesson by id (across all chapters, ignoring style filter). */
export function findLessonById(id: string): TutorialLesson | undefined {
  for (const ch of TUTORIAL_CHAPTERS) {
    const found = ch.lessons.find(l => l.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Find the chapter a lesson belongs to. */
export function findChapterByLessonId(lessonId: string): TutorialChapter | undefined {
  return TUTORIAL_CHAPTERS.find(ch => ch.lessons.some(l => l.id === lessonId));
}
