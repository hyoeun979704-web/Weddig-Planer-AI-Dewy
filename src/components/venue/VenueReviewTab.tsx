import { Star, ThumbsUp } from "lucide-react";

interface VenueReviewTabProps {
  rating: number;
  reviewCount: number;
}

interface Review {
  id: string;
  author: string;
  date: string;
  rating: number;
  content: string;
  likes: number;
  images?: string[];
}

// Mock reviews for demo
const mockReviews: Review[] = [
  {
    id: "1",
    author: "김*연",
    date: "2025.01.15",
    rating: 5,
    content: "정말 아름다운 웨딩홀이었습니다. 직원분들도 너무 친절하시고 음식도 맛있었어요. 하객분들도 모두 만족하셨습니다. 버진로드 길이가 길어서 입장할 때 정말 감동적이었어요!",
    likes: 24,
    images: ["/placeholder.svg", "/placeholder.svg"]
  },
  {
    id: "2",
    author: "박*수",
    date: "2025.01.10",
    rating: 5,
    content: "사전 답사 때부터 세심하게 챙겨주셔서 감사했어요. 당일 진행도 완벽했고, 사진도 너무 예쁘게 나왔습니다.",
    likes: 18
  },
  {
    id: "3",
    author: "이*진",
    date: "2025.01.05",
    rating: 4,
    content: "전반적으로 만족스러웠습니다. 위치도 좋고 시설도 깔끔해요. 다만 주차 공간이 조금 부족한 편이에요.",
    likes: 12
  }
];

const VenueReviewTab = ({ rating, reviewCount }: VenueReviewTabProps) => {
  return (
    <div className="p-4 space-y-6">
      {/* Rating Summary */}
      <div className="bg-secondary rounded-2xl p-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
          <span className="text-4xl font-bold">{rating.toFixed(1)}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          {reviewCount.toLocaleString()}개의 리뷰
        </p>
        
        {/* Rating Bars */}
        <div className="mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const percentage = star === 5 ? 75 : star === 4 ? 20 : star === 3 ? 5 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-muted-foreground">{star}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        <h3 className="font-bold">포토 후기</h3>
        
        {mockReviews.map((review) => (
          <div key={review.id} className="border-b border-border pb-4 last:border-0">
            {/* Review Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {review.author[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{review.author}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i}
                    className={`w-3 h-3 ${
                      i < review.rating 
                        ? "fill-yellow-400 text-yellow-400" 
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Review Images */}
            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {review.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`리뷰 이미지 ${index + 1}`}
                    className="w-20 h-20 rounded-lg object-cover shrink-0"
                  />
                ))}
              </div>
            )}

            {/* Review Content */}
            <p className="text-sm text-foreground leading-relaxed mb-3">
              {review.content}
            </p>

            {/* Review Actions */}
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ThumbsUp className="w-4 h-4" />
              <span>도움이 돼요 {review.likes}</span>
            </button>
          </div>
        ))}
      </div>

      {/* More Reviews Button */}
      <button className="w-full py-3 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
        후기 더보기
      </button>
    </div>
  );
};

export default VenueReviewTab;
