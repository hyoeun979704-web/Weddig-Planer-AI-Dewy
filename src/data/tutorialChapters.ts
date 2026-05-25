// New chapter-based tutorial structure. Replaces the flat FEATURE_GUIDES
// list — groups lessons into chapters so the Tutorial page can render a
// progress overview and the first-time welcome sheet can suggest where to
// start. Each lesson keeps the same `targetSelector` coachmark shape the
// existing TutorialOverlay already understands.
//
// Filtering (Round 18 — persona/role 분기 추가):
//   - `requiresStyles` : wedding_style 화이트리스트
//   - `requiresPersonas` : persona_mode 화이트리스트
//   - `excludePersonas` : persona_mode 블랙리스트 (예: 노식 사용자에게 호텔 가이드 X)
//   - `excludeRoles`    : role 블랙리스트 (예: 신랑 페르소나에게 신부 호칭 lesson X)
// 모두 매칭되어야 lesson 이 노출됨. 매칭 안 된 lesson 은 Tutorial 페이지의
// "내 스타일에 안 보이는 가이드" footer 에 collapsible 로 surface 됨.
//
// Placeholder lessons (Round 18):
//   `placeholder: true` 인 lesson 은 아직 페이지에 data-tutorial 셀렉터가
//   부착되지 않아 풀스크린 cutout 으로 의미 없는 안내가 뜨던 문제를 막기
//   위한 임시 차단. UI 는 "준비 중" 배지로 표시하고 자동 시작·클릭 모두 비활성.

import type { WeddingStyle } from "@/lib/weddingStyle";
import type { UserRole, WeddingPersonaMode } from "@/lib/weddingPersona";

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
  /** When set, lesson only shown for matching persona_mode. */
  requiresPersonas?: WeddingPersonaMode[];
  /** When set, lesson hidden for matching persona_mode (블랙리스트). */
  excludePersonas?: WeddingPersonaMode[];
  /** When set, lesson hidden for matching role (예: 신랑 전용 X 신부). */
  excludeRoles?: UserRole[];
  /** True 면 페이지에 아직 cutout target 셀렉터가 없는 lesson 으로 표시 — 자동
   *  시작/클릭 모두 차단되고 UI 는 "준비 중" 배지 노출. */
  placeholder?: boolean;
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

/** 톤 정정용: 노식·스냅 페르소나는 일반 결혼 가이드가 무가치 — 광역 블랙리스트. */
const NON_WEDDING_PERSONAS: WeddingPersonaMode[] = [
  "no_wedding_travel",
  "snap_only",
];

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
      title: "내 맞춤 대시보드",
      description:
        "입력한 정보를 바탕으로 D-Day · 진행률 · 다음 액션 · 오늘의 미션이 이 자리에 매일 새로 정렬돼요.",
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

const MYPAGE_TOUR: TutorialLesson = {
  id: "mypage",
  title: "마이페이지 둘러보기",
  description: "찜·하트·포인트와 내 정보를 한곳에서",
  route: "/mypage",
  reward: 20,
  steps: [
    {
      id: "mypage-quickmenu",
      title: "빠른 메뉴",
      description: "찜 · 하트 · 포인트 · 쿠폰 · 주문내역을 바로 확인할 수 있어요.",
      targetSelector: "[data-tutorial='mypage-quickmenu']",
      position: "bottom",
    },
    {
      id: "mypage-menu",
      title: "준비 메뉴",
      description:
        "내 정보 수정, 직접 만든 청첩장·시뮬레이션, 계정·고객지원을 여기서 관리해요.",
      targetSelector: "[data-tutorial='mypage-menu']",
      position: "top",
    },
  ],
};

const AI_PLANNER: TutorialLesson = {
  id: "ai-planner",
  title: "AI 플래너에게 질문하기",
  description: "준비 중 막힐 때 가장 먼저 가볼 곳",
  route: "/ai-planner",
  reward: 40,
  steps: [
    {
      id: "ai-header",
      title: "AI 웨딩플래너 Dewy",
      description: "내 스타일에 맞춰 첫 질문 카드가 자동으로 바뀌어요.",
      targetSelector: "[data-tutorial='ai-header']",
      position: "bottom",
    },
    {
      id: "ai-suggestions",
      title: "추천 질문 카드",
      description:
        "탭 한 번이면 모달이나 즉답 채팅으로 바로 연결돼요. 셀프 · 스몰 · 일반별로 다른 카드가 뜹니다.",
      targetSelector: "[data-tutorial='ai-suggestions']",
      position: "bottom",
    },
    {
      id: "ai-input",
      title: "자유 질문 입력",
      description: "예) “예산 1억 5천이면 어디까지 가능해?”",
      targetSelector: "[data-tutorial='ai-input']",
      position: "top",
    },
  ],
};

