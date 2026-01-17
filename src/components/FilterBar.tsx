import { useState } from "react";
import { MapPin, Wallet, Users, Star, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

        {/* Quick filter chips */}
        <FilterChip
          label={region || "지역"}
          isActive={!!region}
          onClick={() => setRegion(null)}
          icon={region ? <X className="w-3 h-3" /> : <MapPin className="w-3.5 h-3.5" />}
        />
        <FilterChip
          label={priceRange ? `${(priceRange[0] / 10000).toFixed(0)}~${(priceRange[1] / 10000).toFixed(0)}만원` : "가격대"}
          isActive={!!priceRange}
          onClick={() => setPriceRange(null)}
          icon={priceRange ? <X className="w-3 h-3" /> : <Wallet className="w-3.5 h-3.5" />}
        />
        <FilterChip
          label={minGuarantee ? `${minGuarantee}명 이하` : "보증인원"}
          isActive={!!minGuarantee}
          onClick={() => setMinGuarantee(null)}
          icon={minGuarantee ? <X className="w-3 h-3" /> : <Users className="w-3.5 h-3.5" />}
        />
        <FilterChip
          label={minRating ? `${minRating}점+` : "평점"}
          isActive={!!minRating}
          onClick={() => setMinRating(null)}
          icon={minRating ? <X className="w-3 h-3" /> : <Star className="w-3.5 h-3.5" />}
        />
      </div>
    </div>
  );
};

export default FilterBar;
