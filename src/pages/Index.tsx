import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import TabHeroContent from "@/components/home/TabHeroContent";
import CategoryGrid from "@/components/home/CategoryGrid";
import RecommendedVenues from "@/components/home/RecommendedVenues";
import StudioGallery from "@/components/home/StudioGallery";
import MagazineSection from "@/components/home/MagazineSection";
import ReviewSection from "@/components/home/ReviewSection";
import Footer from "@/components/home/Footer";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<CategoryTab>("wedding-hall");

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    setActiveTab(tab);
    // Future: Can add routing here for each tab
    // navigate(`/${tab}`);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Fixed Header + Category Tab Bar */}
      <HomeHeader />
      <CategoryTabBar activeTab={activeTab} onTabChange={handleCategoryTabChange} />

      {/* Main Content */}
      <main className="pb-20">
        {/* Tab-specific Hero Section */}
        <TabHeroContent activeTab={activeTab} />

        {/* Category Grid */}
        <CategoryGrid />

        {/* Recommended Venues - Horizontal Scroll */}
        <RecommendedVenues />

        {/* Studio Gallery */}
        <StudioGallery />

        {/* Magazine Section */}
        <MagazineSection />

        {/* Review Section */}
        <ReviewSection />

        {/* Footer */}
        <Footer />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
