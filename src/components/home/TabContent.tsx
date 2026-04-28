import { CategoryTab } from "./CategoryTabBar";
import HeroBanner from "./HeroBanner";
import TabHeroContent from "./TabHeroContent";
import HomeCategoryGrid from "./HomeCategoryGrid";
import RecommendedSection from "./RecommendedSection";
import QuickInvitationSection from "./QuickInvitationSection";
import StudioGallery from "./StudioGallery";
import MagazineSection from "./MagazineSection";
import ReviewSection from "./ReviewSection";
import PopularPostsSection from "./PopularPostsSection";

interface TabContentProps {
  activeTab: CategoryTab;
}

const TabContent = ({ activeTab }: TabContentProps) => {
  if (activeTab === "ai-planner") {
    // Home feed order per design spec:
    //   hero → categories → 맞춤 추천 → 5분 완성 청첩장
    //   → 오늘의 꿀팁 → 오늘의 수다 → 리얼 후기
    return (
      <div className="animate-fade-in">
        <HeroBanner />
        <HomeCategoryGrid />
        <RecommendedSection />
        <QuickInvitationSection />
        <MagazineSection activeTab={activeTab} />
        <PopularPostsSection />
        <ReviewSection activeTab={activeTab} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <TabHeroContent activeTab={activeTab} />
      <RecommendedSection />
      <PopularPostsSection />
      <StudioGallery />
      <MagazineSection activeTab={activeTab} />
      <ReviewSection activeTab={activeTab} />
    </div>
  );
};

export default TabContent;
