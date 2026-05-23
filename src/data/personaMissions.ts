// Daily missions tailored to the user's wedding_style. Surfaced on the home
// dashboard to give every user a small "what should I do today?" nudge —
// addresses the persona-simulation finding that light users (B3 장유진) and
// heavy users (C2 권나라) alike re-enter the app without a clear next move.
//
// Mission keys are used to track per-day completion in localStorage so the
// UI can render a check mark and (eventually) award points.

import type { WeddingStyle } from "@/lib/weddingStyle";
import type { PregnancyTrimester } from "@/lib/pregnancy";
import type { WeddingPersonaMode } from "@/lib/weddingPersona";

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
    emoji: "",
    href: "/my-schedule",
  },
  {
    key: "ai-1",
    label: "AI 플래너에 질문 1개",
    hint: "막힌 부분을 자연어로 물어보세요",
    emoji: "",
    href: "/ai-planner",
  },
];

const STYLE_SPECIFIC: Record<WeddingStyle, PersonaMission[]> = {
  general: [
    {
      key: "budget-split",
      label: "양가 분담 시뮬레이션 돌려보기",
      hint: "지역 평균과 비교해 가족 안건 정리",
      emoji: "",
      href: "/budget/split-simulator",
    },
    {
      key: "venue-compare",
      label: "웨딩홀 후보 2곳 비교",
      hint: "찜한 베뉴를 나란히 놓고 결정",
      emoji: "",
      href: "/venues",
    },
  ],
  small: [
    {
      key: "small-venue",
      label: "소규모 베뉴 영감 둘러보기",
      hint: "한옥·하우스·카페형 큐레이션",
      emoji: "",
      href: "/invitation-venues",
    },
    {
      key: "small-magazine",
      label: "스몰웨딩 매거진 한 편 읽기",
      hint: "답례품·웰컴키트 아이디어",
      emoji: "",
      href: "/magazine",
    },
  ],
  self: [
    {
      key: "self-magazine",
      label: "DIY 매거진 한 편 정독",
      hint: "셀프 촬영·부케·청첩장 노하우",
      emoji: "",
      href: "/magazine",
    },
    {
      key: "self-fitting",
      label: "AI 드레스 피팅 시연",
      hint: "직접 가지 않고도 스타일을 미리 보기",
      emoji: "",
      href: "/ai-studio/dress-tour",
    },
  ],
  custom: [
    {
      key: "custom-checklist",
      label: "내 일정 한 번 정리하기",
      hint: "제외 카테고리를 다시 점검",
      emoji: "",
      href: "/my-schedule",
    },
  ],
};

// 임신 모드 — 일정 압박이 큰 페르소나라 "오늘 한 발자국" 단위를 다르게.
// 차수별로 우선순위가 달라진다:
//   1st: 입덧·정보 탐색 단계. 메이크업샵 사전 조사·산부인과 협의 우선.
//   2nd: 안정기. 가봉·촬영을 본격 진행 — 일정 정합성 점검.
//   3rd: 컨디션·동선 부담. 본식 직전 가봉·당일 편의·신혼여행 단거리.
const PREGNANCY_MISSIONS_FIRST: PersonaMission[] = [
  {
    key: "pregnancy-ob-consult",
    label: "산부인과에 본식 컨디션 미리 상의",
    hint: "초기 안정·입덧 관리 가이드",
    emoji: "",
    href: "/ai-planner",
  },
  {
    key: "pregnancy-makeup",
    label: "임산부 가능 메이크업샵 알아보기",
    hint: "케라틴·블리치 회피 옵션 우선",
    emoji: "",
    href: "/ai-planner",
  },
];

const PREGNANCY_MISSIONS_SECOND: PersonaMission[] = [
  {
    key: "pregnancy-fitting",
    label: "임신 주수 고려해 드레스 가봉 확인",
    hint: "본식 2~3주 전 추가 가봉 + 사이즈 여유",
    emoji: "",
    href: "/my-schedule",
  },
  {
    key: "pregnancy-shoot",
    label: "본식 촬영 일정·동선 사전 점검",
    hint: "체력 부담 적게 시간대 조율",
    emoji: "",
    href: "/my-schedule",
  },
];

