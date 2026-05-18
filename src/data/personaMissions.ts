// Daily missions tailored to the user's wedding_style. Surfaced on the home
// dashboard to give every user a small "what should I do today?" nudge —
// addresses the persona-simulation finding that light users (B3 장유진) and
// heavy users (C2 권나라) alike re-enter the app without a clear next move.
//
// Mission keys are used to track per-day completion in localStorage so the
// UI can render a check mark and (eventually) award points.

import type { WeddingStyle } from "@/lib/weddingStyle";

export interface PersonaMission {
  key: string;
  label: string;
  hint: string;
  emoji: string;
  /** Internal route the mission directs the user to. */
  href: string;
}

const COMMON: PersonaMission[] = [
  {
    key: "checklist-1",
    label: "오늘의 체크리스트 하나 완료",
    hint: "임박한 일정부터 차근차근",
    emoji: "✅",
    href: "/my-schedule",
  },
  {
    key: "ai-1",
    label: "AI 플래너에 질문 1개",
    hint: "막힌 부분을 자연어로 물어보세요",
    emoji: "💬",
    href: "/ai-planner",
  },
];

const STYLE_SPECIFIC: Record<WeddingStyle, PersonaMission[]> = {
  general: [
    {
      key: "budget-split",
      label: "양가 분담 시뮬레이션 돌려보기",
      hint: "지역 평균과 비교해 가족 안건 정리",
      emoji: "💰",
      href: "/budget/split-simulator",
    },
    {
      key: "venue-compare",
      label: "웨딩홀 후보 2곳 비교",
      hint: "찜한 베뉴를 나란히 놓고 결정",
      emoji: "🏛️",
      href: "/venues",
    },
  ],
  small: [
    {
      key: "small-venue",
      label: "소규모 베뉴 영감 둘러보기",
      hint: "한옥·하우스·카페형 큐레이션",
      emoji: "🌿",
      href: "/invitation-venues",
    },
    {
      key: "small-magazine",
      label: "스몰웨딩 매거진 한 편 읽기",
      hint: "답례품·웰컴키트 아이디어",
      emoji: "📖",
      href: "/magazine",
    },
  ],
  self: [
    {
      key: "self-magazine",
      label: "DIY 매거진 한 편 정독",
      hint: "셀프 촬영·부케·청첩장 노하우",
      emoji: "🎨",
      href: "/magazine",
    },
    {
      key: "self-fitting",
      label: "AI 드레스 피팅 시연",
      hint: "직접 가지 않고도 스타일을 미리 보기",
      emoji: "👗",
      href: "/ai-studio/dress-tour",
    },
  ],
  custom: [
    {
      key: "custom-checklist",
      label: "내 일정 한 번 정리하기",
      hint: "제외 카테고리를 다시 점검",
      emoji: "🛠️",
      href: "/my-schedule",
    },
  ],
};

// 임신 모드 — 일정 압박이 큰 페르소나라 "오늘 한 발자국" 단위를 다르게
// 보여준다. style mission 1개 자리를 임신 우선순위 미션으로 대체.
const PREGNANCY_MISSIONS: PersonaMission[] = [
  {
    key: "pregnancy-fitting",
    label: "임신 주수 고려해 드레스 가봉 확인",
    hint: "본식 2~3주 전 추가 가봉 + 사이즈 여유",
    emoji: "👰",
    href: "/my-schedule",
  },
  {
    key: "pregnancy-makeup",
    label: "임산부 가능 메이크업샵 알아보기",
    hint: "케라틴·블리치 회피 옵션 우선",
    emoji: "💄",
    href: "/ai-planner",
  },
];

const STYLE_INTRO: Record<WeddingStyle, { title: string; subtitle: string; accentEmoji: string }> = {
  general: {
    title: "오늘의 일반 결혼 준비",
    subtitle: "검증된 다음 액션 3가지",
    accentEmoji: "💍",
  },
  small: {
    title: "오늘의 스몰웨딩 큐레이션",
    subtitle: "감성을 채우는 영감과 미션",
    accentEmoji: "🌿",
  },
  self: {
    title: "오늘의 셀프웨딩 DIY",
    subtitle: "손맛 더하는 작은 미션",
    accentEmoji: "🎨",
  },
  custom: {
    title: "오늘의 맞춤 준비",
    subtitle: "내가 정한 카테고리 중심",
    accentEmoji: "🛠️",
  },
};

export function getMissionsForStyle(
  style: WeddingStyle | null | undefined,
  options: { pregnant?: boolean } = {},
): PersonaMission[] {
  const s = (style ?? "general") as WeddingStyle;
  const styleList = STYLE_SPECIFIC[s] ?? STYLE_SPECIFIC.general;
  // Cap at 3 to keep the dashboard glanceable. 임신이면 첫 자리를 가봉·
  // 메이크업 미션으로 대체 — 스타일 미션 + COMMON 보다 컨디션·시간 압박
  // 큰 페르소나라 우선순위 위에 둠.
  if (options.pregnant) {
    return [PREGNANCY_MISSIONS[0], styleList[0] ?? COMMON[0], PREGNANCY_MISSIONS[1]].filter(
      (m): m is PersonaMission => !!m,
    ).slice(0, 3);
  }
  return [...styleList, ...COMMON].slice(0, 3);
}

export function getStyleIntro(style: WeddingStyle | null | undefined) {
  const s = (style ?? "general") as WeddingStyle;
  return STYLE_INTRO[s] ?? STYLE_INTRO.general;
}

// Tracks today's completed mission keys in localStorage. We could store this
// in Supabase later for cross-device sync, but the missions are intentionally
// low-stakes (no real reward) so per-device state is fine for v1.
const MISSION_PROGRESS_KEY = "dewy:mission-progress";

interface MissionProgress {
  date: string;          // YYYY-MM-DD
  completedKeys: string[];
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export function loadMissionProgress(): MissionProgress {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(MISSION_PROGRESS_KEY);
    if (!raw) return { date: today, completedKeys: [] };
    const parsed = JSON.parse(raw);
    if (parsed?.date === today && Array.isArray(parsed?.completedKeys)) {
      return parsed as MissionProgress;
    }
  } catch {
    // fall through to reset
  }
  return { date: today, completedKeys: [] };
}

export function markMissionComplete(key: string): MissionProgress {
  const current = loadMissionProgress();
  if (current.completedKeys.includes(key)) return current;
  const next: MissionProgress = {
    date: current.date,
    completedKeys: [...current.completedKeys, key],
  };
  try {
    localStorage.setItem(MISSION_PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
