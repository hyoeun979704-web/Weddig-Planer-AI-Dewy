import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import LockedCard from "@/components/LockedCard";

interface StudioCard {
  id: string;
  title: string;
  description: string;
  status: "active" | "coming_v1_5" | "coming_v2" | "coming_v3";
  href?: string;
}

const cards: StudioCard[] = [
  {
    id: "dress-tour",
    title: "방구석 드레스 투어",
    description: "내 사진으로 드레스 핏을 미리 확인",
    status: "active",
    href: "/ai-studio/dress-tour",
  },
  {
    id: "makeup-finder",
    title: "착붙 메이크업 찾기",
    description: "나에게 어울리는 신부 메이크업 시연",
    status: "coming_v1_5",
  },
  {
    id: "mobile-invitation",
    title: "간편 모바일 청첩장",
    description: "정보 입력만으로 모바일 청첩장 자동 생성",
    status: "coming_v1_5",
  },
  {
    id: "paper-invitation",
    title: "정성가득 종이 청첩장",
    description: "인쇄용 PDF로 받는 종이 청첩장",
    status: "coming_v1_5",
  },
  {
    id: "wedding-photo",
    title: "웨딩촬영 시안",
    description: "원하는 컨셉의 촬영 레퍼런스 자동 생성",
    status: "coming_v2",
  },
  {
    id: "ceremony-video",
    title: "특별한 식전 영상",
    description: "전문 디자이너가 직접 편집해드려요",
    status: "coming_v3",
  },
];

const statusBadge: Record<StudioCard["status"], string | undefined> = {
  active: undefined,
  coming_v1_5: "곧 출시",
  coming_v2: "준비중",
  coming_v3: "한정 외주",
};

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

  const handleLockedCardClick = (cardId: string) => {
    // Phase b-7에서 사전알림 모달 연결 예정
    console.log("waitlist signup for:", cardId);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--pink-50))] max-w-[430px] mx-auto relative">
      <HomeHeader />
      <CategoryTabBar activeTab={activeTab} onTabChange={handleCategoryTabChange} />

      <main className="pb-24">
        <div className="grid grid-cols-2 gap-3 px-4 py-5">
          {cards.map((card) => {
            if (card.status === "active" && card.href) {
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => navigate(card.href!)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform"
                >
                  <div className="aspect-square bg-gradient-to-br from-pink-100 to-pink-200" />
                  <div className="px-4 py-3">
                    <h3 className="text-[15px] font-bold text-foreground leading-tight">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                      {card.description}
                    </p>
                    <p className="mt-1.5 text-[11px] text-primary font-medium">
                      지금 시작 →
                    </p>
                  </div>
                </button>
              );
            }
            return (
              <LockedCard
                key={card.id}
                title={card.title}
                description={card.description}
                badge={statusBadge[card.status]}
                onClick={() => handleLockedCardClick(card.id)}
              />
            );
          })}
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default AIStudio;
