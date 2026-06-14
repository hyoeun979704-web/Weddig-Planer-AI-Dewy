import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab, useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import LockedCard from "@/components/LockedCard";
import WaitlistSignupSheet from "@/components/studio/WaitlistSignupSheet";
import PageTutorial from "@/components/tutorial/PageTutorial";
import Seo from "@/components/Seo";

interface StudioCard {
  id: string;
  title: string;
  description: string;
  status: "active" | "coming_soon" | "coming_v2" | "coming_v3";
  href?: string;
  previewImage?: string;
  previewPosition?: "center" | "top";
}

const cards: StudioCard[] = [
  {
    id: "wedding-consulting",
    title: "2026 웨딩컨설팅",
    description: "퍼스널컬러·헤어·메이크업·드레스 맞춤 A4 리포트 (첫 1회 50%↓)",
    status: "active",
    href: "/ai-studio/consulting",
    previewImage: "/ai-studio-previews/consulting.webp",
    previewPosition: "top",
  },
  {
    id: "dress-tour",
    title: "방구석 드레스 투어",
    description: "내 사진으로 드레스 핏을 미리 확인",
    status: "active",
    href: "/ai-studio/dress-tour",
    previewImage: "/ai-studio-previews/dress.webp",
    previewPosition: "top",
  },
  {
    id: "makeup-finder",
    title: "착붙 메이크업 찾기",
    description: "나에게 어울리는 신부 메이크업 시연",
    status: "active",
    href: "/ai-studio/makeup-room",
    previewImage: "/ai-studio-previews/makeup.webp",
  },
  {
    id: "hair-room",
    title: "헤어 변형 미리보기",
    description: "내 얼굴 그대로, 헤어스타일·컬러 9그리드 (옵션당 5하트)",
    status: "active",
    href: "/ai-studio/hair-room",
    previewImage: "/ai-studio-previews/hair.webp",
    previewPosition: "top",
  },
  {
    id: "paper-invitation",
    title: "정성가득 종이 청첩장",
    description: "인쇄용 PDF로 받는 종이 청첩장 — 무료 템플릿 시작",
    status: "active",
    href: "/invitation/new?format=paper",
    previewImage: "/ai-studio-previews/paper-invitation.webp",
  },
  {
    id: "mobile-invitation",
    title: "간편 모바일 청첩장",
    description: "정보 입력 + 공유 링크 + QR 코드까지 한 번에",
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
  coming_soon: "준비중",
  coming_v2: "준비중",
  coming_v3: "한정 외주",
};

const StudioCardImage = ({
  card,
  priority = false,
}: {
  card: StudioCard;
  priority?: boolean;
}) => (
  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-pink-50 to-pink-100">
    {card.previewImage ? (
      <img
        src={card.previewImage}
        alt={`${card.title} 미리보기`}
        width={640}
        height={640}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`h-full w-full object-cover ${
          card.previewPosition === "top" ? "object-top" : "object-center"
        }`}
      />
    ) : null}
  </div>
);

const AIStudio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: CategoryTab = "ai-studio";
  const [waitlistCard, setWaitlistCard] = useState<StudioCard | null>(null);

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  const handleCategoryTabChange = useCategoryTabNavigation();

  const handleLockedCardClick = (card: StudioCard) => {
    // Open the waitlist sheet so users can register for launch notifications.
    // Writes to service_waitlist (same table AdminServiceWaitlist administers).
    setWaitlistCard(card);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--pink-50))] app-col mx-auto relative">
      <Seo title="AI 스튜디오 - 드레스·메이크업 시뮬레이션 | Dewy" description="AI로 웨딩드레스와 메이크업을 미리 입어보세요. 내 사진으로 다양한 스타일을 시뮬레이션하는 Dewy AI 스튜디오." path="/ai-studio" />
      <HomeHeader />
      <CategoryTabBar activeTab={activeTab} onTabChange={handleCategoryTabChange} />

      <main className="safe-bottom-scroll">
        {/* 내 결과물 모아보기 — 헤어·드레스·메이크업·사진보정·컨설팅을 한 곳에서 탭으로 */}
        <button
          type="button"
          onClick={() => navigate("/ai-studio/my-results")}
          className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left active:scale-[0.99] transition-transform"
        >
          <span>
            <span className="block text-sm font-bold text-foreground">내 결과물 모아보기</span>
            <span className="block text-[12px] text-muted-foreground mt-0.5">
              헤어·드레스·메이크업·사진보정·컨설팅을 한 곳에서
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>
        <div className="grid grid-cols-2 gap-3 px-4 py-5">
          {cards.map((card, index) => {
            // 활성 카드 (실제 동작)
            if (card.status === "active" && card.href) {
              return (
                <button
                  key={card.id}
                  type="button"
                  data-tutorial={card.id === "wedding-consulting" ? "studio-cards" : undefined}
                  onClick={() => navigate(card.href!)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.98] transition-transform"
                >
                  <StudioCardImage card={card} priority={index < 2} />
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
            // 준비중 카드 (잠금 상태, 클릭 시 사전알림 시트)
            if (card.status === "coming_soon") {
              return (
                <LockedCard
                  key={card.id}
                  title={card.title}
                  description={card.description}
                  badge={lockedBadge[card.status]}
                  imageUrl={card.previewImage}
                  imageAlt={card.previewImage ? `${card.title} 미리보기` : ""}
                  onClick={() => handleLockedCardClick(card)}
                />
              );
            }
            // 잠금 카드 (시안·식전영상)
            return (
              <LockedCard
                key={card.id}
                title={card.title}
                description={card.description}
                badge={lockedBadge[card.status]}
                imageUrl={card.previewImage}
                imageAlt={card.previewImage ? `${card.title} 미리보기` : ""}
                onClick={() => handleLockedCardClick(card)}
              />
            );
          })}
        </div>
      </main>

      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />

      <WaitlistSignupSheet
        open={waitlistCard !== null}
        onOpenChange={(open) => !open && setWaitlistCard(null)}
        serviceId={waitlistCard?.id ?? null}
        serviceTitle={waitlistCard?.title ?? ""}
      />

      <PageTutorial id="ai-studio" />
    </div>
  );
};

export default AIStudio;
