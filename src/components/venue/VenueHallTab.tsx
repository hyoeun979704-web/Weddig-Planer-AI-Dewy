import { useState } from "react";
import { Users, Utensils, Star, Sparkles, Building2, DollarSign, Flower2, Wine, ChevronLeft, ChevronRight } from "lucide-react";
import { useVenueHalls, VenueHall } from "@/hooks/useVenueDetails";
import { Skeleton } from "@/components/ui/skeleton";

interface VenueHallTabProps {
  venueId: number;
  priceMin: number;
  priceMax: number;
}

const formatKoreanWon = (price: number): string => {
  if (price >= 10000000) {
    return `${(price / 10000000).toFixed(0)}천만원`;
  }
  if (price >= 10000) {
    return `${(price / 10000).toLocaleString()}만원`;
  }
  return `${price.toLocaleString()}원`;
};

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const InfoCard = ({ icon, title, children }: InfoCardProps) => (
  <div className="bg-background border border-border rounded-xl p-4 flex flex-col items-center text-center">
    <div className="text-muted-foreground mb-2">{icon}</div>
    <h4 className="text-sm font-bold text-foreground mb-2">{title}</h4>
    <div className="text-sm text-muted-foreground space-y-0.5">{children}</div>
  </div>
);

const VenueHallTab = ({ venueId, priceMin, priceMax }: VenueHallTabProps) => {
  const [currentHallIndex, setCurrentHallIndex] = useState(0);
  const { data: halls, isLoading } = useVenueHalls(venueId);

  const handlePrev = () => {
    if (!halls) return;
    setCurrentHallIndex((prev) => (prev === 0 ? halls.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!halls) return;
    setCurrentHallIndex((prev) => (prev === halls.length - 1 ? 0 : prev + 1));
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!halls || halls.length === 0) {
    return (
      <div className="p-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 text-center">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">홀 정보가 아직 등록되지 않았습니다.</p>
          {(priceMin > 0 || priceMax > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              {priceMin > 0 && (
                <div className="bg-background rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">최소 식대</p>
                  <p className="text-xl font-bold text-primary">{formatKoreanWon(priceMin)}</p>
                </div>
              )}
              {priceMax > 0 && (
                <div className="bg-background rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">최대 식대</p>
                  <p className="text-xl font-bold text-foreground">{formatKoreanWon(priceMax)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentHall = halls[currentHallIndex];

  return (
    <div className="p-4 space-y-6">
      {/* Price Summary Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          예상 비용
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">식대 범위</p>
            <p className="text-lg font-bold text-primary">
              {currentHall.Meal_Price_Min ? formatKoreanWon(currentHall.Meal_Price_Min) : "-"}
              {currentHall.Meal_Price_Max ? ` ~ ${formatKoreanWon(currentHall.Meal_Price_Max)}` : ""}
            </p>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">수용 인원</p>
            <p className="text-lg font-bold text-foreground">
              {currentHall.Min_Pax ?? "?"} ~ {currentHall.Max_Pax ?? "?"}명
            </p>
          </div>
        </div>

        {currentHall.Min_Pax && currentHall.Meal_Price_Min && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">예상 최소 비용</span>
              <span className="text-lg font-bold">
                {formatKoreanWon(currentHall.Min_Pax * currentHall.Meal_Price_Min)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hall Carousel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            홀 상세정보
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{currentHallIndex + 1} / {halls.length}</span>
          </div>
        </div>

        {/* Hall Tab Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {halls.map((hall, index) => (
            <button
              key={hall.number}
              onClick={() => setCurrentHallIndex(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                index === currentHallIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {hall.hall || hall.name}
            </button>
          ))}
        </div>

        {/* Hall Detail Carousel */}
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-border">
            <div 
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentHallIndex * 100}%)` }}
            >
              {halls.map((hall) => (
                <div key={hall.number} className="min-w-full p-4 bg-background">
                  {/* Hall Name Badge */}
                  <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary font-bold rounded-full">
                      {hall.hall || hall.name}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 수용 인원 */}
                    <InfoCard 
                      icon={<Users className="w-6 h-6" />}
                      title="수용 인원"
                    >
                      <p>최소 {hall.Min_Pax ?? "-"}명</p>
                      <p>최대 {hall.Max_Pax ?? "-"}명</p>
                    </InfoCard>

                    {/* 식대 */}
                    <InfoCard 
                      icon={<Utensils className="w-6 h-6" />}
                      title="식대"
                    >
                      <p>{hall.Meal_Price_Min ? formatKoreanWon(hall.Meal_Price_Min) : "-"}</p>
                      <p>~{hall.Meal_Price_Max ? formatKoreanWon(hall.Meal_Price_Max) : "-"}</p>
                    </InfoCard>

                    {/* 대관료 */}
                    <InfoCard 
                      icon={<DollarSign className="w-6 h-6" />}
                      title="대관료"
                    >
                      <p>{hall.venue_rental_fee ? formatKoreanWon(hall.venue_rental_fee) : "문의"}</p>
                    </InfoCard>

                    {/* 꽃 */}
                    {hall.flower && (
                      <InfoCard 
                        icon={<Flower2 className="w-6 h-6" />}
                        title="플라워"
                      >
                        <p>{hall.flower}</p>
                      </InfoCard>
                    )}
                  </div>

                  {/* Description */}
                  {hall.description && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-xl">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {hall.description}
                      </p>
                    </div>
                  )}

                  {/* Additional Info */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hall.meal && (
                      <span className="px-3 py-1.5 bg-secondary rounded-full text-xs font-medium">
                        🍽️ {hall.meal}
                      </span>
                    )}
                    {hall.drink && (
                      <span className="px-3 py-1.5 bg-secondary rounded-full text-xs font-medium">
                        🥂 {hall.drink}
                      </span>
                    )}
                    {hall.sit && (
                      <span className="px-3 py-1.5 bg-secondary rounded-full text-xs font-medium">
                        💺 {hall.sit}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          {halls.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-background transition-colors border border-border"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-background transition-colors border border-border"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Dots Indicator */}
        {halls.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {halls.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentHallIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentHallIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueHallTab;
