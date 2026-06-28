import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { STORE_CATEGORIES } from "@/lib/storeCategories";
import { formatManwon as formatPrice } from "@dewy/lib";

export interface StoreFilters {
  category: string | null;
  priceRange: [number, number];
  colors: string[];
  sizes: string[];
  keyword: string;
}

const initialFilters: StoreFilters = {
  category: null,
  priceRange: [0, 500000],
  colors: [],
  sizes: [],
  keyword: "",
};
const colorOptions = ["화이트", "블랙", "핑크", "레드", "블루", "골드", "실버", "아이보리"];
const sizeOptions = ["FREE", "XS", "S", "M", "L", "XL"];

interface StoreFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: StoreFilters;
  onApply: (filters: StoreFilters) => void;
}


const StoreFilterSheet = ({ open, onOpenChange, filters, onApply }: StoreFilterSheetProps) => {
  const [local, setLocal] = useState<StoreFilters>(filters);

  const handleOpen = (o: boolean) => {
    if (o) setLocal(filters);
    onOpenChange(o);
  };

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const reset = () => setLocal(initialFilters);

  const apply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const activeCount = [
    local.category ? 1 : 0,
    local.priceRange[0] > 0 || local.priceRange[1] < 500000 ? 1 : 0,
    local.colors.length,
    local.sizes.length,
    local.keyword ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="bottom" className="app-col mx-auto rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <SheetTitle className="text-lg font-bold">상세 필터</SheetTitle>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            초기화
          </button>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Category */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {STORE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setLocal((p) => ({ ...p, category: p.category === cat.value ? null : cat.value }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    local.category === cat.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </section>

          {/* Price */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-1">가격</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {formatPrice(local.priceRange[0])} ~ {formatPrice(local.priceRange[1])}
            </p>
            <Slider
              min={0}
              max={500000}
              step={10000}
              value={local.priceRange}
              onValueChange={(v) => setLocal((p) => ({ ...p, priceRange: v as [number, number] }))}
              className="w-full"
            />
          </section>

          {/* Color */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">색상</h3>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setLocal((p) => ({ ...p, colors: toggleItem(p.colors, color) }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    local.colors.includes(color)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </section>

          {/* Size */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">사이즈</h3>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => setLocal((p) => ({ ...p, sizes: toggleItem(p.sizes, size) }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    local.sizes.includes(size)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </section>

          {/* Keyword */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">키워드</h3>
            <Input
              placeholder="상품명, 브랜드 등 검색"
              value={local.keyword}
              onChange={(e) => setLocal((p) => ({ ...p, keyword: e.target.value }))}
              className="h-10 text-sm"
            />
          </section>
        </div>

        {/* Apply */}
        <div className="sticky bottom-0 bg-card pt-3 pb-2 border-t border-border">
          <Button onClick={apply} className="w-full h-12 text-base font-semibold rounded-xl">
            {activeCount > 0 ? `필터 적용 (${activeCount})` : "필터 적용"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { initialFilters };
export default StoreFilterSheet;
