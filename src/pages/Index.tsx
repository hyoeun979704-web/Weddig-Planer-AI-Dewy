import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import TabContent from "@/components/home/TabContent";
import Footer from "@/components/home/Footer";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: CategoryTab = "home";

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    const tabRoutes: Record<CategoryTab, string> = {
      "home": "/",
      "wedding-hall": "/venues",
      "sdm": "/studios",
      "honeymoon-gifts": "/honeymoon-gifts",
      "honeymoon": "/honeymoon",
      "appliances": "/appliances",
      "suit": "/suit",
      "hanbok": "/hanbok",
      "invitation": "/invitation-venues",
    };
    navigate(tabRoutes[tab]);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <HomeHeader />
      <CategoryTabBar activeTab={activeTab} onTabChange={handleCategoryTabChange} />

      <main className="pb-20">
        <TabContent activeTab={activeTab} />
        <Footer />
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Index;
