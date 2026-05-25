import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CategoryHeroBanner from "@/components/CategoryHeroBanner";
import CategoryFilterBar from "@/components/CategoryFilterBar";
import CategoryGrid from "@/components/CategoryGrid";
import ExcludedCategoryBanner from "@/components/ExcludedCategoryBanner";
import VenueAnchorBanner from "@/components/persona/VenueAnchorBanner";
import { useCategoryFilterStore } from "@/stores/useCategoryFilterStore";
import { CategoryItem } from "@/hooks/useCategoryData";
import { useDefaultRegion } from "@/hooks/useDefaultRegion";
import { normalizeRegion } from "@/lib/regions";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { bumpSignal, SIGNAL_KEYS } from "@/lib/behavioralSignals";

const Suit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasActiveFilters = useCategoryFilterStore((state) => state.hasActiveFilters);
  const initWithRegion = useCategoryFilterStore((state) => state.initWithRegion);
  const { defaultRegion, isLoaded } = useDefaultRegion();
  const { weddingSettings } = useWeddingSchedule();

  useEffect(() => { if (isLoaded) initWithRegion(normalizeRegion(defaultRegion)); }, [isLoaded]);

  // Round 8 B + Round 9 fix — 신랑 카테고리 진입 1세션 1회 증분 (sessionStorage 가드).
  // user.id 를 key 에 넣으면 anon→login 전환 시 rebump. 세션 단위 단일 key 가 의도.
  useEffect(() => {
    if (weddingSettings.role === "groom") return; // 이미 신랑이면 신호 불필요.
    if (typeof window === "undefined") return;
    const GUARD = `dewy:signal-bumped:groom-role`;
    if (sessionStorage.getItem(GUARD) === "1") return;
    bumpSignal(SIGNAL_KEYS.groomRoleHint);
    sessionStorage.setItem(GUARD, "1");
  }, [weddingSettings.role]);

  const handleItemClick = (item: CategoryItem) => { navigate(`/suit/${item.id}`); };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="예복" />
      <main className="pb-20">
        <ExcludedCategoryBanner scheduleCategories="tailor_shop" />
        <CategoryHeroBanner category="suits" />
        <VenueAnchorBanner />
        <CategoryFilterBar category="suits" />
        <div className="px-4 py-3">
          <h2 className="text-lg font-bold text-foreground">{hasActiveFilters() ? "검색 결과" : "인기 예복"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{hasActiveFilters() ? "필터 조건에 맞는 예복샵입니다" : "신랑을 위한 완벽한 예복 컬렉션"}</p>
        </div>
        <CategoryGrid category="suits" onItemClick={handleItemClick} />
      </main>
      <BottomNav activeTab={location.pathname} onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Suit;
