import { Star, ThumbsUp } from "lucide-react";

interface HanbokReviewTabProps {
  rating: number;
  reviewCount: number;
}

const mockReviews = [
  { id: "1", author: "신부1", date: "2025.02.10", rating: 5, content: "한복이 정말 예쁘고 색감이 화사해요! 사장님도 친절하시고 좋은 경험이었습니다.", likes: 15 },
  { id: "2", author: "신부2", date: "2025.01.20", rating: 5, content: "전통 한복도 예쁘고 퓨전 한복도 너무 세련됐어요. 추천합니다!", likes: 10 },
  { id: "3", author: "신부3", date: "2025.01.05", rating: 4, content: "맞춤 제작 퀄리티가 정말 좋았습니다. 다만 제작 기간이 조금 길었어요.", likes: 8 },
];

const HanbokReviewTab = ({ rating, reviewCount }: HanbokReviewTabProps) => {
  return (
    <div className="p-4 space-y-6">
      {/* Rating Summary */}
      <div className="bg-secondary rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
          <span className="text-4xl font-bold">{rating.toFixed(1)}</span>
        </div>
        <p className="text-muted-foreground text-sm">{reviewCount.toLocaleString()}개의 리뷰</p>
        <div className="mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const percentage = star === 5 ? 70 : star === 4 ? 22 : star === 3 ? 8 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-muted-foreground">{star}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        <h3 className="font-bold">후기</h3>
        {mockReviews.map((review) => (
          <div key={review.id} className="border-b border-border pb-4 last:border-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">{review.author[0]}</div>
                <div>
                  <p className="font-medium text-sm">{review.author}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} />
                ))}
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-3">{review.content}</p>
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ThumbsUp className="w-4 h-4" />
              <span>도움이 돼요 {review.likes}</span>
            </button>
          </div>
        ))}
      </div>

      <button className="w-full py-3 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
        후기 더보기
      </button>
    </div>
  );
};

export default HanbokReviewTab;
