import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import TabContent from "@/components/home/TabContent";
import Footer from "@/components/home/Footer";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<CategoryTab>("wedding-hall");
  
  // Store scroll positions for each tab
  const scrollPositions = useRef<Record<CategoryTab, number>>({
    "wedding-hall": 0,
    "sdm": 0,
    "honeymoon-gifts": 0,
    "honeymoon": 0,
    "appliances": 0,
    "suit": 0,
    "hanbok": 0,
  });

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    // Save current scroll position before switching
    scrollPositions.current[activeTab] = window.scrollY;
    
    // Switch tab
    setActiveTab(tab);
  };

  // Restore scroll position when tab changes
  useEffect(() => {
    const savedPosition = scrollPositions.current[activeTab];
    window.scrollTo(0, savedPosition);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Fixed Header + Category Tab Bar */}
      <HomeHeader />
      <CategoryTabBar activeTab={activeTab} onTabChange={handleCategoryTabChange} />

      {/* Main Content */}
      <main className="pb-20">
        {/* Tab-specific Content */}
        <TabContent activeTab={activeTab} />

        {/* Footer */}
        <Footer />
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
