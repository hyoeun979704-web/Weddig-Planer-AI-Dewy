import { useState } from "react";
import { MapPin, Wallet, Users, Star, X, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/stores/useFilterStore";

const regions = [
  { value: "서울", label: "서울" },
  { value: "경기", label: "경기" },
  { value: "인천", label: "인천" },
  { value: "부산", label: "부산" },
  { value: "대구", label: "대구" },
];

const priceRanges = [
  { value: [0, 70000] as [number, number], label: "7만원 이하" },
  { value: [70000, 100000] as [number, number], label: "7~10만원" },
  { value: [100000, 150000] as [number, number], label: "10~15만원" },
  { value: [150000, 999999] as [number, number], label: "15만원 이상" },
];

const minGuaranteeOptions = [
  { value: 100, label: "100명 이하" },
  { value: 150, label: "150명 이하" },
  { value: 200, label: "200명 이하" },
  { value: 250, label: "250명 이하" },
];

const ratingOptions = [
  { value: 4.5, label: "4.5점 이상" },
  { value: 4.7, label: "4.7점 이상" },
  { value: 4.9, label: "4.9점 이상" },
];

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
}

const QuickFilterChip = ({ label, defaultLabel, isActive, icon, onClear, children }: QuickFilterChipProps) => {
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
        <div className="flex flex-col gap-1" onClick={() => setOpen(false)}>
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

const FilterBar = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const {
    region,
    priceRange,
    minGuarantee,
    minRating,
    setRegion,
    setPriceRange,
    setMinGuarantee,
    setMinRating,
    resetFilters,
    hasActiveFilters,
  } = useFilterStore();

  const activeFiltersCount = [region, priceRange, minGuarantee, minRating].filter(Boolean).length;

  const getPriceLabel = () => {
    if (!priceRange) return null;
    const found = priceRanges.find(p => p.value[0] === priceRange[0] && p.value[1] === priceRange[1]);
    return found?.label || `${(priceRange[0] / 10000).toFixed(0)}~${(priceRange[1] / 10000).toFixed(0)}만원`;
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
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
            <SheetHeader className="text-left mb-6">
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

            <div className="space-y-6 overflow-y-auto">
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

              {/* Price Range Filter */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  가격대 (1인 식대)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((p) => (
                    <FilterChip
                      key={p.label}
                      label={p.label}
                      isActive={
                        priceRange?.[0] === p.value[0] && priceRange?.[1] === p.value[1]
                      }
                      onClick={() =>
                        setPriceRange(
                          priceRange?.[0] === p.value[0] && priceRange?.[1] === p.value[1]
                            ? null
                            : p.value
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Min Guarantee Filter */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  보증인원
                </h3>
                <div className="flex flex-wrap gap-2">
                  {minGuaranteeOptions.map((g) => (
                    <FilterChip
                      key={g.value}
                      label={g.label}
                      isActive={minGuarantee === g.value}
                      onClick={() =>
                        setMinGuarantee(minGuarantee === g.value ? null : g.value)
                      }
                    />
                  ))}
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
          isActive={!!priceRange}
          icon={<Wallet className="w-3.5 h-3.5" />}
          onClear={() => setPriceRange(null)}
        >
          {priceRanges.map((p) => (
            <FilterOption
              key={p.label}
              label={p.label}
              isSelected={priceRange?.[0] === p.value[0] && priceRange?.[1] === p.value[1]}
              onClick={() =>
                setPriceRange(
                  priceRange?.[0] === p.value[0] && priceRange?.[1] === p.value[1]
                    ? null
                    : p.value
                )
              }
            />
          ))}
        </QuickFilterChip>

        <QuickFilterChip
          label={minGuarantee ? `${minGuarantee}명 이하` : ""}
          defaultLabel="보증인원"
          isActive={!!minGuarantee}
          icon={<Users className="w-3.5 h-3.5" />}
          onClear={() => setMinGuarantee(null)}
        >
          {minGuaranteeOptions.map((g) => (
            <FilterOption
              key={g.value}
              label={g.label}
              isSelected={minGuarantee === g.value}
              onClick={() => setMinGuarantee(minGuarantee === g.value ? null : g.value)}
            />
          ))}
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
      </div>
    </div>
  );
};

export default FilterBar;
