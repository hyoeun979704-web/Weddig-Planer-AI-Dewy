import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import TabContent from "@/components/home/TabContent";
import Footer from "@/components/home/Footer";

const Honeymoon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: CategoryTab = "honeymoon";

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    const tabRoutes: Record<CategoryTab, string> = {
      "wedding-hall": "/",
      "sdm": "/studios",
      "honeymoon-gifts": "/honeymoon-gifts",
      "honeymoon": "/honeymoon",
      "appliances": "/appliances",
      "suit": "/suit",
      "hanbok": "/hanbok",
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

export default Honeymoon;