// Placeholder: AI 스튜디오 페이지에 아직 data-tutorial 셀렉터가 없어 'main'
// 풀스크린 cutout 만 떴음. 셀렉터 부착 전까지 placeholder 로 차단.
const AI_STUDIO: TutorialLesson = {
  id: "ai-studio",
  title: "AI로 드레스 미리 입어보기",
  description: "샵 투어 전에 분위기부터 잡고 가기",
  route: "/ai-studio",
  reward: 50,
  requiresStyles: ["general", "small", "self"],
  // 노식·스냅·노웨딩 페르소나는 드레스/메이크업 자체가 무의미 — 숨김.
  excludePersonas: [...NON_WEDDING_PERSONAS, "self_no_ceremony"],
  placeholder: true,
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
      title: "커플 연동 (선택)",
      description:
        "파트너를 초대하면 일정이 자동 동기화돼요. 혼자 진행하면 건너뛰셔도 됩니다.",
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
  description: "카테고리별 분배 · 분담 · 변경 이력",
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
      description: "다른 사용자의 후기와 글을 둘러보세요.",
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

// Placeholder: /couple-diary 페이지에 data-tutorial 셀렉터가 없어 main 풀스크린
// cutout 만 떴음. 또한 1인 진행·노식·스냅 사용자에겐 무의미.
const COUPLE_FLOW: TutorialLesson = {
  id: "couple",
  title: "커플로 함께 쓰기",
  description: "다이어리 · 투표 · 일정 공유",
  route: "/couple-diary",
  reward: 30,
  excludePersonas: [
    ...NON_WEDDING_PERSONAS,
    "single_household",
    "snap_only",
  ],
  placeholder: true,
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
  description: "안내서 · 견적서 · 스태프 가이드",
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
        "기본 정보만 입력하면 AI가 견적서와 예산 리포트를 자동 생성해요.",
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

// Placeholder: /tips 페이지에 셀렉터 없음.
const SELF_DIY: TutorialLesson = {
  id: "self-diy",
  title: "셀프웨딩 DIY 시작",
  description: "촬영 · 부케 · 청첩장을 직접 만드는 길잡이",
  route: "/tips",
  reward: 30,
  requiresStyles: ["self"],
  placeholder: true,
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

// Round 18 — 페르소나 특화 추가 lesson.
// 재혼(P3) — 일반 결혼 가이드 무가치 페르소나. 작고 따뜻한 가족식 톤.
const REMARRIAGE_FAMILY: TutorialLesson = {
  id: "remarriage-family",
  title: "간소한 가족식 진행 가이드",
  description: "양가 톤 다운 · 자녀 동반 · 작은 식 순서",
  route: "/tips",
  reward: 30,
  requiresPersonas: ["remarriage"],
  placeholder: true,
  steps: [
    {
      id: "remarriage-overview",
      title: "재혼 가족식 가이드",
      description:
        "공식 식순 없이 가족과 함께 진행하는 시나리오·자녀 동반 케이스를 모아두었어요.",
      targetSelector: "main",
      position: "bottom",
    },
  ],
};

// 노식·스냅 (P5 snap_only) — 일반 결혼 흐름 대신 셀프 촬영 흐름.
const SNAP_FLOW: TutorialLesson = {
  id: "snap-flow",
  title: "셀프 촬영 흐름 잡기",
  description: "콘셉트별 작가 매칭 · 라이프 스타일 패키지",
  route: "/ai-planner",
  reward: 30,
  requiresPersonas: ["snap_only", "self_no_ceremony"],
  placeholder: true,
  steps: [
    {
      id: "snap-overview",
      title: "셀프 촬영 가이드",
      description:
        "콘셉트·로케이션·작가 매칭 흐름을 AI 플래너에서 바로 시작할 수 있어요.",
      targetSelector: "main",
      position: "bottom",
    },
  ],
};

// 신랑 주도 (P10 standard_groom) — 신부 호칭 lesson 과 분리.
const GROOM_TASKS: TutorialLesson = {
  id: "groom-tasks",
  title: "신랑이 챙길 일",
  description: "예복 · 예물 · 양가 인사 분담",
  route: "/ai-planner",
  reward: 30,
  excludeRoles: ["bride"],
  // 신랑 주도 페르소나만 노출. (role=shared 사용자도 보고 싶을 수 있어
  // requiresRoles 가 아닌 excludeRoles 로 분리.)
  placeholder: true,
  steps: [
    {
      id: "groom-overview",
      title: "신랑 체크리스트",
      description:
        "신랑 주도 페르소나용 예복·예물·신랑 양가 가이드를 모아두었어요.",
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
    icon: "",
    title: "기초 둘러보기",
    subtitle: "Dewy의 첫인상을 잡는 시간",
    accent: "rose",
    lessons: [HOME_TOUR, MYPAGE_TOUR],
  },
  {
    id: "ai",
    icon: "",
    title: "AI 도구 활용",
    subtitle: "막힐 때 가장 빠른 답을 얻는 법",
    accent: "violet",
    lessons: [AI_PLANNER, AI_STUDIO],
  },
  {
    id: "plan",
    icon: "",
    title: "예산 · 일정 관리",
    subtitle: "준비의 핵심 도구 두 가지",
    accent: "emerald",
    lessons: [BUDGET_FLOW, SCHEDULE_FLOW],
  },
  {
    id: "social",
    icon: "",
    title: "커뮤니티 · 커플",
    subtitle: "혼자가 아니라 함께",
    accent: "sky",
    lessons: [COMMUNITY, COUPLE_FLOW],
  },
  {
    id: "advanced",
    icon: "",
    title: "프리미엄 · 특화",
    subtitle: "결혼 직전 도구와 스타일 특화 레슨",
    accent: "amber",
    lessons: [PREMIUM_PDF, SELF_DIY],
  },
  {
    id: "persona",
    icon: "",
    title: "내 페르소나용 가이드",
    subtitle: "재혼 · 스냅 · 신랑 주도 등 특화 안내",
    accent: "amber",
    lessons: [REMARRIAGE_FAMILY, SNAP_FLOW, GROOM_TASKS],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** 사용자 컨텍스트 — chaptersForUser 가 받는 매칭 신호 묶음. */
export interface TutorialUserContext {
  style?: WeddingStyle | null;
  persona?: WeddingPersonaMode | null;
  role?: UserRole | null;
}

/** 단일 lesson 이 사용자에게 보여져야 하는지 판단. 모든 필터가 OR-of-AND:
 *  requires* 가 있으면 해당 차원에서 화이트리스트 매치 필수,
 *  exclude* 가 있으면 블랙리스트 매치 시 차단. */
export function isLessonVisible(
  lesson: TutorialLesson,
  ctx: TutorialUserContext,
): boolean {
  if (lesson.requiresStyles && ctx.style && !lesson.requiresStyles.includes(ctx.style)) {
    return false;
  }
  if (lesson.requiresPersonas && ctx.persona && !lesson.requiresPersonas.includes(ctx.persona)) {
    return false;
  }
  // requires* 가 있는데 ctx 값이 null 이면 화이트리스트 매치 불가 — 숨김.
  if (lesson.requiresPersonas && !ctx.persona) return false;
  if (lesson.excludePersonas && ctx.persona && lesson.excludePersonas.includes(ctx.persona)) {
    return false;
  }
  if (lesson.excludeRoles && ctx.role && lesson.excludeRoles.includes(ctx.role)) {
    return false;
  }
  return true;
}

/** Filter lessons by wedding_style, dropping irrelevant ones.
 *  Legacy helper — 새 코드는 chaptersForUser 사용 권장. */
export function filterLessonsByStyle(
  lessons: TutorialLesson[],
  style: WeddingStyle | null | undefined,
): TutorialLesson[] {
  if (!style) return lessons.filter((l) => !l.requiresPersonas);
  return lessons.filter((l) => isLessonVisible(l, { style }));
}

/** Get visible chapters for the given style only. Chapters with zero remaining
 *  lessons after filter are dropped entirely. Legacy — chaptersForUser 권장. */
export function chaptersForStyle(
  style: WeddingStyle | null | undefined,
): TutorialChapter[] {
  return chaptersForUser({ style });
}

/** Round 18 — style + persona + role 통합 필터. excludeRoles/excludePersonas 도 검사. */
export function chaptersForUser(ctx: TutorialUserContext): TutorialChapter[] {
  return TUTORIAL_CHAPTERS
    .map((ch) => ({
      ...ch,
      lessons: ch.lessons.filter((l) => isLessonVisible(l, ctx)),
    }))
    .filter((ch) => ch.lessons.length > 0);
}

/** Total visible lessons across all chapters for the given style. */
export function totalLessonCountForStyle(style: WeddingStyle | null | undefined): number {
  return chaptersForStyle(style).reduce((sum, ch) => sum + ch.lessons.length, 0);
}

/** Round 18 — user 컨텍스트 기반 lesson 총합. placeholder lesson 도 포함
 *  (사용자에게 가이드 개수는 보이지만 클릭은 막힘). */
export function totalLessonCountForUser(ctx: TutorialUserContext): number {
  return chaptersForUser(ctx).reduce((sum, ch) => sum + ch.lessons.length, 0);
}

/** Round 18 — 자동 시작 가능한 lesson (placeholder 제외) 의 첫 번째 진입점.
 *  Welcome sheet 의 '30초 둘러보기' CTA 가 약속하는 lesson 을 결정한다. */
export function firstStartableLessonForUser(
  ctx: TutorialUserContext,
): { chapter: TutorialChapter; lesson: TutorialLesson } | null {
  for (const ch of chaptersForUser(ctx)) {
    for (const l of ch.lessons) {
      if (!l.placeholder) return { chapter: ch, lesson: l };
    }
  }
  return null;
}

/** Find a lesson by id (across all chapters, ignoring filters). */
export function findLessonById(id: string): TutorialLesson | undefined {
  for (const ch of TUTORIAL_CHAPTERS) {
    const found = ch.lessons.find((l) => l.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Find the chapter a lesson belongs to. */
export function findChapterByLessonId(lessonId: string): TutorialChapter | undefined {
  return TUTORIAL_CHAPTERS.find((ch) => ch.lessons.some((l) => l.id === lessonId));
}
