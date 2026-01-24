import { Users, Utensils, Star, Sparkles } from "lucide-react";

interface VenueHallTabProps {
  hallTypes?: string[] | null;
  mealOptions?: string[] | null;
  eventOptions?: string[] | null;
  pricePerPerson: number;
  minGuarantee: number;
}

const formatKoreanWon = (price: number): string => {
  if (price >= 10000) {
    return `${(price / 10000).toFixed(0)}만원`;
  }
  return `${price.toLocaleString()}원`;
};

const VenueHallTab = ({ 
  hallTypes = [], 
  mealOptions = [], 
  eventOptions = [],
  pricePerPerson,
  minGuarantee
}: VenueHallTabProps) => {
  const halls = hallTypes || [];
  const meals = mealOptions || [];
  const events = eventOptions || [];

  return (
    <div className="p-4 space-y-6">
      {/* Price Info Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          가격 정보
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">식대 (1인)</p>
            <p className="text-xl font-bold text-primary">
              {formatKoreanWon(pricePerPerson)}
            </p>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">최소 보증인원</p>
            <p className="text-xl font-bold text-foreground">
              {minGuarantee}명
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">예상 최소 비용</span>
            <span className="text-lg font-bold">
              {formatKoreanWon(pricePerPerson * minGuarantee)}
            </span>
          </div>
        </div>
      </div>

      {/* Hall Types */}
      {halls.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            홀 타입
          </h3>
          <div className="flex flex-wrap gap-2">
            {halls.map((type, index) => (
              <span 
                key={index}
                className="px-3 py-1.5 bg-secondary rounded-full text-sm font-medium"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meal Options */}
      {meals.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            식사 옵션
          </h3>
          <div className="flex flex-wrap gap-2">
            {meals.map((option, index) => (
              <span 
                key={index}
                className="px-3 py-1.5 bg-secondary rounded-full text-sm font-medium"
              >
                {option}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Event Options */}
      {events.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            이벤트 옵션
          </h3>
          <div className="flex flex-wrap gap-2">
            {events.map((option, index) => (
              <span 
                key={index}
                className="px-3 py-1.5 bg-secondary rounded-full text-sm font-medium"
              >
                {option}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueHallTab;
