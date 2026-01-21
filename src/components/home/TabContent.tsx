import { CategoryTab } from "./CategoryTabBar";
import TabHeroContent from "./TabHeroContent";
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
      {/* Tab-specific Hero Section */}
      <TabHeroContent activeTab={activeTab} />

      {/* Recommended Section - dynamic based on tab */}
      <RecommendedSection activeTab={activeTab} />

      {/* Gallery Section - shown for relevant tabs */}
      {(activeTab === "wedding-hall" || activeTab === "sdm") && (
        <StudioGallery activeTab={activeTab} />
      )}

      {/* Magazine Section */}
      <MagazineSection activeTab={activeTab} />

      {/* Review Section */}
      <ReviewSection activeTab={activeTab} />
    </div>
  );
};

export default TabContent;
