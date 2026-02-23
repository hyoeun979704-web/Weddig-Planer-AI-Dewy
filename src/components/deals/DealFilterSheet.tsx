import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Search, RotateCcw } from "lucide-react";

export interface DealFilters {
  category: string | null;
  region: string | null;
  maxPrice: number | null;
  keyword: string;
}

const defaultFilters: DealFilters = {
  category: null,
  region: null,
  maxPrice: null,
  keyword: "",
};

const filterCategories = ["드레스", "메이크업", "예물", "인테리어", "기타"];
const regions = [
  "서울", "경기", "인천", "부산", "대구", "대전", "광주", "울산", "세종",
  "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: DealFilters;
  onApply: (filters: DealFilters) => void;
}

const DealFilterSheet = ({ open, onOpenChange, filters, onApply }: Props) => {
  const [local, setLocal] = useState<DealFilters>(filters);

  const handleReset = () => setLocal(defaultFilters);
  const handleApply = () => {
    onApply(local);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* 상세 카테고리 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">상세 카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {filterCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLocal((p) => ({ ...p, category: p.category === cat ? null : cat }))}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    local.category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 지역 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">지역</h3>
            <div className="flex flex-wrap gap-2">
              {regions.map((r) => (
                <button
                  key={r}
                  onClick={() => setLocal((p) => ({ ...p, region: p.region === r ? null : r }))}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    local.region === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 가격 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              최대 가격 {local.maxPrice ? `${(local.maxPrice / 10000).toFixed(0)}만원` : "전체"}
            </h3>
            <Slider
              value={[local.maxPrice || 0]}
              onValueChange={([v]) => setLocal((p) => ({ ...p, maxPrice: v || null }))}
              max={500000}
              step={10000}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>전체</span>
              <span>50만원</span>
            </div>
          </div>

          {/* 키워드 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">키워드</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={local.keyword}
                onChange={(e) => setLocal((p) => ({ ...p, keyword: e.target.value }))}
                placeholder="파트너명, 혜택명 검색"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2 pb-4">
          <Button variant="outline" onClick={handleReset} className="flex-1 gap-1">
            <RotateCcw className="w-4 h-4" /> 초기화
          </Button>
          <Button onClick={handleApply} className="flex-1">
            적용하기
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DealFilterSheet;
export { defaultFilters };
