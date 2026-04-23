import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, Quote } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";

interface ReviewCardProps {
  rating: number;
  review: string;
  vendorName: string;
  vendorType: string;
  userName: string;
  date: string;
}

const ReviewCard = ({ rating, review, vendorName, vendorType, userName, date }: ReviewCardProps) => (
  <div className="flex-shrink-0 w-72 p-4 bg-card rounded-2xl border border-border">
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`w-3.5 h-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{date}</span>
    </div>
    
    <div className="relative mb-3">
      <Quote className="absolute -top-1 -left-1 w-4 h-4 text-primary/20" />
      <p className="text-sm text-foreground leading-relaxed line-clamp-3 pl-3">
        {review}
      </p>
    </div>
    
    <div className="flex items-center justify-between pt-3 border-t border-border">
      <div>
        <p className="text-xs font-medium text-foreground">{vendorName}</p>
        <p className="text-xs text-muted-foreground">{vendorType}</p>
      </div>
      <p className="text-xs text-muted-foreground">{userName}</p>
    </div>
  </div>
);

interface ReviewData {
  title: string;
  subtitle: string;
  reviews: Omit<ReviewCardProps, 'key'>[];
}

const reviewDataMap: Record<CategoryTab, ReviewData> = {
  "ai-planner": {
    title: "예비부부 리얼 후기",
    subtitle: "스드메 실제 이용 후기",
    reviews: [
      { rating: 5, review: "처음부터 끝까지 정말 만족스러웠어요. 특히 담당 플래너분이 꼼꼼하게 챙겨주셔서 너무 감사했습니다!", vendorName: "라르고스튜디오", vendorType: "스드메", userName: "김**님", date: "2025.01.15" },
      { rating: 5, review: "촬영 컷이 정말 예뻐요. 자연스러운 분위기를 잘 잡아주셔서 대만족입니다.", vendorName: "아이디어스튜디오", vendorType: "스드메", userName: "박**님", date: "2025.01.10" },
      { rating: 4, review: "합리적인 가격에 퀄리티 높은 촬영이 가능해서 추천드려요.", vendorName: "더샵스튜디오", vendorType: "스드메", userName: "이**님", date: "2025.01.08" },
    ],
  },
  "ai-studio": {
    title: "AI 스튜디오 후기",
    subtitle: "직접 사용해본 리얼 후기",
    reviews: [
      { rating: 5, review: "드레스 시뮬레이션이 너무 정확해요! 실제로 입어보니 AI 추천이 딱 맞았어요.", vendorName: "AI 스튜디오", vendorType: "드레스", userName: "김**님", date: "2025.01.15" },
      { rating: 5, review: "헤어 스타일 미리보기로 고민을 덜었어요. 진짜 편리합니다.", vendorName: "AI 스튜디오", vendorType: "헤어", userName: "이**님", date: "2025.01.11" },
      { rating: 4, review: "웨딩 컨셉 추천이 마음에 쏙 들었어요. 덕분에 빨리 결정했습니다.", vendorName: "AI 스튜디오", vendorType: "컨셉", userName: "박**님", date: "2025.01.07" },
    ],
  },
  events: {
    title: "이벤트 참여 후기",
    subtitle: "혜택을 받은 실제 후기",
    reviews: [
      { rating: 5, review: "파트너 혜택으로 웨딩홀 할인 받았어요! 예상보다 많이 절약했습니다.", vendorName: "듀이 파트너", vendorType: "이벤트", userName: "김**님", date: "2025.01.15" },
      { rating: 5, review: "시즌 이벤트로 스드메 패키지 할인받았는데 정말 좋았어요.", vendorName: "듀이 이벤트", vendorType: "이벤트", userName: "이**님", date: "2025.01.12" },
      { rating: 4, review: "쿠폰 혜택이 다양해서 여러 곳에서 할인받을 수 있었어요.", vendorName: "듀이 쿠폰", vendorType: "이벤트", userName: "박**님", date: "2025.01.08" },
    ],
  },
  shopping: {
    title: "쇼핑 리얼 후기",
    subtitle: "구매자 실제 후기",
    reviews: [
      { rating: 5, review: "삼성 비스포크 세트로 구매했는데 인테리어와 너무 잘 어울려요!", vendorName: "삼성 비스포크", vendorType: "가전", userName: "한**님", date: "2025.01.14" },
      { rating: 4, review: "시몬스 침대 정말 편해요. 배송 설치까지 깔끔하게 해주셨습니다.", vendorName: "시몬스", vendorType: "가구", userName: "윤**님", date: "2025.01.11" },
      { rating: 5, review: "한샘 리하우스로 인테리어 했는데 신혼집이 너무 예뻐졌어요!", vendorName: "한샘", vendorType: "인테리어", userName: "송**님", date: "2025.01.07" },
    ],
  },
  tips: {
    title: "웨딩 정보 후기",
    subtitle: "전문가 추천 후기",
    reviews: [
      { rating: 5, review: "전문가 추천으로 스튜디오 선택했는데 대만족이에요!", vendorName: "라움스튜디오", vendorType: "스튜디오", userName: "이**님", date: "2025.01.12" },
      { rating: 5, review: "정보 콘텐츠 보고 결정했는데 실제로도 너무 좋았어요.", vendorName: "블러썸뷰티", vendorType: "메이크업", userName: "최**님", date: "2025.01.08" },
      { rating: 4, review: "리얼 후기가 많아서 참고하기 좋았어요. 추천드려요!", vendorName: "모먼트스튜디오", vendorType: "스튜디오", userName: "정**님", date: "2025.01.05" },
    ],
  },
};

interface ReviewSectionProps {
  activeTab?: CategoryTab;
}

const ReviewSection = ({ activeTab = "ai-planner" }: ReviewSectionProps) => {
  const navigate = useNavigate();
  const data = reviewDataMap[activeTab];

  return (
    <section className="py-6 bg-accent/30">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{data.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{data.subtitle}</p>
        </div>
        <button 
          onClick={() => navigate("/reviews")}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          더보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {data.reviews.map((review, index) => (
          <ReviewCard key={index} {...review} />
        ))}
      </div>
    </section>
  );
};

export default ReviewSection;
