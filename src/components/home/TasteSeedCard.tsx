import { useState } from "react";
import { Sparkles, ChevronRight, X } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { usePersonaInsights } from "@/hooks/usePersonaInsights";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { safeLocalStorage } from "@/lib/safeLocalStorage";
import StyleSwipeSheet from "@/components/onboarding/StyleSwipeSheet";

// 스타일 취향 신호로 치는 favorites item_type(장소 4종). 이 개수로 "취향 seed 됨" 판단.
const STYLE_ITEM_TYPES = new Set(["venue", "studio", "dress", "makeup"]);
const DISMISS_KEY = "dewy.tasteSeed.dismissed";
// 이만큼 스타일 찜이 쌓이면 카드를 자동으로 숨긴다(이미 취향이 충분 → 잔존 CTA 방지).
const SEEDED_THRESHOLD = 3;

/**
 * I1 — 온보딩 시각취향 seed 진입 카드. 온보딩을 마쳤지만 아직 스타일 취향(찜)이 거의
 * 없는 사용자에게만 노출하고, 취향이 쌓이거나 사용자가 닫으면 사라진다(dead-end 방지).
 * 실제 동작은 StyleSwipeSheet(스타일 카드를 골라 favorites 에 seed).
 */
const TasteSeedCard = () => {
  const { hasOnboarded } = usePersonaInsights();
  const { favorites } = useFavorites();
  const { weddingSettings } = useWeddingSchedule();
  const [open, setOpen] = useState(false);
  // 렌더 경로의 localStorage 접근은 안전 어댑터로(iOS 화이트스크린 회귀 방지).
  const [dismissed, setDismissed] = useState(() => safeLocalStorage.getItem(DISMISS_KEY) === "1");

  const styleFavCount = favorites.filter((f) => STYLE_ITEM_TYPES.has(f.item_type)).length;

  // 온보딩 전(HomeOnboardingCard 영역)·이미 취향 충분·사용자가 닫음 → 숨김.
  if (!hasOnboarded || dismissed || styleFavCount >= SEEDED_THRESHOLD) return null;

  const dismiss = () => {
    safeLocalStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      <section className="px-5 pt-3">
        <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <button
            onClick={dismiss}
            aria-label="닫기"
            className="absolute top-2.5 right-2.5 p-1 text-muted-foreground/60"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-5">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-foreground">취향 알려주고 맞춤 추천 받기</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                마음에 드는 스타일 몇 개만 골라주면, 홈 추천이 내 취향으로 더 정확해져요.
              </p>
              <button
                onClick={() => setOpen(true)}
                className="mt-2.5 inline-flex items-center gap-0.5 text-[13px] font-bold text-primary"
              >
                취향 고르기
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <StyleSwipeSheet open={open} onOpenChange={setOpen} region={weddingSettings.wedding_region} />
    </>
  );
};

export default TasteSeedCard;
