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

const ReviewCard = ({ rating, review, vendorName }: ReviewCardProps) => (
  <div className="flex-shrink-0 w-[200px] h-[120px] p-3 bg-[#d9d9d9] rounded-[10px] flex flex-col">
    <div className="flex items-center gap-0.5 mb-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < rating ? "fill-amber-400 text-amber-400" : "fill-white/40 text-white/40"}`}
        />
      ))}
    </div>
    <p className="text-[11px] text-black leading-tight line-clamp-3 flex-1">
      {review}
    </p>
    <p className="text-[10px] font-medium text-black/80 mt-1 truncate">
      {vendorName}
    </p>
  </div>
);

interface ReviewData {
  title: string;
  subtitle: string;
  reviews: Omit<ReviewCardProps, 'key'>[];
}

const reviewDataMap: Record<CategoryTab, ReviewData> = {
  "ai-planner": {
    title: "리얼 후기",
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
    <section className="pt-[10px] pb-[30px] px-[30px] bg-[hsl(var(--pink-100))]">
      <h2 className="text-[16px] font-bold text-black mb-[10px]">{data.title}</h2>
      <div className="flex gap-[10px] overflow-x-auto scrollbar-hide">
        {data.reviews.map((review, index) => (
          <ReviewCard key={index} {...review} />
        ))}
      </div>
    </section>
  );
};

export default ReviewSection;
