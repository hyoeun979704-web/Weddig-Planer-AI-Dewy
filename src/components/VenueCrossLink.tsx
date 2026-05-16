import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";

type Variant = "venues" | "invitation-venues";

/**
 * 웨딩홀 ↔ 청첩장·모임 양방향 cross-link.
 *
 * - 모든 사용자: 상단에 작은 chip 으로 다른 카테고리 진입 링크 노출.
 * - 결혼 스타일이 'small' / 'self' 인데 일반 웨딩홀 페이지(/venues)에 있는 경우:
 *   더 큰 추천 카드로 청첩장·모임 페이지를 권유 (1회 dismiss 가능).
 */
const VenueCrossLink = ({ variant }: { variant: Variant }) => {
  const { weddingSettings } = useWeddingSchedule();
  const style = weddingSettings.wedding_style;

  const dismissKey =
    variant === "venues" ? "venues-style-suggest-dismissed" : "";
  const [styleSuggestDismissed, setStyleSuggestDismissed] = useState(() => {
    if (typeof window === "undefined" || !dismissKey) return false;
    return window.localStorage.getItem(dismissKey) === "1";
  });

  const showStyleSuggest =
    variant === "venues" &&
    (style === "small" || style === "self") &&
    !styleSuggestDismissed;

  const handleDismiss = () => {
    if (dismissKey) {
      try {
        window.localStorage.setItem(dismissKey, "1");
      } catch {
        // localStorage 사용 불가시 무시 (현세션 한정으로만 닫힘)
      }
    }
    setStyleSuggestDismissed(true);
  };

  const oppositeHref =
    variant === "venues" ? "/invitation-venues" : "/venues";
  const oppositeLabel =
    variant === "venues" ? "청첩장·모임 보기" : "웨딩홀 보기";

  return (
    <div className="px-4 pt-3 space-y-2">
      {showStyleSuggest && (
        <div className="relative rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 pr-9">
          <button
            onClick={handleDismiss}
            aria-label="안내 닫기"
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {style === "self"
                  ? "셀프웨딩 신부님께 추천"
                  : "스몰웨딩 신부님께 추천"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                소규모 모임·하우스·한옥 공간은{" "}
                <span className="font-medium text-foreground">청첩장·모임</span>{" "}
                페이지가 더 잘 맞아요.
              </p>
              <Link
                to="/invitation-venues"
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary"
              >
                청첩장·모임 페이지로 이동
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Link
          to={oppositeHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {oppositeLabel}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};

export default VenueCrossLink;
