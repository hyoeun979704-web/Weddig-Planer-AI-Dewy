import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface InfoFilters {
  category: string | null;
  duration: string | null;
  uploadDate: string | null;
  keyword: string;
}

const initialInfoFilters: InfoFilters = {
  category: null,
  duration: null,
  uploadDate: null,
  keyword: "",
};

const detailCategories = ["웨딩플래너", "드레스", "메이크업", "허니문", "인테리어", "기타"];
const durationOptions = ["5분 이하", "5~10분", "10~30분", "30분 이상"];
const uploadDateOptions = ["최근 1주", "최근 1개월", "최근 3개월", "최근 1년"];

interface InfoFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: InfoFilters;
  onApply: (filters: InfoFilters) => void;
}

const InfoFilterSheet = ({ open, onOpenChange, filters, onApply }: InfoFilterSheetProps) => {
  const [local, setLocal] = useState<InfoFilters>(filters);

  const handleOpen = (o: boolean) => {
    if (o) setLocal(filters);
    onOpenChange(o);
  };

  const reset = () => setLocal(initialInfoFilters);

  const apply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const activeCount = [
    local.category ? 1 : 0,
    local.duration ? 1 : 0,
    local.uploadDate ? 1 : 0,
    local.keyword ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const chipClass = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-muted-foreground border-border hover:border-primary/50"
    }`;

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="bottom" className="max-w-[430px] mx-auto rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pb-4 border-b border-border">
          <SheetTitle className="text-lg font-bold">상세 필터</SheetTitle>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            초기화
          </button>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Detail Category */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">상세카테고리</h3>
            <div className="flex flex-wrap gap-2">
              {detailCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setLocal((p) => ({ ...p, category: p.category === cat ? null : cat }))}
                  className={chipClass(local.category === cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* Duration */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">영상길이</h3>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => setLocal((p) => ({ ...p, duration: p.duration === d ? null : d }))}
                  className={chipClass(local.duration === d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </section>

          {/* Upload Date */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">업로드 날짜</h3>
            <div className="flex flex-wrap gap-2">
              {uploadDateOptions.map((d) => (
                <button
                  key={d}
                  onClick={() => setLocal((p) => ({ ...p, uploadDate: p.uploadDate === d ? null : d }))}
                  className={chipClass(local.uploadDate === d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </section>

          {/* Keyword */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3">키워드</h3>
            <Input
              placeholder="인플루언서명, 태그 등 검색"
              value={local.keyword}
              onChange={(e) => setLocal((p) => ({ ...p, keyword: e.target.value }))}
              className="h-10 text-sm"
            />
          </section>
        </div>

        <div className="sticky bottom-0 bg-background pt-3 pb-2 border-t border-border">
          <Button onClick={apply} className="w-full h-12 text-base font-semibold rounded-xl">
            {activeCount > 0 ? `필터 적용 (${activeCount})` : "필터 적용"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { initialInfoFilters };
export default InfoFilterSheet;
