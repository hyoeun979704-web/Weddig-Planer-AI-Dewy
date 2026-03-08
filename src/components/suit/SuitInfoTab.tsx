import { MapPin, Phone, Clock, Globe, Car, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Suit = Tables<"suits">;

interface SuitInfoTabProps {
  suit: Suit;
}

const fallbackHighlights = [
  { id: "1", title: "프리미엄 원단", description: "최고급 원단을 사용하여 편안한 착용감과 고급스러운 핏을 제공합니다", icon: "🧵" },
  { id: "2", title: "맞춤 수선 가능", description: "전문 테일러가 체형에 맞는 완벽한 핏으로 수선해 드립니다", icon: "✂️" },
  { id: "3", title: "다양한 브랜드", description: "국내외 유명 브랜드 예복을 한곳에서 비교하고 선택하세요", icon: "👔" },
];

const SuitInfoTab = ({ suit }: SuitInfoTabProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? fallbackHighlights.length - 1 : prev - 1));
  const handleNext = () => setCurrentIndex((prev) => (prev === fallbackHighlights.length - 1 ? 0 : prev + 1));

  return (
    <div className="p-4 space-y-6">
      {/* Highlights Carousel */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          장점·이벤트
        </h3>
        <div className="relative">
          <div className="overflow-hidden rounded-2xl">
            <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
              {fallbackHighlights.map((point) => (
                <div key={point.id} className="min-w-full p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{point.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground mb-1.5">{point.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {fallbackHighlights.length > 1 && (
            <>
              <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <div className="flex justify-center gap-1.5 mt-3">
            {fallbackHighlights.map((_, index) => (
              <button key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 rounded-full transition-colors ${index === currentIndex ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Address */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><MapPin className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주소</p>
          <p className="font-medium text-foreground">{suit.address}</p>
          <button onClick={() => { window.open(`https://map.kakao.com/?q=${encodeURIComponent(suit.address)}`, '_blank'); }} className="text-primary text-sm mt-1 underline underline-offset-2">지도보기</button>
        </div>
      </div>

      {/* Phone */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Phone className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">전화번호</p>
          <p className="font-medium text-foreground">(준비중)</p>
        </div>
      </div>

      {/* SNS */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Globe className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">SNS</p>
          <p className="font-medium text-foreground">(준비중)</p>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">영업시간</p>
          <p className="font-medium text-foreground">(준비중)</p>
        </div>
      </div>

      {/* Parking */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Car className="w-5 h-5 text-primary" /></div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-0.5">주차정보</p>
          <p className="font-medium text-foreground">(준비중)</p>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Suit Types */}
      {suit.suit_types && suit.suit_types.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">예복 종류</h3>
          <div className="flex flex-wrap gap-2">
            {suit.suit_types.map((type, idx) => (
              <span key={idx} className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">{type}</span>
            ))}
          </div>
        </div>
      )}

      {/* Brand Options */}
      {suit.brand_options && suit.brand_options.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">취급 브랜드</h3>
          <div className="flex flex-wrap gap-2">
            {suit.brand_options.map((brand, idx) => (
              <span key={idx} className="px-4 py-2 bg-muted text-muted-foreground rounded-full text-sm font-medium">{brand}</span>
            ))}
          </div>
        </div>
      )}

      {/* Pricing / Composition */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">구성·가격</h3>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <span className="text-muted-foreground">예복 가격</span>
            <span className="font-bold text-primary">{suit.price_range}</span>
          </div>
          {suit.service_options && suit.service_options.map((service, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 border-b border-border last:border-0">
              <span className="text-muted-foreground">{service}</span>
              <span className="font-medium text-foreground">문의</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">추천업체</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shrink-0 w-28">
              <div className="aspect-square bg-muted rounded-xl mb-2" />
              <p className="text-xs text-muted-foreground truncate">추천 예복점 {i}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuitInfoTab;
