import { useState } from "react";
import { MapPin, Wallet, Users, Star, X, SlidersHorizontal, ChevronDown, Check, Building2, UtensilsCrossed, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/stores/useFilterStore";

const regions = [
  { value: "서울", label: "서울" },
  { value: "경기", label: "경기" },
  { value: "인천", label: "인천" },
  { value: "부산", label: "부산" },
  { value: "대구", label: "대구" },
];

const ratingOptions = [
  { value: 4.5, label: "4.5점 이상" },
  { value: 4.7, label: "4.7점 이상" },
  { value: 4.9, label: "4.9점 이상" },
];

const hallTypeOptions = [
  { value: "어두운홀", label: "어두운홀" },
  { value: "밝은홀", label: "밝은홀" },
  { value: "야외", label: "야외" },
  { value: "단독홀", label: "단독홀" },
  { value: "호텔", label: "호텔" },
];

const mealOptionOptions = [
  { value: "뷔페", label: "뷔페" },
  { value: "양식코스", label: "양식코스" },
  { value: "한식코스", label: "한식코스" },
  { value: "중식코스", label: "중식코스" },
  { value: "일식코스", label: "일식코스" },
];

const eventOptionOptions = [
  { value: "포토부스", label: "포토부스" },
  { value: "벌룬이펙트", label: "벌룬이펙트" },
  { value: "뮤지컬", label: "뮤지컬" },
  { value: "돔오픈", label: "돔오픈" },
  { value: "라이브 연주", label: "라이브 연주" },
];

// 슬라이더 설정
const PRICE_MIN = 40000;
const PRICE_MAX = 200000;
const PRICE_STEP = 10000;

const GUARANTEE_MIN = 50;
const GUARANTEE_MAX = 300;
const GUARANTEE_STEP = 10;

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

const FilterChip = ({ label, isActive, onClick, icon }: FilterChipProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-card border border-border text-foreground hover:border-primary/50"
    )}
  >
    {icon}
    {label}
  </button>
);

interface QuickFilterChipProps {
  label: string;
  defaultLabel: string;
  isActive: boolean;
  icon: React.ReactNode;
  onClear: () => void;
  children: React.ReactNode;
  keepOpen?: boolean;
}

const QuickFilterChip = ({ label, defaultLabel, isActive, icon, onClear, children, keepOpen = false }: QuickFilterChipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border text-foreground hover:border-primary/50"
          )}
        >
          {icon}
          <span>{isActive ? label : defaultLabel}</span>
          {isActive ? (
            <X 
              className="w-3.5 h-3.5 ml-0.5 hover:opacity-70" 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2 min-w-[140px]" 
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col gap-1" onClick={() => !keepOpen && setOpen(false)}>
          {children}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface FilterOptionProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const FilterOption = ({ label, isSelected, onClick }: FilterOptionProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full",
      isSelected
        ? "bg-primary/10 text-primary font-medium"
        : "hover:bg-muted text-foreground"
    )}
  >
    <span>{label}</span>
    {isSelected && <Check className="w-4 h-4" />}
  </button>
);

// 복수선택용 필터 옵션
interface MultiFilterOptionProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const MultiFilterOption = ({ label, isSelected, onClick }: MultiFilterOptionProps) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={cn(
      "flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full",
      isSelected
        ? "bg-primary/10 text-primary font-medium"
        : "hover:bg-muted text-foreground"
    )}
  >
    <span>{label}</span>
    {isSelected && <Check className="w-4 h-4" />}
  </button>
);

