import { SlidersHorizontal, X, ChevronDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCategoryFilterStore, CategoryType } from "@/stores/useCategoryFilterStore";
import { useState } from "react";

interface FilterConfig {
  title: string;
  regions: { value: string; label: string }[];
  filterOptions1: { label: string; options: { value: string; label: string }[] };
  filterOptions2: { label: string; options: { value: string; label: string }[] };
  filterOptions3: { label: string; options: { value: string; label: string }[] };
}

const filterConfigs: Record<CategoryType, FilterConfig> = {
  studios: {
    title: "스드메 필터",
    regions: [
      { value: "강남", label: "강남" },
      { value: "서초", label: "서초" },
      { value: "마포", label: "마포" },
      { value: "용산", label: "용산" },
      { value: "송파", label: "송파" },
      { value: "성남", label: "성남" },
    ],
    filterOptions1: {
      label: "패키지 유형",
      options: [
        { value: "스드메", label: "스드메" },
        { value: "스튜디오단독", label: "스튜디오 단독" },
        { value: "패키지", label: "패키지" },
        { value: "프리미엄", label: "프리미엄" },
      ],
    },
    filterOptions2: {
      label: "스타일",
      options: [
        { value: "모던", label: "모던" },
        { value: "내추럴", label: "내추럴" },
        { value: "클래식", label: "클래식" },
        { value: "로맨틱", label: "로맨틱" },
        { value: "빈티지", label: "빈티지" },
        { value: "심플", label: "심플" },
        { value: "엘레강스", label: "엘레강스" },
      ],
    },
    filterOptions3: {
      label: "포함 서비스",
      options: [
        { value: "헤어메이크업", label: "헤어메이크업" },
        { value: "드레스포함", label: "드레스 포함" },
        { value: "액자포함", label: "액자 포함" },
        { value: "영상포함", label: "영상 포함" },
      ],
    },
  },
  honeymoon: {
    title: "허니문 필터",
    regions: [
      { value: "몰디브", label: "몰디브" },
      { value: "인도네시아", label: "발리" },
      { value: "프랑스", label: "유럽" },
      { value: "하와이", label: "하와이" },
      { value: "그리스", label: "그리스" },
      { value: "태국", label: "태국" },
    ],
    filterOptions1: {
      label: "여행 유형",
      options: [
        { value: "리조트", label: "리조트" },
        { value: "투어", label: "투어" },
        { value: "해변", label: "해변" },
        { value: "도시", label: "도시" },
        { value: "문화", label: "문화" },
      ],
    },
    filterOptions2: {
      label: "포함 서비스",
      options: [
        { value: "항공권", label: "항공권" },
        { value: "숙박", label: "숙박" },
        { value: "조식", label: "조식" },
        { value: "전식사", label: "전식사" },
        { value: "가이드", label: "가이드" },
      ],
    },
    filterOptions3: {
      label: "숙소 유형",
      options: [
        { value: "풀빌라", label: "풀빌라" },
        { value: "오버워터", label: "오버워터" },
        { value: "리조트", label: "리조트" },
        { value: "호텔", label: "호텔" },
        { value: "부티크", label: "부티크" },
      ],
    },
  },
  honeymoon_gifts: {
    title: "혼수 필터",
    regions: [
      { value: "삼성", label: "삼성" },
      { value: "LG", label: "LG" },
      { value: "시몬스", label: "시몬스" },
      { value: "한샘", label: "한샘" },
      { value: "에이스", label: "에이스" },
      { value: "다이슨", label: "다이슨" },
    ],
    filterOptions1: {
      label: "카테고리",
      options: [
        { value: "가전", label: "가전" },
        { value: "가구", label: "가구" },
        { value: "인테리어", label: "인테리어" },
        { value: "침대", label: "침대" },
        { value: "냉장고", label: "냉장고" },
        { value: "세탁기", label: "세탁기" },
        { value: "청소기", label: "청소기" },
      ],
    },
    filterOptions2: {
      label: "브랜드",
      options: [
        { value: "삼성", label: "삼성" },
        { value: "LG", label: "LG" },
        { value: "비스포크", label: "비스포크" },
        { value: "오브제", label: "오브제" },
        { value: "시몬스", label: "시몬스" },
        { value: "한샘", label: "한샘" },
        { value: "다이슨", label: "다이슨" },
      ],
    },
    filterOptions3: {
      label: "배송 옵션",
      options: [
        { value: "무료배송", label: "무료배송" },
        { value: "설치포함", label: "설치포함" },
      ],
    },
  },
  appliances: {
    title: "가전·예물 필터",
    regions: [
      { value: "삼성", label: "삼성" },
      { value: "LG", label: "LG" },
      { value: "까르띠에", label: "까르띠에" },
      { value: "티파니", label: "티파니" },
      { value: "발뮤다", label: "발뮤다" },
      { value: "루이비통", label: "루이비통" },
    ],
    filterOptions1: {
      label: "카테고리",
      options: [
        { value: "예물", label: "예물" },
        { value: "가전", label: "가전" },
        { value: "시계", label: "시계" },
        { value: "반지", label: "반지" },
        { value: "TV", label: "TV" },
        { value: "주방", label: "주방" },
        { value: "가방", label: "가방" },
      ],
    },
    filterOptions2: {
      label: "브랜드",
      options: [
        { value: "삼성", label: "삼성" },
        { value: "LG", label: "LG" },
        { value: "까르띠에", label: "까르띠에" },
        { value: "티파니", label: "티파니" },
        { value: "발뮤다", label: "발뮤다" },
        { value: "루이비통", label: "루이비통" },
      ],
    },
    filterOptions3: {
      label: "특징",
      options: [
        { value: "스마트워치", label: "스마트워치" },
        { value: "다이아몬드", label: "다이아몬드" },
        { value: "18K", label: "18K" },
        { value: "플래티넘", label: "플래티넘" },
        { value: "명품", label: "명품" },
        { value: "프리미엄", label: "프리미엄" },
      ],
    },
  },
  suits: {
    title: "예복 필터",
    regions: [
      { value: "강남", label: "강남" },
      { value: "서초", label: "서초" },
      { value: "종로", label: "종로" },
      { value: "분당", label: "분당" },
      { value: "압구정", label: "압구정" },
      { value: "명동", label: "명동" },
    ],
    filterOptions1: {
      label: "예복 유형",
      options: [
        { value: "턱시도", label: "턱시도" },
        { value: "정장", label: "정장" },
        { value: "예복", label: "예복" },
        { value: "캐주얼", label: "캐주얼" },
        { value: "프리미엄", label: "프리미엄" },
      ],
    },
    filterOptions2: {
      label: "브랜드/유형",
      options: [
        { value: "제니하우스", label: "제니하우스" },
        { value: "노블레스", label: "노블레스" },
        { value: "맞춤", label: "맞춤" },
        { value: "기성복", label: "기성복" },
        { value: "수입", label: "수입" },
      ],
    },
    filterOptions3: {
      label: "서비스",
      options: [
        { value: "맞춤제작", label: "맞춤제작" },
        { value: "수선포함", label: "수선포함" },
        { value: "피팅3회", label: "피팅 3회" },
        { value: "VIP피팅", label: "VIP 피팅" },
      ],
    },
  },
  hanbok: {
    title: "한복 필터",
    regions: [
      { value: "종로", label: "종로" },
      { value: "강남", label: "강남" },
      { value: "서대문", label: "서대문" },
      { value: "일산", label: "일산" },
      { value: "청담", label: "청담" },
      { value: "인사동", label: "인사동" },
    ],
    filterOptions1: {
      label: "한복 유형",
      options: [
        { value: "신부한복", label: "신부한복" },
        { value: "혼주한복", label: "혼주한복" },
        { value: "폐백한복", label: "폐백한복" },
        { value: "대여", label: "대여" },
        { value: "촬영용", label: "촬영용" },
        { value: "프리미엄", label: "프리미엄" },
      ],
    },
    filterOptions2: {
      label: "스타일",
      options: [
        { value: "전통", label: "전통" },
        { value: "현대", label: "현대" },
        { value: "퓨전", label: "퓨전" },
        { value: "모던", label: "모던" },
        { value: "심플", label: "심플" },
        { value: "화려", label: "화려" },
      ],
    },
    filterOptions3: {
      label: "서비스",
      options: [
        { value: "맞춤제작", label: "맞춤제작" },
        { value: "대여가능", label: "대여가능" },
        { value: "당일픽업", label: "당일픽업" },
        { value: "헤어포함", label: "헤어포함" },
        { value: "VIP서비스", label: "VIP서비스" },
        { value: "단체할인", label: "단체할인" },
      ],
    },
  },
};

