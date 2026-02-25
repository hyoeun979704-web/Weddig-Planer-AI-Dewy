import { MapPin, Clock, Car, Phone, Globe, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";
import { useVenueSpecialPoints } from "@/hooks/useVenueDetails";
import { Skeleton } from "@/components/ui/skeleton";

interface VenueInfoTabProps {
  venueId: string;
  address: string;
  phone?: string;
  website?: string;
  operatingHours?: string;
  parking?: string;
  publicTransit?: string;
  venueName?: string;
}

const fallbackSpecialPoints = [
  { id: "fallback-1", title: "최고의 접근성", description: "편리한 교통과 넉넉한 주차 공간을 제공합니다", icon: "🚗", category: "접근성" },
  { id: "fallback-2", title: "프리미엄 서비스", description: "전담 웨딩플래너와 함께 완벽한 결혼식을 준비하세요", icon: "💎", category: "서비스" },
  { id: "fallback-3", title: "다양한 홀 구성", description: "규모에 맞는 다양한 홀을 보유하고 있습니다", icon: "🏛️", category: "시설" },
];

const VenueInfoTab = ({ 
  venueId, address, phone, website, operatingHours, parking, publicTransit, venueName = "웨딩홀"
}: VenueInfoTabProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const { data: specialPoints, isLoading } = useVenueSpecialPoints(venueId);

  const displayPoints = specialPoints && specialPoints.length > 0 
    ? specialPoints.map(point => ({
        id: point.id,
        title: point.title,
        description: point.description || "",
        icon: point.icon || "✨",
        category: point.category,
      }))
    : fallbackSpecialPoints;

  const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? displayPoints.length - 1 : prev - 1));
  const handleNext = () => setCurrentIndex((prev) => (prev === displayPoints.length - 1 ? 0 : prev + 1));

  return (
    <div className="p-4 space-y-6">
      {/* Special Point Carousel */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Special Point!
        </h3>
        {isLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : (
          <div className="relative">
            <div ref={carouselRef} className="overflow-hidden rounded-2xl">
              <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {displayPoints.map((point) => (
                  <div key={point.id} className="min-w-full p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{point.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1.5">{point.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{point.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {displayPoints.length > 1 && (
              <>
                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            {displayPoints.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {displayPoints.map((_, index) => (
                  <button key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주소</p>
          <p className="font-medium text-foreground">{address}</p>
          <button className="text-primary text-sm mt-1 underline underline-offset-2">지도보기</button>
        </div>
      </div>

      {phone && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Phone className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">전화번호</p>
            <a href={`tel:${phone}`} className="font-medium text-foreground">{phone}</a>
          </div>
        </div>
      )}

      {operatingHours && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">운영시간</p>
            <p className="font-medium text-foreground">{operatingHours}</p>
          </div>
        </div>
      )}

      {parking && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">주차</p>
            <p className="font-medium text-foreground">{parking}</p>
          </div>
        </div>
      )}

      {website && (
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Globe className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-0.5">웹사이트</p>
            <a href={website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">홈페이지 방문</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueInfoTab;
