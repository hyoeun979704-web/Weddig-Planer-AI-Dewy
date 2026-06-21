import { CategoryTab } from "./CategoryTabBar";
import CompactBannerCarousel from "./CompactBannerCarousel";
import TabHeroContent from "./TabHeroContent";
import HomeCategoryGrid from "./HomeCategoryGrid";
import PersonaDashboard from "./PersonaDashboard";
import HomeQuickLinks from "./HomeQuickLinks";
import HomeOnboardingCard from "./HomeOnboardingCard";
import TasteSeedCard from "./TasteSeedCard";
import BudgetVsAverageCard from "./BudgetVsAverageCard";
import RecommendedSection from "./RecommendedSection";
import PersonaRecommendationRows from "./PersonaRecommendationRows";
import InvitationTemplateSection from "./InvitationTemplateSection";
import StudioGallery from "./StudioGallery";
import TipsSection from "./TipsSection";
import CommunityChatterSection from "./CommunityChatterSection";
import PopularPostsSection from "./PopularPostsSection";
import EmptyState from "@/components/EmptyState";
import { emptyCopy } from "@/lib/emptyCopy";

interface TabContentProps {
  activeTab: CategoryTab;
}

// 탭별 큐레이션이 아직 준비되지 않은 탭에만 안내 카드를 띄웁니다.
// 꿀팁 탭은 TipsSection("오늘의 꿀팁" 영상)이 이미 채우고 있어서
// placeholder가 필요 없습니다.
const TAB_PLACEHOLDER: Partial<Record<CategoryTab, keyof typeof emptyCopy>> = {
  events: "eventsTab",
  shopping: "shoppingTab",
  "ai-studio": "aiStudioTab",
};

const TabContent = ({ activeTab }: TabContentProps) => {
  if (activeTab === "ai-planner") {
    return (
      <div className="animate-fade-in">
        {/* PersonaDashboard 가 온보딩 완료 사용자에게 페르소나-인지 카드(D-day,
            체크리스트 진척, 일별 미션 등)를 보여주고, 미로그인/온보딩 전엔
            null 반환해 캐러셀이 자리를 채웁니다. */}
        <PersonaDashboard />
        {/* 현황(PersonaDashboard) 바로 뒤 행동 단축 — 보드·견적·비교(혼합형 홈 순서). */}
        <HomeQuickLinks />
        <HomeOnboardingCard />
        {/* 온보딩 후 시각취향 seed 진입(I1) — 취향이 쌓이면 자동 숨김. */}
        <TasteSeedCard />
        <BudgetVsAverageCard />
        <CompactBannerCarousel />
        <HomeCategoryGrid />
        {/* 단일 추천 행 → 페르소나별 카테고리 행 스택(Netflix식)으로 교체. */}
        <PersonaRecommendationRows />
        <InvitationTemplateSection />
        <TipsSection activeTab={activeTab} />
        <CommunityChatterSection />
      </div>
    );
  }

  const placeholderKey = TAB_PLACEHOLDER[activeTab];

  return (
    <div className="animate-fade-in">
      <TabHeroContent activeTab={activeTab} />
      {placeholderKey && (
        <div className="px-4 pt-4">
          <EmptyState {...emptyCopy[placeholderKey]} />
        </div>
      )}
      <RecommendedSection />
      <PopularPostsSection hideWhenEmpty />
      <StudioGallery />
      <TipsSection activeTab={activeTab} />
    </div>
  );
};

export default TabContent;
