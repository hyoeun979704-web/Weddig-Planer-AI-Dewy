import { Star, ThumbsUp } from "lucide-react";

interface SuitReviewTabProps {
  rating: number;
  reviewCount: number;
}

const mockReviews = [
  { id: "1", author: "신랑1", date: "2025.02.10", rating: 5, content: "핏이 정말 좋고 퀄리티도 훌륭합니다. 직원분들도 친절하셨어요!", likes: 18 },
  { id: "2", author: "신랑2", date: "2025.01.20", rating: 5, content: "다양한 브랜드를 한곳에서 비교할 수 있어서 좋았습니다. 수선도 꼼꼼해요.", likes: 12 },
  { id: "3", author: "신랑3", date: "2025.01.05", rating: 4, content: "예복 퀄리티 대비 가격이 합리적이었습니다. 추천합니다.", likes: 9 },
];

const SuitReviewTab = ({ rating, reviewCount }: SuitReviewTabProps) => {
  return (
    <div className="p-4 space-y-6">
      <div className="bg-secondary rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
          <span className="text-4xl font-bold">{rating.toFixed(1)}</span>
        </div>
        <p className="text-muted-foreground text-sm">{reviewCount.toLocaleString()}개의 리뷰</p>
        <div className="mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const percentage = star === 5 ? 72 : star === 4 ? 20 : star === 3 ? 8 : 0;
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

export default SuitReviewTab;
