import { Star, MessageSquare } from "lucide-react";

interface HanbokReviewTabProps {
  rating: number;
  reviewCount: number;
}

const HanbokReviewTab = ({ rating, reviewCount }: HanbokReviewTabProps) => {
  if (reviewCount === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">아직 등록된 후기가 없습니다</p>
        <p className="text-xs text-muted-foreground">첫 후기를 남겨주세요</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-secondary rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
          <span className="text-4xl font-bold">{rating.toFixed(1)}</span>
        </div>
        <p className="text-muted-foreground text-sm">{reviewCount.toLocaleString()}개의 리뷰</p>
      </div>
    </div>
  );
};

export default HanbokReviewTab;
