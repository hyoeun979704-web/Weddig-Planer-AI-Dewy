import { MapPin, Clock, Car, Phone, Globe, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";

interface VenueInfoTabProps {
  address: string;
  phone?: string;
  website?: string;
  operatingHours?: string;
  parking?: string;
  venueName?: string;
}

const specialPoints = [
  {
    title: "최고의 접근성",
    description: "강남역에서 도보 5분, 주차 500대 가능한 편리한 위치",
    emoji: "🚗"
  },
  {
    title: "프리미엄 서비스",
    description: "전담 웨딩플래너 배정, VIP 대기실 및 신부 전용 메이크업룸 제공",
    emoji: "💎"
  },
  {
    title: "다양한 홀 구성",
    description: "100명부터 500명까지, 규모에 맞는 6개의 개별 홀 보유",
    emoji: "🏛️"
  },
  {
    title: "미식 경험",
    description: "호텔 출신 셰프의 프리미엄 한식/양식 코스 제공",
    emoji: "🍽️"
  }
];

const VenueInfoTab = ({ 
  address, 
  phone = "02-1234-5678",
  website,
  operatingHours = "10:00 ~ 19:00",
  parking = "자체 주차장 이용 가능",
  venueName = "웨딩홀"
}: VenueInfoTabProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? specialPoints.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === specialPoints.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Special Point Carousel */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Special Point!
        </h3>
        
        <div className="relative">
          {/* Carousel Container */}
          <div 
            ref={carouselRef}
            className="overflow-hidden rounded-2xl"
          >
            <div 
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {specialPoints.map((point, index) => (
                <div 
                  key={index}
                  className="min-w-full p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{point.emoji}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-1.5">{point.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button 
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-background transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-1.5 mt-3">
            {specialPoints.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Address */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주소</p>
          <p className="font-medium text-foreground">{address}</p>
          <button className="text-primary text-sm mt-1 underline underline-offset-2">
            지도보기
          </button>
        </div>
      </div>

      {/* Phone */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">전화번호</p>
          <a href={`tel:${phone}`} className="font-medium text-foreground">
            {phone}
          </a>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">운영시간</p>
          <p className="font-medium text-foreground">{operatingHours}</p>
        </div>
      </div>

      {/* Parking */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주차</p>
          <p className="font-medium text-foreground">{parking}</p>
        </div>
      </div>

      {/* Website */}
      {website && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">웹사이트</p>
            <a 
              href={website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              홈페이지 방문
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueInfoTab;
