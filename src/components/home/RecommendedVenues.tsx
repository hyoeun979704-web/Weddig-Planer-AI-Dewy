import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, MapPin } from "lucide-react";

interface VenueCardProps {
  id: string;
  name: string;
  location: string;
  priceRange: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  onClick: () => void;
}

const VenueCard = ({ name, location, priceRange, rating, reviewCount, imageUrl, onClick }: VenueCardProps) => (
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

const RecommendedVenues = () => {
  // Spacing adjusted: pt-4 instead of py-6 for better flow from hero
  const navigate = useNavigate();

  // Dummy data - will be replaced with Supabase data
  const venues = [
    {
      id: "1",
      name: "더채플앳청담",
      location: "서울 강남구",
      priceRange: "8만원대",
      rating: 4.8,
      reviewCount: 324,
      imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400",
    },
    {
      id: "2",
      name: "그랜드힐튼 컨벤션",
      location: "서울 서대문구",
      priceRange: "12만원대",
      rating: 4.6,
      reviewCount: 256,
      imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400",
    },
    {
      id: "3",
      name: "루벨아뜨리움",
      location: "서울 강서구",
      priceRange: "7만원대",
      rating: 4.7,
      reviewCount: 189,
      imageUrl: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=400",
    },
    {
      id: "4",
      name: "아펠가모 강남",
      location: "서울 강남구",
      priceRange: "15만원대",
      rating: 4.9,
      reviewCount: 412,
      imageUrl: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=400",
    },
  ];

  return (
    <section className="pt-4 pb-6">
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-lg font-bold text-foreground">맞춤 웨딩홀 추천</h2>
        <button 
          onClick={() => navigate("/venues")}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {venues.map((venue) => (
          <VenueCard 
            key={venue.id} 
            {...venue} 
            onClick={() => navigate(`/venues/${venue.id}`)}
          />
        ))}
      </div>
    </section>
  );
};

export default RecommendedVenues;
