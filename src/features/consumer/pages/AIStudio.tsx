import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import HomeHeader from "@/components/home/HomeHeader";
import CategoryTabBar, { CategoryTab, useCategoryTabNavigation } from "@/components/home/CategoryTabBar";
import StudioBannerCard from "@/components/studio/StudioBannerCard";
import WaitlistSignupSheet from "@/components/studio/WaitlistSignupSheet";
import PageTutorial from "@/components/tutorial/PageTutorial";
import Seo from "@/components/Seo";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { shouldHideWeddingCeremony } from "@/lib/weddingPersona";
import { rankStudioCardIds, studioPersonaHint } from "@/lib/studioPersonalization";

interface StudioCard {
  id: string;
  title: string;
  description: string;
  status: "active" | "coming_soon" | "coming_v2" | "coming_v3";
  href?: string;
  previewImage?: string;
  /**
   * 예식이 전제인 카드(스드메 완성본·청첩장·식전영상). 노웨딩(no_wedding_travel)·스냅(snap_only)
   * 페르소나에선 숨긴다. 단, 드레스·메이크업·헤어·촬영·컨설팅 같은 *스타일링* 카드는 태그하지
   * 않는다 — snap_only 는 스냅 촬영용으로 그것들을 원하므로, 일괄 숨기면 빈 스튜디오(dead-end)가 된다.
   */
  requiresCeremony?: boolean;
}

const cards: StudioCard[] = [
  {
    id: "wedding-consulting",
    title: "2026 웨딩컨설팅",
    description: "퍼스널컬러·헤어·메이크업·드레스 맞춤 A4 리포트 (첫 1회 50%↓)",
    status: "active",
    href: "/ai-studio/consulting",
    previewImage: "/ai-studio-previews/banner-consulting.webp",
  },
  {
    id: "sdm-preview",
    title: "스드메 미리보기",
    description: "장소·메이크업·헤어·드레스를 한 번에 반영한 완성본 (10하트)",
    status: "active",
    href: "/ai-studio/sdm-preview",
    previewImage: "/ai-studio-previews/banner-sdm.webp",
    requiresCeremony: true, // 장소(예식장) 전제 완성본
  },
  {
    id: "dress-tour",
    title: "방구석 드레스 투어",
    description: "내 사진으로 드레스 핏을 미리 확인",
    status: "active",
    href: "/ai-studio/dress-tour",
    previewImage: "/ai-studio-previews/banner-dress.webp",
  },
  {
    id: "makeup-finder",
    title: "착붙 메이크업 찾기",
    description: "나에게 어울리는 신부 메이크업 시연",
    status: "active",
    href: "/ai-studio/makeup-room",
    previewImage: "/ai-studio-previews/banner-makeup.webp",
  },
  {
    id: "hair-room",
    title: "헤어 변형 미리보기",
    description: "내 얼굴 그대로, 헤어스타일·컬러 9그리드 (옵션당 5하트)",
    status: "active",
    href: "/ai-studio/hair-room",
    previewImage: "/ai-studio-previews/banner-hair.webp",
  },
  {
    id: "paper-invitation",
    title: "정성가득 종이 청첩장",
    description: "인쇄용 PDF로 받는 종이 청첩장 — 무료 템플릿 시작",
    status: "active",
    href: "/invitation/new?format=paper",
    previewImage: "/ai-studio-previews/banner-invitation.webp",
    requiresCeremony: true, // 청첩장 = 예식 전제
  },
  {
    id: "mobile-invitation",
    title: "간편 모바일 청첩장",
    description: "정보 입력 + 공유 링크 + QR 코드까지 한 번에",
    status: "coming_soon",
    requiresCeremony: true, // 청첩장 = 예식 전제
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
    requiresCeremony: true, // 식전 영상 = 예식 전제
  },
];

const lockedBadge: Partial<Record<StudioCard["status"], string>> = {
  coming_soon: "준비중",
  coming_v2: "준비중",
  coming_v3: "한정 외주",
};

const AIStudio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: CategoryTab = "ai-studio";
  const [waitlistCard, setWaitlistCard] = useState<StudioCard | null>(null);
  const { personaMode, isLoaded } = usePersonaInsights();
  const { weddingSettings } = useWeddingSchedule();
  const role = weddingSettings.role ?? null;

  // I2a — 노웨딩·스냅 페르소나엔 예식 전제 카드(스드메 완성본·청첩장·식전영상)만 숨긴다.
  // 스타일링 카드는 유지하므로 빈 스튜디오가 되지 않는다. 로드 전(persona_mode null→standard_bride)
  // 이나 비해당 페르소나는 전부 노출(기본 안전). 분류 후에만 필터가 발동한다.
  // 개인화(P3): 로드 후 역할·페르소나로 카드 순서만 재정렬(숨김 아님 — rankStudioCardIds).
  const visibleCards = useMemo(() => {
    const filtered = cards.filter(
      (c) => !(c.requiresCeremony && isLoaded && shouldHideWeddingCeremony(personaMode)),
    );
    if (!isLoaded) return filtered; // 분류 전엔 기본 순서(안전)
    const order = rankStudioCardIds(filtered.map((c) => c.id), { personaMode, role });
    const byId = new Map(filtered.map((c) => [c.id, c]));
    return order.map((id) => byId.get(id)!);
  }, [personaMode, isLoaded, role]);

  // 성향/역할 힌트 — 없으면 렌더 안 함(노이즈 방지).
  const personaHint = isLoaded ? studioPersonaHint({ personaMode, role }) : null;

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
        {personaHint && (
          <p className="mx-4 mt-3 text-[12px] text-primary">{personaHint}</p>
        )}
        {/* 모바일=1열 전체폭 배너, 데스크톱(≥1024px, 칼럼 960px)=2열로 채워 가로 늘어짐 방지 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 px-4 py-5">
          {visibleCards.map((card, index) => {
            const isActive = card.status === "active" && !!card.href;
            return (
              <StudioBannerCard
                key={card.id}
                title={card.title}
                description={card.description}
                imageUrl={card.previewImage}
                imageAlt={card.previewImage ? `${card.title} 미리보기` : ""}
                badge={isActive ? undefined : lockedBadge[card.status]}
                locked={!isActive}
                ctaLabel={isActive ? "지금 시작 →" : "출시 알림 받기 →"}
                colorIndex={index}
                priority={index < 2}
                dataTutorial={card.id === "wedding-consulting" ? "studio-cards" : undefined}
                onClick={() => (isActive ? navigate(card.href!) : handleLockedCardClick(card))}
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
