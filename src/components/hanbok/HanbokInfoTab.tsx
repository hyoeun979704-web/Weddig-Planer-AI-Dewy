import { MapPin, Phone, Clock, Globe, Car, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Tables } from "@/integrations/supabase/types";

type Hanbok = Tables<"hanbok">;

interface HanbokInfoTabProps {
  hanbok: Hanbok;
}

const fallbackHighlights = [
  { id: "1", title: "정통 한복 전문", description: "전통 한복부터 퓨전 한복까지 다양한 스타일을 보유하고 있습니다", icon: "👗" },
  { id: "2", title: "맞춤 제작 가능", description: "고객님의 체형과 취향에 맞는 맞춤 한복을 제작해 드립니다", icon: "✂️" },
  { id: "3", title: "전문 스타일링", description: "한복에 어울리는 헤어·메이크업 연계 서비스를 제공합니다", icon: "💄" },
];

type HanbokCategory = "custom" | "rental" | "other";

const hanbokCategories: { key: HanbokCategory; label: string }[] = [
  { key: "custom", label: "맞춤" },
  { key: "rental", label: "대여" },
  { key: "other", label: "그외" },
];

const pricingData: Record<HanbokCategory, { label: string; value: string }[]> = {
  custom: [
    { label: "기본구성", value: "저고리 + 치마 (또는 바지)" },
    { label: "기본 원단 가격", value: "문의" },
    { label: "고급 원단 가격", value: "문의" },
  ],
  rental: [
    { label: "기본구성", value: "저고리 + 치마 (또는 바지)" },
    { label: "기본 원단 가격", value: "문의" },
    { label: "고급 원단 가격", value: "문의" },
  ],
  other: [
    { label: "기본구성", value: "아동한복 / 헤어메이크업 등" },
    { label: "기본 원단 가격", value: "문의" },
    { label: "고급 원단 가격", value: "문의" },
  ],
};

const HanbokInfoTab = ({ hanbok }: HanbokInfoTabProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<HanbokCategory>("custom");

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
          <p className="font-medium text-foreground">{hanbok.address}</p>
          <button className="text-primary text-sm mt-1 underline underline-offset-2">지도보기</button>
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

      {/* Hanbok Type Selector + Pricing */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">종류·구성·가격</h3>
        <div className="flex gap-2">
          {hanbokCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {pricingRows.map((row, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 border-b border-border last:border-0">
              <span className="text-muted-foreground text-sm">{row.label}</span>
              <span className="font-bold text-primary text-sm">{row.value}</span>
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
              <p className="text-xs text-muted-foreground truncate">추천 한복점 {i}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HanbokInfoTab;
