import { Users, Utensils, Star, Sparkles, Building2, DollarSign, Flower2, Wine } from "lucide-react";

interface VenueHallTabProps {
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

  // Mock data based on reference image
  const venueType = halls.length > 0 ? halls[0] : "호텔";
  const ceremonyInterval = "동시/240분";
  const minCapacity = Math.max(100, minGuarantee - 100);
  const seatCapacity = minGuarantee;
  const maxCapacity = minGuarantee + Math.round(minGuarantee * 0.2);
  const menuType = meals.length > 0 ? meals[0] : "양식";
  const priceMin = pricePerPerson;
  const priceMax = pricePerPerson + 40000;
  const rentalFee = null;
  const productionFee = pricePerPerson * minGuarantee * 0.05;
  const flowerType = "생화";
  const flowerPrice = 18000000;
  const drinkType = "당일소모량";

  return (
    <div className="p-4 space-y-6">
      {/* Main Info Grid - 2x3 layout like reference */}
      <div className="grid grid-cols-2 gap-3">
        {/* 홀타입/예식 형태/간격 */}
        <InfoCard 
          icon={<Building2 className="w-6 h-6" />}
          title="홀타입/예식 형태/간격"
        >
          <p>{venueType}</p>
          <p>{ceremonyInterval}</p>
        </InfoCard>

        {/* 수용 인원 */}
        <InfoCard 
          icon={<Users className="w-6 h-6" />}
          title="수용 인원"
        >
          <p>최소 {minCapacity}명</p>
          <p>좌석 {seatCapacity}명</p>
          <p>최대 {maxCapacity}명</p>
        </InfoCard>

        {/* 메뉴/식대 */}
        <InfoCard 
          icon={<Utensils className="w-6 h-6" />}
          title="메뉴/식대"
        >
          <p>{menuType}</p>
          <p>{formatKoreanWon(priceMin)}</p>
          <p>~{formatKoreanWon(priceMax)}</p>
        </InfoCard>

        {/* 대관료/연출료 */}
        <InfoCard 
          icon={<DollarSign className="w-6 h-6" />}
          title="대관료/연출료"
        >
          <p>대관료 {rentalFee ? formatKoreanWon(rentalFee) : "없음"}</p>
          <p>연출료 있음</p>
          <p>{formatKoreanWon(productionFee)}</p>
        </InfoCard>

        {/* 꽃장식 */}
        <InfoCard 
          icon={<Flower2 className="w-6 h-6" />}
          title="꽃장식"
        >
          <p>{flowerType}</p>
          <p>{formatKoreanWon(flowerPrice)}</p>
        </InfoCard>

        {/* 음주류 */}
        <InfoCard 
          icon={<Wine className="w-6 h-6" />}
          title="음주류"
        >
          <p>{drinkType}</p>
        </InfoCard>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Price Summary Card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          예상 비용 요약
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
