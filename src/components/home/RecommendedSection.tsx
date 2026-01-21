import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, MapPin } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";

interface CardItemProps {
  id: string;
  name: string;
  location: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  onClick: () => void;
}

const CardItem = ({ name, location, priceRange, rating, reviewCount, imageUrl, onClick }: CardItemProps) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 w-64 bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-200 text-left"
  >
    <div className="h-36 bg-muted overflow-hidden">
      <img 
        src={imageUrl} 
        alt={name}
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg";
        }}
      />
    </div>
    <div className="p-3">
      <h4 className="font-semibold text-foreground text-sm mb-1 truncate">{name}</h4>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <MapPin className="w-3 h-3" />
        <span>{location}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary">{priceRange}</span>
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 fill-primary/80 text-primary/80" />
          <span className="text-xs font-medium text-foreground">{rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({reviewCount})</span>
        </div>
      </div>
    </div>
  </button>
);

interface SectionData {
  title: string;
  viewAllPath: string;
  items: CardItemProps[];
}

const sectionDataMap: Record<CategoryTab, SectionData> = {
  "wedding-hall": {
    title: "맞춤 웨딩홀 추천",
    viewAllPath: "/venues",
    items: [
      { id: "1", name: "더채플앳청담", location: "서울 강남구", priceRange: "8만원대", rating: 4.8, reviewCount: 324, imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400", onClick: () => {} },
      { id: "2", name: "그랜드힐튼 컨벤션", location: "서울 서대문구", priceRange: "12만원대", rating: 4.6, reviewCount: 256, imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400", onClick: () => {} },
      { id: "3", name: "루벨아뜨리움", location: "서울 강서구", priceRange: "7만원대", rating: 4.7, reviewCount: 189, imageUrl: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=400", onClick: () => {} },
      { id: "4", name: "아펠가모 강남", location: "서울 강남구", priceRange: "15만원대", rating: 4.9, reviewCount: 412, imageUrl: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=400", onClick: () => {} },
    ],
  },
  "sdm": {
    title: "인기 스드메 패키지",
    viewAllPath: "/sdm",
    items: [
      { id: "1", name: "라움 스튜디오", location: "서울 강남구", priceRange: "350만원~", rating: 4.9, reviewCount: 521, imageUrl: "https://images.unsplash.com/photo-1595407753234-0882f1e77954?w=400", onClick: () => {} },
      { id: "2", name: "소렐라 드레스", location: "서울 종로구", priceRange: "200만원~", rating: 4.7, reviewCount: 312, imageUrl: "https://images.unsplash.com/photo-1594463750939-ebb28c3f7f75?w=400", onClick: () => {} },
      { id: "3", name: "메이크업 바이 제니", location: "서울 마포구", priceRange: "80만원~", rating: 4.8, reviewCount: 445, imageUrl: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400", onClick: () => {} },
      { id: "4", name: "프리미엄 스드메", location: "서울 송파구", priceRange: "500만원~", rating: 4.9, reviewCount: 678, imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400", onClick: () => {} },
    ],
  },
  "honeymoon-gifts": {
    title: "혼수 특가 상품",
    viewAllPath: "/honeymoon-gifts",
    items: [
      { id: "1", name: "삼성 비스포크 세트", location: "온라인/오프라인", priceRange: "1,200만원~", rating: 4.9, reviewCount: 892, imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", onClick: () => {} },
      { id: "2", name: "LG 오브제 컬렉션", location: "온라인/오프라인", priceRange: "980만원~", rating: 4.8, reviewCount: 654, imageUrl: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=400", onClick: () => {} },
      { id: "3", name: "시몬스 침대 세트", location: "전국 매장", priceRange: "450만원~", rating: 4.7, reviewCount: 423, imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400", onClick: () => {} },
      { id: "4", name: "한샘 리하우스", location: "전국 매장", priceRange: "800만원~", rating: 4.6, reviewCount: 312, imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400", onClick: () => {} },
    ],
  },
  "honeymoon": {
    title: "인기 허니문 패키지",
    viewAllPath: "/honeymoon",
    items: [
      { id: "1", name: "몰디브 5박 7일", location: "몰디브", priceRange: "650만원~", rating: 4.9, reviewCount: 234, imageUrl: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400", onClick: () => {} },
      { id: "2", name: "발리 럭셔리 투어", location: "인도네시아", priceRange: "380만원~", rating: 4.8, reviewCount: 567, imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400", onClick: () => {} },
      { id: "3", name: "유럽 로맨틱 투어", location: "프랑스/이탈리아", priceRange: "520만원~", rating: 4.7, reviewCount: 345, imageUrl: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400", onClick: () => {} },
      { id: "4", name: "하와이 올인클루시브", location: "미국 하와이", priceRange: "480만원~", rating: 4.8, reviewCount: 421, imageUrl: "https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=400", onClick: () => {} },
    ],
  },
  "appliances": {
    title: "가전·예물 베스트",
    viewAllPath: "/appliances",
    items: [
      { id: "1", name: "까르띠에 러브링", location: "서울 청담", priceRange: "350만원~", rating: 4.9, reviewCount: 234, imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400", onClick: () => {} },
      { id: "2", name: "티파니 웨딩밴드", location: "서울 강남", priceRange: "280만원~", rating: 4.8, reviewCount: 189, imageUrl: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400", onClick: () => {} },
      { id: "3", name: "삼성 TV 패키지", location: "온라인", priceRange: "450만원~", rating: 4.7, reviewCount: 567, imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400", onClick: () => {} },
      { id: "4", name: "LG 생활가전 세트", location: "온라인", priceRange: "620만원~", rating: 4.8, reviewCount: 432, imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", onClick: () => {} },
    ],
  },
  "suit": {
    title: "인기 예복샵",
    viewAllPath: "/suit",
    items: [
      { id: "1", name: "보스 수트 강남", location: "서울 강남구", priceRange: "150만원~", rating: 4.8, reviewCount: 234, imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400", onClick: () => {} },
      { id: "2", name: "제니아 맞춤정장", location: "서울 청담", priceRange: "280만원~", rating: 4.9, reviewCount: 178, imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400", onClick: () => {} },
      { id: "3", name: "턱시도 하우스", location: "서울 종로", priceRange: "80만원~", rating: 4.6, reviewCount: 312, imageUrl: "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=400", onClick: () => {} },
      { id: "4", name: "그룸스 스타일", location: "서울 마포", priceRange: "120만원~", rating: 4.7, reviewCount: 245, imageUrl: "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=400", onClick: () => {} },
    ],
  },
  "hanbok": {
    title: "인기 한복샵",
    viewAllPath: "/hanbok",
    items: [
      { id: "1", name: "차이킴 한복", location: "서울 북촌", priceRange: "180만원~", rating: 4.9, reviewCount: 345, imageUrl: "https://images.unsplash.com/photo-1580547945467-d0c29c12b1c4?w=400", onClick: () => {} },
      { id: "2", name: "금단 한복", location: "서울 종로", priceRange: "250만원~", rating: 4.8, reviewCount: 234, imageUrl: "https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=400", onClick: () => {} },
      { id: "3", name: "리슬 한복", location: "서울 강남", priceRange: "150만원~", rating: 4.7, reviewCount: 189, imageUrl: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400", onClick: () => {} },
      { id: "4", name: "담연재 한복", location: "서울 인사동", priceRange: "120만원~", rating: 4.8, reviewCount: 278, imageUrl: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400", onClick: () => {} },
    ],
  },
};

interface RecommendedSectionProps {
  activeTab: CategoryTab;
}

const RecommendedSection = ({ activeTab }: RecommendedSectionProps) => {
  const navigate = useNavigate();
  const data = sectionDataMap[activeTab];

  return (
    <section className="pt-4 pb-6">
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-lg font-bold text-foreground">{data.title}</h2>
        <button 
          onClick={() => navigate(data.viewAllPath)}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {data.items.map((item) => (
          <CardItem 
            key={item.id} 
            {...item} 
            onClick={() => navigate(`${data.viewAllPath}/${item.id}`)}
          />
        ))}
      </div>
    </section>
  );
};

export default RecommendedSection;
