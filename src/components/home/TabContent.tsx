import { CategoryTab } from "./CategoryTabBar";
import HeroBanner from "./HeroBanner";
import TabHeroContent from "./TabHeroContent";
import HomeCategoryGrid from "./HomeCategoryGrid";
import RecommendedSection from "./RecommendedSection";
import InvitationTemplateSection from "./InvitationTemplateSection";
import StudioGallery from "./StudioGallery";
import MagazineSection from "./MagazineSection";
import CommunityChatterSection from "./CommunityChatterSection";
import ReviewSection from "./ReviewSection";
import PopularPostsSection from "./PopularPostsSection";

interface TabContentProps {
  activeTab: CategoryTab;
}

const TabContent = ({ activeTab }: TabContentProps) => {
  if (activeTab === "ai-planner") {
    return (
      <div className="animate-fade-in">
        <HeroBanner />
        <HomeCategoryGrid />
        <RecommendedSection />
        <InvitationTemplateSection />
        <MagazineSection activeTab={activeTab} />
        <CommunityChatterSection />
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
