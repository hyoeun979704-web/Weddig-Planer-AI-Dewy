import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LayoutGrid } from "lucide-react";
import { Tile, type CategoryItem } from "@/components/home/HomeCategoryGrid";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiles: CategoryItem[];
  onSelect: (path: string) => void;
}

/**
 * 전체 카테고리 시트 — 홈 큐레이션이 8개를 넘을 때 "더보기"로 여는
 * 쇼핑앱식 전체 보기. 타일·정렬은 홈 그리드와 동일한 목록을 그대로 받는다
 * (페르소나 우선순위·excluded_categories 반영 단일 소스).
 */
const AllCategoriesSheet = ({ open, onOpenChange, tiles, onSelect }: Props) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="app-col mx-auto rounded-t-2xl max-h-[80vh] overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          전체 카테고리
        </SheetTitle>
      </SheetHeader>
      <div className="grid grid-cols-4 gap-x-5 gap-y-4 py-4">
        {tiles.map((cat) => (
          <Tile key={cat.label} item={cat} onClick={() => onSelect(cat.path)} />
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

export default AllCategoriesSheet;