const PREGNANCY_MISSIONS_THIRD: PersonaMission[] = [
  {
    key: "pregnancy-shortdistance",
    label: "신혼여행 단거리·연기 옵션 검토",
    hint: "임신 후기 항공 제약 사전 대응",
    emoji: "",
    href: "/honeymoon",
  },
  {
    key: "pregnancy-comfort",
    label: "본식 당일 의자·간식·낮은 굽 준비",
    hint: "대기 동선 컨디션 보호",
    emoji: "",
    href: "/my-schedule",
  },
];

const PREGNANCY_MISSIONS_BY_TRIMESTER: Record<PregnancyTrimester, PersonaMission[]> = {
  first: PREGNANCY_MISSIONS_FIRST,
  second: PREGNANCY_MISSIONS_SECOND,
  third: PREGNANCY_MISSIONS_THIRD,
};

// 페르소나 모드별 미션 — 일반 wedding_style 분기로 부족한 비표준 페르소나
// (재혼·신랑·해외·국제·1인진행·노식·스냅 등)의 첫 액션을 보강한다.
// 페르소나가 standard_bride/small_intimate 등 wedding_style 위에 1:1로
// 매핑되는 경우는 STYLE_SPECIFIC 폴백을 그대로 쓰고 여기엔 안 적는다.
const PERSONA_SPECIFIC: Partial<Record<WeddingPersonaMode, PersonaMission[]>> = {
  standard_groom: [
    {
      key: "groom-suit",
      label: "신랑 예복 후보 좁히기",
      hint: "맞춤·기성·렌탈 비교 + 가봉 일정",
      emoji: "",
      href: "/suit",
    },
    {
      key: "groom-budget-talk",
      label: "양가 분담 협의 — 신랑 입장 정리",
      hint: "지역 평균 + 표준 비율로 시작",
      emoji: "",
      href: "/budget/split-simulator",
    },
  ],
  remarriage: [
    {
      key: "remarriage-tone",
      label: "작은 가족식 진행 톤 정리",
      hint: "양가 인사·자녀 동반 시나리오 살펴보기",
      emoji: "",
      href: "/ai-planner",
    },
    {
      key: "remarriage-community",
      label: "재혼 익명 커뮤니티 둘러보기",
      hint: "같은 입장 후기로 정서적 연결",
      emoji: "",
      href: "/community",
    },
  ],
  remote_overseas: [
    {
      key: "overseas-trip",
      label: "한국 방문 일정 최적화",
      hint: "2~3회 방문에 미팅 압축 배치",
      emoji: "",
      href: "/my-schedule",
    },
    {
      key: "overseas-delegate",
      label: "양가 부모께 위임 가능한 항목 정리",
      hint: "상견례·시식·답례품 등",
      emoji: "",
      href: "/ai-planner",
    },
  ],
  international: [
    {
      key: "intl-bilingual",
      label: "한국 결혼 관습 영문 요약 생성",
      hint: "외국 가족에게 보낼 안내문",
      emoji: "",
      href: "/ai-planner",
    },
    {
      key: "intl-dual-schedule",
      label: "한국·해외 이중식 일정 조율",
      hint: "신혼여행·체류 비자 동선 포함",
      emoji: "",
      href: "/my-schedule",
    },
  ],
  single_household: [
    {
      key: "single-self-plan",
      label: "1인 진행 가이드 체크",
      hint: "친정/시댁 역할 부재 시 대안",
      emoji: "",
      href: "/ai-planner",
    },
    {
      key: "single-community",
      label: "같은 입장 커뮤니티 찾기",
      hint: "혼자 준비하는 분들의 후기",
      emoji: "",
      href: "/community",
    },
  ],
  self_no_ceremony: [
    {
      key: "self-shoot",
      label: "셀프 촬영 노하우 정독",
      hint: "장비·동선·후보정 가이드",
      emoji: "",
      href: "/magazine",
    },
    {
      key: "self-marriage-register",
      label: "혼인신고 체크리스트 확인",
      hint: "필요 서류·진행 절차",
      emoji: "",
      href: "/my-schedule",
    },
  ],
  no_wedding_travel: [
    {
      key: "no-wed-travel",
      label: "신혼여행 큐레이션 살펴보기",
      hint: "식 없이 한 번에 잘 다녀오기",
      emoji: "",
      href: "/honeymoon",
    },
    {
      key: "no-wed-home",
      label: "신혼집·혼수 우선순위 정리",
      hint: "가전·가구·예산 우선순위",
      emoji: "",
      href: "/appliances",
    },
  ],
  snap_only: [
    {
      key: "snap-concept",
      label: "콘셉트별 스냅 작가 둘러보기",
      hint: "내추럴·도시·필름·라이프스타일",
      emoji: "",
      href: "/studios",
    },
    {
      key: "snap-anniversary",
      label: "기념일 패키지 비교",
      hint: "1주년·5주년·임산부·반려동물",
      emoji: "",
      href: "/studios",
    },
  ],
  regional: [
    {
      key: "regional-venue",
      label: "권역 식장 통합 큐레이션",
      hint: "시도+시군구 + 인접 권역 함께",
      emoji: "",
      href: "/venues",
    },
    {
      key: "regional-avg",
      label: "지역 평균 가격 확인",
      hint: "수도권 대비 합리성 비교",
      emoji: "",
      href: "/budget",
    },
  ],
  small_outdoor: [
    {
      key: "outdoor-weather",
      label: "야외 우천 대비 옵션 확인",
      hint: "텐트·실내 보조 동선",
      emoji: "",
      href: "/ai-planner",
    },
  ],
  small_budget: [
    {
      key: "budget-public",
      label: "공공시설(구민회관) 사례 보기",
      hint: "1천만원대 진짜 케이스",
      emoji: "",
      href: "/venues",
    },
  ],
  small_luxury: [
    {
      key: "luxury-compare",
      label: "호텔 스몰 패키지 비교",
      hint: "프라이빗·컨시어지 옵션 정렬",
      emoji: "",
      href: "/venues",
    },
  ],
};

