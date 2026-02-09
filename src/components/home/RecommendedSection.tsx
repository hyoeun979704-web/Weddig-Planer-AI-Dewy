import { useNavigate } from "react-router-dom";
import { ChevronRight, Star, MapPin } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";
import { useRecommendedItems, getTabConfig } from "@/hooks/useRecommendedItems";
import { Skeleton } from "@/components/ui/skeleton";

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

const CardSkeleton = () => (
  <div className="flex-shrink-0 w-64 bg-card rounded-2xl border border-border overflow-hidden">
    <Skeleton className="h-36 w-full" />
    <div className="p-3">
      <Skeleton className="h-4 w-32 mb-2" />
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-3 w-full" />
    </div>
  </div>
);

interface RecommendedSectionProps {
  activeTab: CategoryTab;
}

const RecommendedSection = ({ activeTab }: RecommendedSectionProps) => {
  const navigate = useNavigate();
  const config = getTabConfig(activeTab);
  const { data: items, isLoading } = useRecommendedItems(activeTab);

  return (
    <section className="pt-4 pb-6">
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-lg font-bold text-foreground">{config.title}</h2>
        <button 
          onClick={() => navigate(config.detailPath)}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : items && items.length > 0 ? (
          items.map((item) => (
            <CardItem 
              key={item.id} 
              {...item} 
              onClick={() => navigate(`${config.detailPath}/${item.id}`)}
            />
          ))
        ) : (
          <div className="flex items-center justify-center w-full py-8">
            <p className="text-sm text-muted-foreground">등록된 항목이 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
