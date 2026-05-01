import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab } from "@/components/home/CategoryTabBar";
import LockedCard from "@/components/LockedCard";
import { toast } from "@/hooks/use-toast";

interface StudioCard {
  id: string;
  title: string;
  description: string;
  status: "active" | "coming_soon" | "coming_v2" | "coming_v3";
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
    status: "coming_soon",
  },
  {
    id: "mobile-invitation",
    title: "간편 모바일 청첩장",
    description: "정보 입력만으로 모바일 청첩장 자동 생성",
    status: "coming_soon",
  },
  {
    id: "paper-invitation",
    title: "정성가득 종이 청첩장",
    description: "인쇄용 PDF로 받는 종이 청첩장",
    status: "coming_soon",
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

const lockedBadge: Partial<Record<StudioCard["status"], string>> = {
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

  const handleComingSoonClick = (title: string) => {
    toast({
      title: "곧 만나요 ✨",
      description: `${title}는 준비 중이에요. 출시 시 알림으로 알려드릴게요.`,
    });
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
            // 활성 카드 (실제 동작)
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
            // 곧 출시 카드 (시각적으론 활성, 클릭 시 토스트)
            if (card.status === "coming_soon") {
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleComingSoonClick(card.title)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-pink-50 to-pink-100">
                    <span className="absolute top-2 right-2 text-[10px] font-semibold bg-white/95 text-primary px-2 py-0.5 rounded-full shadow-sm">
                      곧 출시
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <h3 className="text-[15px] font-bold text-foreground leading-tight">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-[12px] text-muted-foreground line-clamp-2">
                      {card.description}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground font-medium">
                      준비 중이에요
                    </p>
                  </div>
                </button>
              );
            }
            // 잠금 카드 (시안·식전영상)
            return (
              <LockedCard
                key={card.id}
                title={card.title}
                description={card.description}
                badge={lockedBadge[card.status]}
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
