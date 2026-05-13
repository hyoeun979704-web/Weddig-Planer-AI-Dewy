import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
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

// Feature-specific guide sets — each runs on its own page
export const FEATURE_GUIDES = [
  {
    id: "app-tour",
    icon: "🏠",
    title: "전체 앱 투어",
    description: "Dewy의 주요 기능을 한눈에 둘러보세요",
    route: "/",
    steps: APP_TOUR_STEPS,
  },
  {
    id: "schedule",
    icon: "📅",
    title: "스케줄 관리",
    description: "D-Day 기반 일정 관리 방법을 알아보세요",
    route: "/schedule",
    steps: [
      { id: "s1", title: "커플 연동", description: "파트너를 초대하고 일정을 함께 공유할 수 있어요.", targetSelector: "[data-tutorial='schedule-couple']", position: "bottom" as const },
      { id: "s2", title: "D-Day 현황", description: "결혼식까지 남은 일수와 전체 진행률을 한눈에 확인하세요.", targetSelector: "[data-tutorial='schedule-dday']", position: "bottom" as const },
      { id: "s3", title: "준비 타임라인", description: "시기별 체크리스트를 확인하고 진행 상황을 관리하세요.", targetSelector: "[data-tutorial='schedule-timeline']", position: "bottom" as const },
      { id: "s4", title: "일정 관리", description: "오른쪽 상단의 '일정 관리' 버튼으로 개인 일정을 추가하세요.", targetSelector: "[data-tutorial='schedule-add']", position: "bottom" as const },
    ],
  },
  {
    id: "budget",
    icon: "💰",
    title: "예산 관리",
    description: "웨딩 예산을 효율적으로 관리하는 방법",
    route: "/budget",
    steps: [
      { id: "b1", title: "예산 요약", description: "총 예산 대비 사용 현황을 한눈에 확인하세요.", targetSelector: "[data-tutorial='budget-summary']", position: "bottom" as const },
      { id: "b2", title: "카테고리별 현황", description: "웨딩홀, 스드메 등 카테고리별 예산과 지출을 비교해 보세요.", targetSelector: "[data-tutorial='budget-categories']", position: "bottom" as const },
      { id: "b3", title: "지출 추가", description: "하단의 + 버튼으로 새로운 지출을 기록하세요.", targetSelector: "[data-tutorial='budget-add']", position: "top" as const },
      { id: "b4", title: "예산 설정", description: "오른쪽 상단 설정 아이콘으로 총 예산과 지역을 설정하세요.", targetSelector: "[data-tutorial='budget-settings']", position: "bottom" as const },
    ],
  },
  {
    id: "ai-planner",
    icon: "✨",
    title: "AI 플래너",
    description: "AI 웨딩 플래너 활용법",
    route: "/ai-planner",
    steps: [
      { id: "a1", title: "AI 웨딩 플래너", description: "듀이에게 웨딩 준비에 관한 궁금한 점을 자유롭게 물어보세요.", targetSelector: "[data-tutorial='ai-header']", position: "bottom" as const },
      { id: "a2", title: "추천 질문", description: "추천 질문을 탭하면 바로 AI에게 질문할 수 있어요.", targetSelector: "[data-tutorial='ai-suggestions']", position: "bottom" as const },
      { id: "a3", title: "메시지 입력", description: "하단 입력창에 자유롭게 질문을 작성하고 전송하세요.", targetSelector: "[data-tutorial='ai-input']", position: "top" as const },
    ],
  },
  {
    id: "community",
    icon: "👥",
    title: "커뮤니티",
    description: "예비 신혼부부와 소통하는 방법",
    route: "/community",
    steps: [
      { id: "c1", title: "커뮤니티 홈", description: "다른 예비 신혼부부들의 글을 둘러보세요.", targetSelector: "[data-tutorial='community-header']", position: "bottom" as const },
      { id: "c2", title: "카테고리 필터", description: "웨딩홀, 스드메 등 관심 분야별로 글을 필터링하세요.", targetSelector: "[data-tutorial='community-categories']", position: "bottom" as const },
      { id: "c3", title: "글 작성", description: "오른쪽 상단 펜 아이콘으로 질문, 후기, 정보를 공유하세요.", targetSelector: "[data-tutorial='community-write']", position: "bottom" as const },
    ],
  },
  {
    id: "premium",
    icon: "💎",
    title: "프리미엄 콘텐츠",
    description: "AI 리포트와 PDF 도구 활용법",
    route: "/premium/content",
    steps: [
      { id: "p1", title: "프리미엄 콘텐츠", description: "AI 견적서, 예산 리포트, 타임라인 등 다양한 PDF 도구를 이용할 수 있어요.", targetSelector: "[data-tutorial='premium-header']", position: "bottom" as const },
      { id: "p2", title: "AI 리포트", description: "조건 입력만으로 AI가 견적서와 예산 분석 리포트를 자동 생성해줘요.", targetSelector: "[data-tutorial='premium-reports']", position: "bottom" as const },
      { id: "p3", title: "타임라인 & 안내서", description: "스냅촬영, 본식, 스태프 안내서 등 당일에 필요한 PDF를 한 곳에서 관리하세요.", targetSelector: "[data-tutorial='premium-guides']", position: "bottom" as const },
    ],
  },
];

const TUTORIAL_SEEN_KEY = "dewy_tutorial_seen";

export const useTutorial = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TutorialStep[]>(APP_TOUR_STEPS);
  const [tourId, setTourId] = useState<string | null>(null);

  const hasSeen = localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";

  const startTutorial = useCallback(
    (customSteps?: TutorialStep[], guideId?: string) => {
      setSteps(customSteps || APP_TOUR_STEPS);
      setTourId(guideId ?? null);
      setCurrentStepIndex(0);
      setIsActive(true);
    },
    []
  );

  const awardCompletion = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.rpc("complete_tutorial" as any, {
        p_tour_id: `feature_${id}`,
      });
      if (error) return;
      const row = Array.isArray(data) ? data[0] : (data as any);
      if (!row?.awarded) return;
      if (row.bonus_amount > 0) {
        toast.success(
          `🎓 튜토리얼 마스터! ${row.base_amount + row.bonus_amount}P 적립`
        );
      } else if (row.base_amount > 0) {
        toast.success(`튜토리얼 완료! ${row.base_amount}P 적립`);
      }
    } catch {
      // 적립 실패해도 튜토리얼은 정상 종료
    }
  }, []);

  const endTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
    if (tourId) {
      awardCompletion(tourId);
      setTourId(null);
    }
  }, [tourId, awardCompletion]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      endTutorial();
    }
  }, [currentStepIndex, steps.length, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

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
