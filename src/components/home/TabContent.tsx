import { CategoryTab } from "./CategoryTabBar";
import CompactBannerCarousel from "./CompactBannerCarousel";
import HomeDashboard from "./HomeDashboard";
import TabHeroContent from "./TabHeroContent";
import HomeCategoryGrid from "./HomeCategoryGrid";
import RecommendedSection from "./RecommendedSection";
import InvitationTemplateSection from "./InvitationTemplateSection";
import StudioGallery from "./StudioGallery";
import MagazineSection from "./MagazineSection";
import CommunityChatterSection from "./CommunityChatterSection";
import ReviewSection from "./ReviewSection";
import PopularPostsSection from "./PopularPostsSection";
import EmptyState from "@/components/EmptyState";
import { emptyCopy } from "@/lib/emptyCopy";

interface TabContentProps {
  activeTab: CategoryTab;
}

// 비 ai-planner 탭은 아직 탭별 큐레이션이 준비되지 않아서 같은
// 추천 컨텐츠를 보여주고 있어요. 그 사실을 정직하게 알려주는
// 브랜드 톤의 안내 박스를 hero 아래에 한 줄 띄웁니다.
const TAB_PLACEHOLDER: Partial<Record<CategoryTab, keyof typeof emptyCopy>> = {
  events: "eventsTab",
  shopping: "shoppingTab",
  "ai-studio": "aiStudioTab",
  tips: "tipsTab",
};

const TabContent = ({ activeTab }: TabContentProps) => {
  if (activeTab === "ai-planner") {
    return (
      <div className="animate-fade-in">
        <CompactBannerCarousel />
        <HomeDashboard />
        <HomeCategoryGrid />
        <RecommendedSection />
        <InvitationTemplateSection />
        <MagazineSection activeTab={activeTab} />
        <CommunityChatterSection />
        <ReviewSection activeTab={activeTab} />
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
      <MagazineSection activeTab={activeTab} />
      <ReviewSection activeTab={activeTab} />
    </div>
  );
};

export default TabContent;
