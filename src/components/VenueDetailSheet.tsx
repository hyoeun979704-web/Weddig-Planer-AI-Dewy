import { Star, MapPin, Users, Phone, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Venue } from "@/hooks/useVenues";

interface VenueDetailSheetProps {
  venue: Venue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatKoreanWon = (price: number): string => {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(0)}만원`;
  }
  return `${price.toLocaleString()}원`;
};

const VenueDetailSheet = ({ venue, open, onOpenChange }: VenueDetailSheetProps) => {
  if (!venue) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <div className="relative">
          {/* Header Image */}
          <div className="relative aspect-[16/9] bg-muted">
            {venue.thumbnail_url ? (
              <img
                src={venue.thumbnail_url}
                alt={venue.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <span className="text-6xl">💒</span>
              </div>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            {venue.is_partner && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                파트너
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="text-xl font-bold">{venue.name}</SheetTitle>
            </SheetHeader>

            {/* Location */}
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{venue.address}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1.5 rounded-full">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-sm">{venue.rating.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground text-sm">
                리뷰 {venue.review_count.toLocaleString()}개
              </span>
            </div>

            {/* Price Info */}
            <div className="bg-secondary rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-muted-foreground text-sm">식대 (1인)</span>
                <span className="font-bold text-primary text-lg">
                  {formatKoreanWon(venue.price_per_person)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Users className="w-4 h-4" />
                  <span>최소 보증인원</span>
                </div>
                <span className="font-medium">{venue.min_guarantee}명</span>
              </div>
              <div className="border-t border-border mt-3 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">예상 최소 비용</span>
                  <span className="font-bold text-lg">
                    {formatKoreanWon(venue.price_per_person * venue.min_guarantee)}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 gap-2">
                <Phone className="w-4 h-4" />
                전화 문의
              </Button>
              <Button className="flex-1 h-12">
                견적 요청
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VenueDetailSheet;
