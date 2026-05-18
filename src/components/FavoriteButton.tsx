import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites, ItemType } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  itemId: string;
  itemType: ItemType;
  className?: string;
  variant?: "default" | "overlay";
}

export const FavoriteButton = ({
  itemId,
  itemType,
  className,
  variant = "default",
}: FavoriteButtonProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();

  const isFav = isFavorite(itemId, itemType);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/auth");
      return;
    }

    await toggleFavorite(itemId, itemType);
  };

  const baseStyles = variant === "overlay"
    ? "w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-95"
    : "p-2 rounded-full transition-colors";

  return (
    <button
      onClick={handleClick}
      disabled={isToggling}
      className={cn(baseStyles, className)}
      aria-label={isFav ? "찜 해제" : "찜하기"}
    >
      <Heart
        className={cn(
          "w-5 h-5 transition-colors",
          isFav ? "fill-destructive text-destructive" : "text-foreground"
        )}
      />
    </button>
  );
};
