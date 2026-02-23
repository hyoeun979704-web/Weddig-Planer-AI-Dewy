import { CategoryTab } from "./CategoryTabBar";
import TabHeroContent from "./TabHeroContent";
import HomeCategoryGrid from "./HomeCategoryGrid";
import RecommendedSection from "./RecommendedSection";
import StudioGallery from "./StudioGallery";
import MagazineSection from "./MagazineSection";
import ReviewSection from "./ReviewSection";

interface TabContentProps {
  activeTab: CategoryTab;
}

const TabContent = ({ activeTab }: TabContentProps) => {
  return (
    <div className="animate-fade-in">
      <TabHeroContent activeTab={activeTab} />

      {/* Show category grid on home tab */}
      {activeTab === "home" && <HomeCategoryGrid />}

      <RecommendedSection activeTab={activeTab} />

      {activeTab === "home" && <StudioGallery />}

      <MagazineSection activeTab={activeTab} />

      <ReviewSection activeTab={activeTab} />
    </div>
  );
};

export default TabContent;
