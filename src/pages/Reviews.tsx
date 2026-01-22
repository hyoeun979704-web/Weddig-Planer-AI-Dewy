import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Star, Quote } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const allReviews = [
  { rating: 5, review: "처음부터 끝까지 정말 만족스러웠어요. 특히 담당 플래너분이 꼼꼼하게 챙겨주셔서 너무 감사했습니다!", vendorName: "더채플앳청담", vendorType: "웨딩홀", userName: "김**님", date: "2025.01.15" },
  { rating: 5, review: "드레스가 정말 다양하고 예뻤어요. 피팅 때마다 친절하게 도와주셔서 좋은 선택할 수 있었습니다.", vendorName: "라움스튜디오", vendorType: "스튜디오", userName: "이**님", date: "2025.01.12" },
  { rating: 5, review: "몰디브 정말 꿈같았어요! 수상빌라에서의 일주일이 평생 잊지 못할 추억이 됐습니다.", vendorName: "몰디브 리조트", vendorType: "허니문", userName: "강**님", date: "2025.01.13" },
  { rating: 5, review: "삼성 비스포크 세트로 구매했는데 인테리어와 너무 잘 어울려요. 할인도 많이 받았습니다!", vendorName: "삼성 비스포크", vendorType: "가전", userName: "한**님", date: "2025.01.14" },
  { rating: 5, review: "음식이 정말 맛있었다고 하객분들께서 많이 칭찬해주셨어요. 서비스도 전반적으로 좋았습니다.", vendorName: "그랜드힐튼", vendorType: "웨딩홀", userName: "박**님", date: "2025.01.10" },
  { rating: 5, review: "차이킴 한복 정말 세련됐어요. 현대적이면서도 우아해서 폐백 때 많이 칭찬받았어요!", vendorName: "차이킴", vendorType: "한복", userName: "권**님", date: "2025.01.13" },
  { rating: 4, review: "공간이 넓고 아늑해서 좋았어요. 다만 주차 공간이 조금 부족했던 점이 아쉬웠습니다.", vendorName: "루벨아뜨리움", vendorType: "웨딩홀", userName: "이**님", date: "2025.01.08" },
  { rating: 5, review: "맞춤 수트 핏이 정말 좋아요. 수선도 꼼꼼하게 해주셨습니다.", vendorName: "제니아", vendorType: "맞춤정장", userName: "오**님", date: "2025.01.14" },
];

const Reviews = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">리얼 후기</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-4">
        <p className="text-sm text-muted-foreground mb-6">
          실제 이용 고객님들의 생생한 후기
        </p>
        
        <div className="space-y-3">
          {allReviews.map((review, index) => (
            <div
              key={index}
              className="p-4 bg-card rounded-2xl border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
              
              <div className="relative mb-3">
                <Quote className="absolute -top-1 -left-1 w-4 h-4 text-primary/20" />
                <p className="text-sm text-foreground leading-relaxed pl-3">
                  {review.review}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <p className="text-xs font-medium text-foreground">{review.vendorName}</p>
                  <p className="text-xs text-muted-foreground">{review.vendorType}</p>
                </div>
                <p className="text-xs text-muted-foreground">{review.userName}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Reviews;
