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
  "home": {
    title: "예비부부 리얼 후기",
    subtitle: "웨딩홀 실제 이용 후기",
    reviews: [
      { rating: 5, review: "처음부터 끝까지 정말 만족스러웠어요. 특히 담당 플래너분이 꼼꼼하게 챙겨주셔서 너무 감사했습니다!", vendorName: "더채플앳청담", vendorType: "웨딩홀", userName: "김**님", date: "2025.01.15" },
      { rating: 5, review: "음식이 정말 맛있었다고 하객분들께서 많이 칭찬해주셨어요. 서비스도 전반적으로 좋았습니다.", vendorName: "그랜드힐튼", vendorType: "웨딩홀", userName: "박**님", date: "2025.01.10" },
      { rating: 4, review: "공간이 넓고 아늑해서 좋았어요. 다만 주차 공간이 조금 부족했던 점이 아쉬웠습니다.", vendorName: "루벨아뜨리움", vendorType: "웨딩홀", userName: "이**님", date: "2025.01.08" },
    ],
  },
  "wedding-hall": {
    title: "예비부부 리얼 후기",
    subtitle: "웨딩홀 실제 이용 후기",
    reviews: [
      { rating: 5, review: "처음부터 끝까지 정말 만족스러웠어요. 특히 담당 플래너분이 꼼꼼하게 챙겨주셔서 너무 감사했습니다!", vendorName: "더채플앳청담", vendorType: "웨딩홀", userName: "김**님", date: "2025.01.15" },
      { rating: 5, review: "음식이 정말 맛있었다고 하객분들께서 많이 칭찬해주셨어요. 서비스도 전반적으로 좋았습니다.", vendorName: "그랜드힐튼", vendorType: "웨딩홀", userName: "박**님", date: "2025.01.10" },
      { rating: 4, review: "공간이 넓고 아늑해서 좋았어요. 다만 주차 공간이 조금 부족했던 점이 아쉬웠습니다.", vendorName: "루벨아뜨리움", vendorType: "웨딩홀", userName: "이**님", date: "2025.01.08" },
    ],
  },
  "sdm": {
    title: "스드메 리얼 후기",
    subtitle: "스튜디오·드레스·메이크업 후기",
    reviews: [
      { rating: 5, review: "드레스가 정말 다양하고 예뻤어요. 피팅 때마다 친절하게 도와주셔서 좋은 선택할 수 있었습니다.", vendorName: "라움스튜디오", vendorType: "스튜디오", userName: "이**님", date: "2025.01.12" },
      { rating: 5, review: "메이크업 너무 자연스럽게 해주셨어요. 어머니들 메이크업도 같이 해주셨는데 다들 만족하셨습니다.", vendorName: "블러썸뷰티", vendorType: "메이크업", userName: "최**님", date: "2025.01.08" },
      { rating: 4, review: "촬영 컨셉이 다양해서 좋았어요. 야외 촬영까지 포함된 패키지 추천드려요!", vendorName: "모먼트스튜디오", vendorType: "스튜디오", userName: "정**님", date: "2025.01.05" },
    ],
  },
  "honeymoon-gifts": {
    title: "혼수 리얼 후기",
    subtitle: "가전·가구 구매 후기",
    reviews: [
      { rating: 5, review: "삼성 비스포크 세트로 구매했는데 인테리어와 너무 잘 어울려요. 할인도 많이 받았습니다!", vendorName: "삼성 비스포크", vendorType: "가전", userName: "한**님", date: "2025.01.14" },
      { rating: 4, review: "시몬스 침대 정말 편해요. 배송 설치까지 깔끔하게 해주셨습니다.", vendorName: "시몬스", vendorType: "가구", userName: "윤**님", date: "2025.01.11" },
      { rating: 5, review: "한샘 리하우스로 인테리어 했는데 신혼집이 너무 예뻐졌어요!", vendorName: "한샘", vendorType: "인테리어", userName: "송**님", date: "2025.01.07" },
    ],
  },
  "honeymoon": {
    title: "허니문 리얼 후기",
    subtitle: "신혼여행 생생 후기",
    reviews: [
      { rating: 5, review: "몰디브 정말 꿈같았어요! 수상빌라에서의 일주일이 평생 잊지 못할 추억이 됐습니다.", vendorName: "몰디브 리조트", vendorType: "허니문", userName: "강**님", date: "2025.01.13" },
      { rating: 5, review: "발리 스냅 촬영까지 포함된 패키지였는데 사진이 너무 예쁘게 나왔어요!", vendorName: "발리 투어", vendorType: "허니문", userName: "임**님", date: "2025.01.09" },
      { rating: 4, review: "유럽 투어 알차게 다녀왔어요. 다만 일정이 조금 빡빡했던 게 아쉬웠어요.", vendorName: "유럽 투어", vendorType: "허니문", userName: "조**님", date: "2025.01.06" },
    ],
  },
  "appliances": {
    title: "가전·예물 리얼 후기",
    subtitle: "실제 구매 후기",
    reviews: [
      { rating: 5, review: "까르띠에 러브링 정말 예뻐요. 매장에서 친절하게 상담해주셨어요!", vendorName: "까르띠에", vendorType: "예물", userName: "문**님", date: "2025.01.15" },
      { rating: 5, review: "LG TV 화질이 정말 좋아요. 할인 행사 때 구매해서 더 좋았습니다.", vendorName: "LG전자", vendorType: "가전", userName: "배**님", date: "2025.01.12" },
      { rating: 4, review: "티파니 웨딩밴드 심플하면서도 고급스러워요. 추천드립니다!", vendorName: "티파니", vendorType: "예물", userName: "안**님", date: "2025.01.08" },
    ],
  },
  "suit": {
    title: "예복 리얼 후기",
    subtitle: "신랑 예복 이용 후기",
    reviews: [
      { rating: 5, review: "맞춤 수트 핏이 정말 좋아요. 수선도 꼼꼼하게 해주셨습니다.", vendorName: "제니아", vendorType: "맞춤정장", userName: "오**님", date: "2025.01.14" },
      { rating: 4, review: "턱시도 렌탈했는데 깔끔하고 좋았어요. 가격 대비 만족합니다.", vendorName: "턱시도하우스", vendorType: "렌탈", userName: "서**님", date: "2025.01.10" },
      { rating: 5, review: "보스 수트 스타일링까지 도와주셔서 너무 좋았어요!", vendorName: "보스수트", vendorType: "수트", userName: "유**님", date: "2025.01.07" },
    ],
  },
  "hanbok": {
    title: "한복 리얼 후기",
    subtitle: "한복 이용 후기",
    reviews: [
      { rating: 5, review: "차이킴 한복 정말 세련됐어요. 현대적이면서도 우아해서 폐백 때 많이 칭찬받았어요!", vendorName: "차이킴", vendorType: "한복", userName: "권**님", date: "2025.01.13" },
      { rating: 5, review: "금단 한복 맞춤으로 했는데 핏도 좋고 색감이 너무 예뻤어요.", vendorName: "금단한복", vendorType: "한복", userName: "홍**님", date: "2025.01.09" },
      { rating: 4, review: "폐백 패키지로 대여했는데 어머님들 한복도 예쁘게 맞춰주셨어요.", vendorName: "리슬한복", vendorType: "한복", userName: "심**님", date: "2025.01.05" },
    ],
  },
  "invitation": {
    title: "청첩장 모임 후기",
    subtitle: "모임 장소 이용 후기",
    reviews: [
      { rating: 5, review: "라메르에서 가족 모임했는데 분위기도 좋고 음식도 맛있어서 다들 만족하셨어요.", vendorName: "레스토랑 라메르", vendorType: "레스토랑", userName: "김**님", date: "2025.01.18" },
      { rating: 5, review: "프라이빗룸이 있어서 편하게 이야기 나눌 수 있었어요. 다음에 또 이용하고 싶습니다.", vendorName: "한정식 소담", vendorType: "한정식", userName: "박**님", date: "2025.01.15" },
      { rating: 4, review: "카페 분위기가 예쁘고 디저트도 맛있었어요. 소규모 모임에 추천합니다.", vendorName: "카페 블룸", vendorType: "카페", userName: "이**님", date: "2025.01.10" },
    ],
  },
};

interface ReviewSectionProps {
  activeTab?: CategoryTab;
}

const ReviewSection = ({ activeTab = "wedding-hall" }: ReviewSectionProps) => {
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