const STYLE_INTRO: Record<WeddingStyle, { title: string; subtitle: string; accentEmoji: string }> = {
  general: {
    title: "오늘의 일반 결혼 준비",
    subtitle: "검증된 다음 액션 3가지",
    accentEmoji: "",
  },
  small: {
    title: "오늘의 스몰웨딩 큐레이션",
    subtitle: "감성을 채우는 영감과 미션",
    accentEmoji: "",
  },
  self: {
    title: "오늘의 셀프웨딩 DIY",
    subtitle: "손맛 더하는 작은 미션",
    accentEmoji: "",
  },
  custom: {
    title: "오늘의 맞춤 준비",
    subtitle: "내가 정한 카테고리 중심",
    accentEmoji: "",
  },
};

export function getMissionsForStyle(
  style: WeddingStyle | null | undefined,
  options: {
    pregnant?: boolean;
    pregnancyTrimester?: PregnancyTrimester | null;
    /** 페르소나 모드. 지정 시 PERSONA_SPECIFIC 미션이 스타일 미션보다 우선. */
    personaMode?: WeddingPersonaMode | null;
  } = {},
): PersonaMission[] {
  const s = (style ?? "general") as WeddingStyle;
  const styleList = STYLE_SPECIFIC[s] ?? STYLE_SPECIFIC.general;
  // Cap at 3 to keep the dashboard glanceable. 임신이면 차수별 우선순위
  // 2개 + 스타일 미션 1개 — 스타일 미션 + COMMON 보다 컨디션·시간 압박
  // 큰 페르소나라 우선순위 위에 둠. trimester=null 이면 second 사용.
  // 임신 + 비표준 페르소나(예: pregnancy + international) 가 동시에 가능 — 헤더는
  // international 인데 미션은 임신용만 나오면 카피와 모순(F#10). 둘 다 있으면
  // 임신 1 + 페르소나 1 + 공통 1 로 합쳐 표시한다.
  const personaList = options.personaMode ? PERSONA_SPECIFIC[options.personaMode] : undefined;
  const hasPersona = !!personaList && personaList.length > 0;

  if (options.pregnant) {
    const trimester = options.pregnancyTrimester ?? "second";
    const pregnancyMissions = PREGNANCY_MISSIONS_BY_TRIMESTER[trimester];
    const second = hasPersona ? personaList![0] : styleList[0] ?? COMMON[0];
    return [pregnancyMissions[0], second, pregnancyMissions[1]]
      .filter((m): m is PersonaMission => !!m)
      .slice(0, 3);
  }
  if (hasPersona) {
    return [...personaList!, ...COMMON].slice(0, 3);
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