const FilterBar = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const {
    region,
    maxPrice,
    maxGuarantee,
    minRating,
    hallTypes,
    mealOptions,
    eventOptions,
    setRegion,
    setMaxPrice,
    setMaxGuarantee,
    setMinRating,
    toggleHallType,
    setHallTypes,
    toggleMealOption,
    setMealOptions,
    toggleEventOption,
    setEventOptions,
    resetFilters,
    hasActiveFilters,
  } = useFilterStore();

  const activeFiltersCount = [
    region, 
    maxPrice, 
    maxGuarantee, 
    minRating,
    hallTypes.length > 0 ? hallTypes : null,
    mealOptions.length > 0 ? mealOptions : null,
    eventOptions.length > 0 ? eventOptions : null,
  ].filter(Boolean).length;

  const getPriceLabel = () => {
    if (!maxPrice) return null;
    return `${(maxPrice / 10000).toFixed(0)}만원 이하`;
  };

  const getGuaranteeLabel = () => {
    if (!maxGuarantee) return null;
    return `${maxGuarantee}명 이하`;
  };

  const getHallTypesLabel = () => {
    if (hallTypes.length === 0) return null;
    if (hallTypes.length === 1) return hallTypes[0];
    return `${hallTypes[0]} 외 ${hallTypes.length - 1}`;
  };

  const getMealOptionsLabel = () => {
    if (mealOptions.length === 0) return null;
    if (mealOptions.length === 1) return mealOptions[0];
    return `${mealOptions[0]} 외 ${mealOptions.length - 1}`;
  };

  const getEventOptionsLabel = () => {
    if (eventOptions.length === 0) return null;
    if (eventOptions.length === 1) return eventOptions[0];
    return `${eventOptions[0]} 외 ${eventOptions.length - 1}`;
  };

  return (
    <div className="px-4 py-3">
      {/* Horizontal scrollable filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                hasActiveFilters()
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              필터
              {activeFiltersCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl flex flex-col">
            <SheetHeader className="text-left mb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-bold">필터</SheetTitle>
                {hasActiveFilters() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="text-primary"
                  >
                    초기화
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto space-y-6 pb-24">
              {/* Region Filter */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  지역
                </h3>
                <div className="flex flex-wrap gap-2">
                  {regions.map((r) => (
                    <FilterChip
                      key={r.value}
                      label={r.label}
                      isActive={region === r.value}
                      onClick={() => setRegion(region === r.value ? null : r.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Price Slider */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  가격대 (1인 식대)
                </h3>
                <div className="px-2">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>{PRICE_MIN / 10000}만원</span>
                    <span className="font-semibold text-foreground">
                      {maxPrice ? `${maxPrice / 10000}만원 이하` : "전체"}
                    </span>
                    <span>{PRICE_MAX / 10000}만원</span>
                  </div>
                  <Slider
                    value={[maxPrice || PRICE_MAX]}
                    onValueChange={(value) => setMaxPrice(value[0] === PRICE_MAX ? null : value[0])}
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={PRICE_STEP}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Guarantee Slider */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  보증인원
                </h3>
                <div className="px-2">
                  <div className="flex justify-between text-sm text-muted-foreground mb-3">
                    <span>{GUARANTEE_MIN}명</span>
                    <span className="font-semibold text-foreground">
                      {maxGuarantee ? `${maxGuarantee}명 이하` : "전체"}
                    </span>
                    <span>{GUARANTEE_MAX}명</span>
                  </div>
                  <Slider
                    value={[maxGuarantee || GUARANTEE_MAX]}
                    onValueChange={(value) => setMaxGuarantee(value[0] === GUARANTEE_MAX ? null : value[0])}
                    min={GUARANTEE_MIN}
                    max={GUARANTEE_MAX}
                    step={GUARANTEE_STEP}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  평점
                </h3>
                <div className="flex flex-wrap gap-2">
                  {ratingOptions.map((r) => (
                    <FilterChip
                      key={r.value}
                      label={r.label}
                      isActive={minRating === r.value}
                      onClick={() =>
                        setMinRating(minRating === r.value ? null : r.value)
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Hall Type Filter (복수선택) */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  홀타입 <span className="text-xs text-muted-foreground font-normal">(복수선택 가능)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {hallTypeOptions.map((h) => (
                    <FilterChip
                      key={h.value}
                      label={h.label}
                      isActive={hallTypes.includes(h.value)}
                      onClick={() => toggleHallType(h.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Meal Options Filter (복수선택) */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  식사 옵션 <span className="text-xs text-muted-foreground font-normal">(복수선택 가능)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {mealOptionOptions.map((m) => (
                    <FilterChip
                      key={m.value}
                      label={m.label}
                      isActive={mealOptions.includes(m.value)}
                      onClick={() => toggleMealOption(m.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Event Options Filter (복수선택) */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <PartyPopper className="w-4 h-4" />
                  이벤트옵션 <span className="text-xs text-muted-foreground font-normal">(복수선택 가능)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {eventOptionOptions.map((e) => (
                    <FilterChip
                      key={e.value}
                      label={e.label}
                      isActive={eventOptions.includes(e.value)}
                      onClick={() => toggleEventOption(e.value)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
              <Button
                className="w-full h-12"
                onClick={() => setSheetOpen(false)}
              >
                결과 보기
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Quick filter chips with dropdowns */}
        <QuickFilterChip
          label={region || ""}
          defaultLabel="지역"
          isActive={!!region}
          icon={<MapPin className="w-3.5 h-3.5" />}
          onClear={() => setRegion(null)}
        >
          {regions.map((r) => (
            <FilterOption
              key={r.value}
              label={r.label}
              isSelected={region === r.value}
              onClick={() => setRegion(region === r.value ? null : r.value)}
            />
          ))}
        </QuickFilterChip>

        <QuickFilterChip
          label={getPriceLabel() || ""}
          defaultLabel="가격대"
          isActive={!!maxPrice}
          icon={<Wallet className="w-3.5 h-3.5" />}
          onClear={() => setMaxPrice(null)}
          keepOpen
        >
          <div className="p-3 min-w-[200px]">
            <div className="text-sm font-medium mb-2 text-center">
              {maxPrice ? `${maxPrice / 10000}만원 이하` : "전체"}
            </div>
            <Slider
              value={[maxPrice || PRICE_MAX]}
              onValueChange={(value) => setMaxPrice(value[0] === PRICE_MAX ? null : value[0])}
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{PRICE_MIN / 10000}만</span>
              <span>{PRICE_MAX / 10000}만</span>
            </div>
          </div>
        </QuickFilterChip>

        <QuickFilterChip
          label={getGuaranteeLabel() || ""}
          defaultLabel="보증인원"
          isActive={!!maxGuarantee}
          icon={<Users className="w-3.5 h-3.5" />}
          onClear={() => setMaxGuarantee(null)}
          keepOpen
        >
          <div className="p-3 min-w-[200px]">
            <div className="text-sm font-medium mb-2 text-center">
              {maxGuarantee ? `${maxGuarantee}명 이하` : "전체"}
            </div>
            <Slider
              value={[maxGuarantee || GUARANTEE_MAX]}
              onValueChange={(value) => setMaxGuarantee(value[0] === GUARANTEE_MAX ? null : value[0])}
              min={GUARANTEE_MIN}
              max={GUARANTEE_MAX}
              step={GUARANTEE_STEP}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{GUARANTEE_MIN}명</span>
              <span>{GUARANTEE_MAX}명</span>
            </div>
          </div>
        </QuickFilterChip>

        <QuickFilterChip
          label={minRating ? `${minRating}점 이상` : ""}
          defaultLabel="평점"
          isActive={!!minRating}
          icon={<Star className="w-3.5 h-3.5" />}
          onClear={() => setMinRating(null)}
        >
          {ratingOptions.map((r) => (
            <FilterOption
              key={r.value}
              label={r.label}
              isSelected={minRating === r.value}
              onClick={() => setMinRating(minRating === r.value ? null : r.value)}
            />
          ))}
        </QuickFilterChip>

        {/* 홀타입 (복수선택) */}
        <QuickFilterChip
          label={getHallTypesLabel() || ""}
          defaultLabel="홀타입"
          isActive={hallTypes.length > 0}
          icon={<Building2 className="w-3.5 h-3.5" />}
          onClear={() => setHallTypes([])}
          keepOpen
        >
          {hallTypeOptions.map((h) => (
            <MultiFilterOption
              key={h.value}
              label={h.label}
              isSelected={hallTypes.includes(h.value)}
              onClick={() => toggleHallType(h.value)}
            />
          ))}
        </QuickFilterChip>

        {/* 식사 옵션 (복수선택) */}
        <QuickFilterChip
          label={getMealOptionsLabel() || ""}
          defaultLabel="식사"
          isActive={mealOptions.length > 0}
          icon={<UtensilsCrossed className="w-3.5 h-3.5" />}
          onClear={() => setMealOptions([])}
          keepOpen
        >
          {mealOptionOptions.map((m) => (
            <MultiFilterOption
              key={m.value}
              label={m.label}
              isSelected={mealOptions.includes(m.value)}
              onClick={() => toggleMealOption(m.value)}
            />
          ))}
        </QuickFilterChip>

        {/* 이벤트옵션 (복수선택) */}
        <QuickFilterChip
          label={getEventOptionsLabel() || ""}
          defaultLabel="이벤트"
          isActive={eventOptions.length > 0}
          icon={<PartyPopper className="w-3.5 h-3.5" />}
          onClear={() => setEventOptions([])}
          keepOpen
        >
          {eventOptionOptions.map((e) => (
            <MultiFilterOption
              key={e.value}
              label={e.label}
              isSelected={eventOptions.includes(e.value)}
              onClick={() => toggleEventOption(e.value)}
            />
          ))}
        </QuickFilterChip>
      </div>
    </div>
  );
};

export default FilterBar;