import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCoupleFavorites } from "@/hooks/useCoupleFavorites";
import type { ItemType } from "@/hooks/useFavorites";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  itemId: string;
  itemType: ItemType;
  className?: string;
  variant?: "default" | "overlay";
  /**
   * Hide the partner-favorited dot indicator. Defaults to false — the
   * indicator is the visible payoff of being couple-linked, so we keep it
   * on unless a specific surface needs the icon to stay clean (e.g.
   * already-busy hero overlays).
   */
  hidePartnerIndicator?: boolean;
}

export const FavoriteButton = ({
  itemId,
  itemType,
  className,
  variant = "default",
  hidePartnerIndicator = false,
}: FavoriteButtonProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const haptic = useHaptic();
  const { isFavorite, toggleFavorite, isToggling, isLinked, partnerLikes } =
    useCoupleFavorites();

  const isFav = isFavorite(itemId, itemType);
  const partnerHasFav = isLinked && partnerLikes(itemId, itemType);
  const showPairBadge = !hidePartnerIndicator && partnerHasFav;
  const bothLiked = isFav && partnerHasFav;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/auth");
      return;
    }

    haptic.light();
    await toggleFavorite(itemId, itemType);
  };

  const baseStyles =
    variant === "overlay"
      ? "w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95 relative"
      : "p-2 rounded-full transition-colors relative";

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={cn(baseStyles, className)}
      aria-label={
        bothLiked
          ? "둘 다 찜한 항목 — 찜 해제"
          : partnerHasFav
            ? "파트너가 찜한 항목"
            : isFav
              ? "찜 해제"
              : "찜하기"
      }
      title={bothLiked ? "둘 다 좋아해요 💕" : partnerHasFav ? "파트너가 찜했어요" : undefined}
    >
      <Heart
        className={cn(
          "w-5 h-5 transition-colors",
          isFav ? "fill-destructive text-destructive" : "text-foreground"
        )}
      />
      {showPairBadge && (
        <span
          aria-hidden
          className={cn(
            // Tiny dot top-right of the heart. When both partners have
            // favorited it, swap to a slightly bigger filled circle that
            // reads as "둘 다" without needing copy.
            "absolute -top-0.5 -right-0.5 rounded-full ring-2 ring-background",
            bothLiked
              ? "w-2.5 h-2.5 bg-destructive"
              : "w-2 h-2 bg-[#7BB6E0]"
          )}
        />
      )}
    </button>
  );
};
