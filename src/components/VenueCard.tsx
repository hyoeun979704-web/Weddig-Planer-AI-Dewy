import { Star, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface VenueCardProps {
  id: string;
  name: string;
  address: string;
  pricePerPerson: number;
  rating: number;
  thumbnailUrl?: string | null;
  onClick?: () => void;
}

const formatKoreanWon = (price: number): string => {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(0)}만원`;
  }
  return `${price.toLocaleString()}원`;
};

const VenueCard = ({
  name,
  address,
  pricePerPerson,
  rating,
  thumbnailUrl,
  onClick,
}: VenueCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl overflow-hidden shadow-sm border border-border",
        "transition-all duration-200 active:scale-[0.98] cursor-pointer",
        "hover:shadow-md"
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-4xl">💒</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1 text-muted-foreground mb-1">
          <MapPin className="w-3 h-3" />
          <span className="text-xs truncate">{address}</span>
        </div>

        <h3 className="font-semibold text-sm text-foreground mb-2 line-clamp-1">{name}</h3>

        {pricePerPerson > 0 && (
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-primary font-bold text-sm">{formatKoreanWon(pricePerPerson)}</span>
            <span className="text-muted-foreground text-xs">/인</span>
          </div>
        )}

        {rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-foreground">{rating}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const VenueCardSkeleton = () => {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-sm border border-border">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-3">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
};

export default VenueCard;
