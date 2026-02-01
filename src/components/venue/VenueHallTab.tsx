import { useState } from "react";
import { Users, Utensils, Star, Sparkles, Building2, DollarSign, Flower2, Wine, ChevronLeft, ChevronRight } from "lucide-react";
import { useVenueHalls, VenueHall } from "@/hooks/useVenueDetails";
import { Skeleton } from "@/components/ui/skeleton";

interface VenueHallTabProps {
  venueId: string;
  hallTypes?: string[] | null;
  mealOptions?: string[] | null;
  eventOptions?: string[] | null;
  pricePerPerson: number;
  minGuarantee: number;
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

// Transform DB hall data to display format
const transformHallData = (hall: VenueHall, fallbackPrice: number, fallbackGuarantee: number) => ({
  id: hall.id,
  name: hall.name,
  type: hall.hall_type || "(준비중)",
  floor: hall.floor || null,
  minCapacity: hall.capacity_min || fallbackGuarantee,
  maxCapacity: hall.capacity_max || Math.round(fallbackGuarantee * 1.5),
  priceMin: hall.price_per_person || fallbackPrice,
  priceMax: hall.meal_price || fallbackPrice + 20000,
  ceremonyFee: hall.ceremony_fee,
  sizePyeong: hall.size_pyeong,
});

const VenueHallTab = ({ 
  venueId,
  hallTypes = [], 
  mealOptions = [], 
  eventOptions = [],
  pricePerPerson,
  minGuarantee
}: VenueHallTabProps) => {
  const [currentHallIndex, setCurrentHallIndex] = useState(0);
  
  const { data: dbHalls, isLoading } = useVenueHalls(venueId);
  
  const meals = mealOptions || [];
  const events = eventOptions || [];

  // Generate fallback halls if no DB data
  const generateFallbackHalls = () => {
    const names = hallTypes && hallTypes.length > 0 
      ? hallTypes 
      : ["그랜드볼룸", "크리스탈홀"];
    
    return names.map((name, index) => ({
      id: `fallback-${index}`,
      name,
      type: index === 0 ? "호텔형" : "컨벤션",
      floor: null,
      minCapacity: minGuarantee + (index * 50),
      maxCapacity: minGuarantee + (index * 50) + 100,
      priceMin: pricePerPerson + (index * 10000),
      priceMax: pricePerPerson + (index * 10000) + 30000,
      ceremonyFee: null,
      sizePyeong: null,
    }));
  };

  // Use DB data if available, otherwise use fallback
  const hallsData = dbHalls && dbHalls.length > 0 
    ? dbHalls.map(hall => transformHallData(hall, pricePerPerson, minGuarantee))
    : generateFallbackHalls();

  const currentHall = hallsData[currentHallIndex];

  const handlePrev = () => {
    setCurrentHallIndex((prev) => (prev === 0 ? hallsData.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentHallIndex((prev) => (prev === hallsData.length - 1 ? 0 : prev + 1));
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

  return (
    <div className="p-4 space-y-6">
      {/* Price Summary Card - TOP */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          예상 비용
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">식대 (1인)</p>
            <p className="text-xl font-bold text-primary">
              {formatKoreanWon(currentHall.priceMin)}
            </p>
          </div>
          <div className="bg-background rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">최소 보증인원</p>
            <p className="text-xl font-bold text-foreground">
              {currentHall.minCapacity}명
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">예상 최소 비용</span>
            <span className="text-lg font-bold">
              {formatKoreanWon(currentHall.priceMin * currentHall.minCapacity)}
            </span>
          </div>
        </div>
      </div>

      {/* Hall Carousel */}
      <div className="space-y-4">
        {/* Hall Selector Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            홀 상세정보
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{currentHallIndex + 1} / {hallsData.length}</span>
          </div>
        </div>

        {/* Hall Tab Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {hallsData.map((hall, index) => (
            <button
              key={hall.id}
              onClick={() => setCurrentHallIndex(index)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                index === currentHallIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {hall.name}
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
              {hallsData.map((hall) => (
                <div key={hall.id} className="min-w-full p-4 bg-background">
                  {/* Hall Name Badge */}
                  <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary font-bold rounded-full">
                      {hall.name}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 홀타입 */}
                    <InfoCard 
                      icon={<Building2 className="w-6 h-6" />}
                      title="홀타입"
                    >
                      <p>{hall.type}</p>
                      {hall.floor && <p>{hall.floor}</p>}
                      {hall.sizePyeong && <p>{hall.sizePyeong}평</p>}
                    </InfoCard>

                    {/* 수용 인원 */}
                    <InfoCard 
                      icon={<Users className="w-6 h-6" />}
                      title="수용 인원"
                    >
                      <p>최소 {hall.minCapacity}명</p>
                      <p>최대 {hall.maxCapacity}명</p>
                    </InfoCard>

                    {/* 메뉴/식대 */}
                    <InfoCard 
                      icon={<Utensils className="w-6 h-6" />}
                      title="식대"
                    >
                      <p>{formatKoreanWon(hall.priceMin)}</p>
                      <p>~{formatKoreanWon(hall.priceMax)}</p>
                    </InfoCard>

                    {/* 대관료 */}
                    <InfoCard 
                      icon={<DollarSign className="w-6 h-6" />}
                      title="대관료"
                    >
                      <p>{hall.ceremonyFee ? formatKoreanWon(hall.ceremonyFee) : "대관료 포함"}</p>
                    </InfoCard>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          {hallsData.length > 1 && (
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
        {hallsData.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {hallsData.map((_, index) => (
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

      {/* Divider */}
      <div className="border-t border-border" />

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
