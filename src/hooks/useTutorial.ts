import { useState, useCallback } from "react";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector for the element to highlight
  position: "top" | "bottom" | "left" | "right";
}

const APP_TOUR_STEPS: TutorialStep[] = [
  {
    id: "home-header",
    title: "홈 화면",
    description: "Dewy에 오신 것을 환영합니다! 상단에서 검색, 알림, 찜한 목록, 장바구니에 빠르게 접근할 수 있어요.",
    targetSelector: "header",
    position: "bottom",
  },
  {
    id: "category-tab",
    title: "카테고리 탭",
    description: "홈, 이벤트, 쇼핑, 정보 탭을 전환하며 다양한 웨딩 콘텐츠를 탐색하세요.",
    targetSelector: "[data-tutorial='category-tab']",
    position: "bottom",
  },
  {
    id: "home-categories",
    title: "웨딩 서비스 카테고리",
    description: "웨딩홀, 스드메, 허니문 등 원하는 서비스를 한눈에 찾아보세요.",
    targetSelector: "[data-tutorial='home-categories']",
    position: "bottom",
  },
  {
    id: "bottom-schedule",
    title: "스케줄 관리",
    description: "결혼 준비 일정을 D-Day 기반으로 체계적으로 관리할 수 있어요.",
    targetSelector: "[data-tutorial='nav-schedule']",
    position: "top",
  },
  {
    id: "bottom-budget",
    title: "예산 관리",
    description: "웨딩 예산을 카테고리별로 설정하고 지출을 추적해 보세요.",
    targetSelector: "[data-tutorial='nav-budget']",
    position: "top",
  },
  {
    id: "bottom-ai",
    title: "AI 플래너",
    description: "AI가 맞춤형 웨딩 플랜을 제안해 드려요. 궁금한 점을 자유롭게 물어보세요!",
    targetSelector: "[data-tutorial='nav-ai']",
    position: "top",
  },
  {
    id: "bottom-community",
    title: "커뮤니티",
    description: "다른 예비 신혼부부들과 후기, 정보, 꿀팁을 나눠보세요.",
    targetSelector: "[data-tutorial='nav-community']",
    position: "top",
  },
  {
    id: "bottom-mypage",
    title: "마이페이지",
    description: "내 프로필, 주문내역, 포인트, 설정 등을 관리하세요.",
    targetSelector: "[data-tutorial='nav-mypage']",
    position: "top",
  },
];

// Feature-specific guide sets for the Tutorial page
export const FEATURE_GUIDES = [
  {
    id: "app-tour",
    icon: "🏠",
    title: "전체 앱 투어",
    description: "Dewy의 주요 기능을 한눈에 둘러보세요",
    steps: APP_TOUR_STEPS,
  },
  {
    id: "schedule",
    icon: "📅",
    title: "스케줄 관리",
    description: "D-Day 기반 일정 관리 방법을 알아보세요",
    steps: [
      { id: "s1", title: "스케줄 홈", description: "결혼식까지 남은 일수와 진행 상황을 한눈에 확인하세요.", targetSelector: "[data-tutorial='nav-schedule']", position: "top" as const },
      { id: "s2", title: "일정 체크리스트", description: "시기별 준비사항을 체크리스트로 관리할 수 있어요.", targetSelector: "[data-tutorial='nav-schedule']", position: "top" as const },
    ],
  },
  {
    id: "budget",
    icon: "💰",
    title: "예산 관리",
    description: "웨딩 예산을 효율적으로 관리하는 방법",
    steps: [
      { id: "b1", title: "예산 설정", description: "총 예산과 카테고리별 예산을 설정하세요.", targetSelector: "[data-tutorial='nav-budget']", position: "top" as const },
      { id: "b2", title: "지출 기록", description: "실제 지출을 기록하고 예산 대비 현황을 확인하세요.", targetSelector: "[data-tutorial='nav-budget']", position: "top" as const },
    ],
  },
  {
    id: "ai-planner",
    icon: "✨",
    title: "AI 플래너",
    description: "AI 웨딩 플래너 활용법",
    steps: [
      { id: "a1", title: "AI 상담", description: "웨딩 준비에 관한 궁금한 점을 AI에게 물어보세요.", targetSelector: "[data-tutorial='nav-ai']", position: "top" as const },
      { id: "a2", title: "맞춤 추천", description: "AI가 상황에 맞는 업체와 상품을 추천해 드려요.", targetSelector: "[data-tutorial='nav-ai']", position: "top" as const },
    ],
  },
  {
    id: "community",
    icon: "👥",
    title: "커뮤니티",
    description: "예비 신혼부부와 소통하는 방법",
    steps: [
      { id: "c1", title: "글 작성", description: "질문, 후기, 정보를 자유롭게 공유하세요.", targetSelector: "[data-tutorial='nav-community']", position: "top" as const },
      { id: "c2", title: "소통하기", description: "댓글과 좋아요로 다른 회원들과 소통하세요.", targetSelector: "[data-tutorial='nav-community']", position: "top" as const },
    ],
  },
];

const TUTORIAL_SEEN_KEY = "dewy_tutorial_seen";

export const useTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>(APP_TOUR_STEPS);

  const hasSeen = localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";

  const startTutorial = useCallback((customSteps?: TutorialStep[]) => {
    setSteps(customSteps || APP_TOUR_STEPS);
    setCurrentStepIndex(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      endTutorial();
    }
  }, [currentStepIndex, steps.length]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
  }, []);

  const skipTutorial = useCallback(() => {
    endTutorial();
  }, [endTutorial]);

  return {
    isActive,
    currentStep: steps[currentStepIndex],
    currentStepIndex,
    totalSteps: steps.length,
    hasSeen,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    endTutorial,
  };
};