const ratingOptions = [
  { value: 4.5, label: "4.5점 이상" },
  { value: 4.0, label: "4.0점 이상" },
  { value: 3.5, label: "3.5점 이상" },
];

interface CategoryFilterBarProps {
  category: CategoryType;
}

const FilterChip = ({
  children,
  active,
  onClick,
  onClear,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  onClear?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-primary/10"
    }`}
  >
    {children}
    {active && onClear && (
      <X
        className="w-3.5 h-3.5"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
      />
    )}
    {!active && <ChevronDown className="w-3.5 h-3.5" />}
  </button>
);

export default function CategoryFilterBar({ category }: CategoryFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const config = filterConfigs[category];

  const {
    region,
    minRating,
    filterOptions1,
    filterOptions2,
    filterOptions3,
    setRegion,
    setMinRating,
    toggleFilterOption1,
    toggleFilterOption2,
    toggleFilterOption3,
    resetFilters,
    hasActiveFilters,
  } = useCategoryFilterStore();

  return (
    <div className="sticky top-14 z-30 bg-background border-b border-border">
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide">
        {/* Filter Sheet Trigger */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`flex-shrink-0 gap-1.5 rounded-full ${
                hasActiveFilters() ? "border-primary text-primary" : ""
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              필터
              {hasActiveFilters() && (
                <span className="ml-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                  {(region ? 1 : 0) +
                    (minRating ? 1 : 0) +
                    (filterOptions1.length > 0 ? 1 : 0) +
                    (filterOptions2.length > 0 ? 1 : 0) +
                    (filterOptions3.length > 0 ? 1 : 0)}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
            <SheetHeader className="pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <SheetTitle>{config.title}</SheetTitle>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  초기화
                </Button>
              </div>
            </SheetHeader>
            <div className="overflow-y-auto py-4 space-y-6 max-h-[calc(80vh-80px)]">
              {/* Region Filter */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">지역/브랜드</h3>
                <div className="flex flex-wrap gap-2">
                  {config.regions.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRegion(region === r.value ? null : r.value)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        region === r.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">평점</h3>
                <div className="flex flex-wrap gap-2">
                  {ratingOptions.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setMinRating(minRating === r.value ? null : r.value)}
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 ${
                        minRating === r.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Star className="w-3 h-3" />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Options 1 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">{config.filterOptions1.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {config.filterOptions1.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleFilterOption1(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        filterOptions1.includes(opt.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Options 2 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">{config.filterOptions2.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {config.filterOptions2.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleFilterOption2(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        filterOptions2.includes(opt.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Options 3 */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">{config.filterOptions3.label}</h3>
                <div className="flex flex-wrap gap-2">
                  {config.filterOptions3.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleFilterOption3(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm ${
                        filterOptions3.includes(opt.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Quick Filter Chips */}
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <FilterChip
                active={!!region}
                onClear={() => setRegion(null)}
              >
                {region || "지역"}
              </FilterChip>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {config.regions.map((r) => (
              <button
                key={r.value}
                onClick={() => setRegion(r.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  region === r.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <div>
              <FilterChip
                active={!!minRating}
                onClear={() => setMinRating(null)}
              >
                {minRating ? `${minRating}점+` : "평점"}
              </FilterChip>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="start">
            {ratingOptions.map((r) => (
              <button
                key={r.value}
                onClick={() => setMinRating(r.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  minRating === r.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Star className="w-3 h-3" />
                {r.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <div>
              <FilterChip
                active={filterOptions1.length > 0}
                onClear={() => useCategoryFilterStore.getState().setFilterOptions1([])}
              >
                {filterOptions1.length > 0 ? `${config.filterOptions1.label} ${filterOptions1.length}` : config.filterOptions1.label}
              </FilterChip>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            {config.filterOptions1.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleFilterOption1(opt.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  filterOptions1.includes(opt.value) ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
