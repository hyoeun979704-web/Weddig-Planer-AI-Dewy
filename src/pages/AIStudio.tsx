import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";

interface StudioCard {
  id: string;
  title: string;
  description: string;
}

const cards: StudioCard[] = [
  { id: "mobile-invitation", title: "간편 모바일 청첩장", description: "기능 설명" },
  { id: "paper-invitation", title: "정성가득 종이 청접장", description: "기능 설명" },
  { id: "dress-tour", title: "방구석 드레스 투어", description: "기능 설명" },
  { id: "makeup-finder", title: "착붙 메이크업 찾기", description: "기능 설명" },
  { id: "wedding-photo", title: "웨딩촬영 시안", description: "기능 설명" },
  { id: "ceremony-video", title: "특별한 식전 영상", description: "기능 설명" },
];

const AIStudio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: CategoryTab = "ai-studio";

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = (tab: CategoryTab) => {
    const tabRoutes: Record<CategoryTab, string> = {
      "ai-planner": "/ai-planner",
      "ai-studio": "/ai-studio",
      tips: "/magazine",
      events: "/deals",
      shopping: "/store",
    };
    navigate(tabRoutes[tab]);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--pink-50))] max-w-[430px] mx-auto relative">
      <HomeHeader />
      <CategoryTabBar activeTab={activeTab} onTabChange={handleCategoryTabChange} />

      <main className="pb-24">
        <div className="grid grid-cols-2 gap-3 px-4 py-5">
          {cards.map((card) => (
            <article
              key={card.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="aspect-square bg-[#d9d9d9]" />
              <div className="px-4 py-3">
                <h3 className="text-[15px] font-bold text-foreground leading-tight">
                  {card.title}
                </h3>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default AIStudio;
