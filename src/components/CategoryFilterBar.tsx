import { SlidersHorizontal, X, ChevronDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCategoryFilterStore, CategoryType } from "@/stores/useCategoryFilterStore";
import React, { useState, forwardRef } from "react";

interface FilterConfig {
  title: string;
  /** 첫 번째 필터 칩 라벨 — 대부분 "지역"이지만 honeymoon은 "여행지", jewelry는 "가격대",
   *  appliances는 "유형"처럼 카테고리 의미에 맞게 사용. */
  regionLabel: string;
  regions: { value: string; label: string }[];
  filterOptions1: { label: string; options: { value: string; label: string }[] };
  filterOptions2: { label: string; options: { value: string; label: string }[] };
  filterOptions3: { label: string; options: { value: string; label: string }[] };
}

const filterConfigs: Record<CategoryType, FilterConfig> = {
  venues: {
    title: "웨딩홀 필터",
    regionLabel: "지역",
    regions: [
      { value: "서울특별시", label: "서울" },
      { value: "경기도", label: "경기" },
      { value: "인천광역시", label: "인천" },
      { value: "부산광역시", label: "부산" },
      { value: "대구광역시", label: "대구" },
      { value: "대전광역시", label: "대전" },
      { value: "광주광역시", label: "광주" },
      { value: "울산광역시", label: "울산" },
      { value: "세종", label: "세종" },
      { value: "강원", label: "강원" },
      { value: "충청북", label: "충북" },
      { value: "충청남", label: "충남" },
      { value: "전북", label: "전북" },
      { value: "전라남", label: "전남" },
      { value: "경상북", label: "경북" },
      { value: "경상남", label: "경남" },
      { value: "제주", label: "제주" },
    ],
    // Round 12 — place_wedding_halls.hall_styles 실제 분포 기준. 컨벤션(129)/하우스(106)/
    // 호텔(93)/가든(67)/야외(63)/모던(45)/채플(27)/클래식(23)/한옥(5) 만 의미있게 노출.
    filterOptions1: {
      label: "홀 유형",
      options: [
        { value: "컨벤션", label: "컨벤션" },
        { value: "하우스", label: "하우스" },
        { value: "호텔", label: "호텔" },
        { value: "가든", label: "가든" },
        { value: "채플", label: "채플" },
        { value: "한옥", label: "한옥" },
        { value: "모던", label: "모던" },
        { value: "클래식", label: "클래식" },
      ],
    },
    // place_wedding_halls.meal_types 실제: 뷔페(219)/양식(30)/코스(26)/한식(24)/중식(3).
    filterOptions2: {
      label: "식사 옵션",
      options: [
        { value: "뷔페", label: "뷔페" },
        { value: "양식", label: "양식" },
        { value: "코스", label: "코스" },
        { value: "한식", label: "한식" },
      ],
    },
    // boolean — outdoor_available=true 인 식장만 (73건). 데이터 부족한 다른
    // boolean (parking_available, food_tasting) 은 NULL 비율 높아 제외.
    filterOptions3: {
      label: "옵션",
      options: [
        { value: "outdoor_available", label: "야외 가능" },
      ],
    },
  },
  studios: {
    title: "스드메 필터",
    regionLabel: "지역",
    regions: [
      { value: "서울특별시", label: "서울" },
      { value: "경기도", label: "경기" },
      { value: "인천광역시", label: "인천" },
      { value: "부산광역시", label: "부산" },
      { value: "대구광역시", label: "대구" },
      { value: "대전광역시", label: "대전" },
      { value: "광주광역시", label: "광주" },
      { value: "울산광역시", label: "울산" },
      { value: "세종", label: "세종" },
      { value: "강원", label: "강원" },
      { value: "충청북", label: "충북" },
      { value: "충청남", label: "충남" },
      { value: "전북", label: "전북" },
      { value: "전라남", label: "전남" },
      { value: "경상북", label: "경북" },
      { value: "경상남", label: "경남" },
      { value: "제주", label: "제주" },
    ],
    // Round 12 — place_studios.package_types 실제: 스냅(69)/본식(50)/리허설(33)/
    // 풀패키지(20)/웨딩화보(9)/본식+리허설(9)/데이트스냅(7).
    filterOptions1: {
      label: "패키지 유형",
      options: [
        { value: "스냅", label: "스냅" },
        { value: "본식", label: "본식" },
        { value: "리허설", label: "리허설" },
        { value: "풀패키지", label: "풀패키지" },
        { value: "웨딩화보", label: "웨딩화보" },
      ],
    },
    // place_studios.shoot_styles 실제: 스냅(127)/스튜디오(95)/야외(94)/본식(89)/실내(79)/
    // 내추럴(49)/리허설(31)/감성(22)/빈티지(13)/인물중심(12)/한옥(9). UI 에선 스타일성
    // 강한 6개만 노출 — 스냅/본식/리허설은 패키지 유형에서 다룸.
    filterOptions2: {
      label: "스타일",
      options: [
        { value: "내추럴", label: "내추럴" },
        { value: "야외", label: "야외" },
        { value: "감성", label: "감성" },
        { value: "빈티지", label: "빈티지" },
        { value: "인물중심", label: "인물중심" },
        { value: "한옥", label: "한옥" },
      ],
    },
    // boolean — video_included=true (19건).
    filterOptions3: {
      label: "옵션",
      options: [
        { value: "video_included", label: "영상 포함" },
      ],
    },
  },
  dress_shops: {
    title: "드레스샵 필터",
    regionLabel: "지역",
    regions: [
      { value: "서울특별시", label: "서울" },
      { value: "경기도", label: "경기" },
      { value: "인천광역시", label: "인천" },
      { value: "부산광역시", label: "부산" },
      { value: "대구광역시", label: "대구" },
      { value: "대전광역시", label: "대전" },
      { value: "광주광역시", label: "광주" },
    ],
    // Round 12 — place_dress_shops.dress_styles 실제: 심플(5)/모던(5)/로맨틱(4)/
    // 비즈(3)/머메이드(3)/A라인(2)/벨라인(2). 데이터 자체가 적어 일관성 약함.
    // UI 칩 = DB 값 정확 매칭으로만 노출.
    filterOptions1: {
      label: "드레스 스타일",
      options: [
        { value: "심플", label: "심플" },
        { value: "모던", label: "모던" },
        { value: "로맨틱", label: "로맨틱" },
        { value: "머메이드", label: "머메이드" },
        { value: "A라인", label: "A라인" },
        { value: "벨라인", label: "벨라인" },
        { value: "비즈", label: "비즈" },
      ],
    },
    // f2/f3 매핑 가능한 boolean(rental_only) 데이터 거의 비어있음(true=1/false=3/null=109)
    // → 의미있는 필터링 불가. UI 칩 제거. 빈 dummy 슬롯으로 유지 (filterConfigs 타입 호환).
    filterOptions2: { label: "", options: [] },
    filterOptions3: { label: "", options: [] },
  },
  makeup_shops: {
    title: "메이크업샵 필터",
    regionLabel: "지역",
    regions: [
      { value: "서울특별시", label: "서울" },
      { value: "경기도", label: "경기" },
      { value: "인천광역시", label: "인천" },
      { value: "부산광역시", label: "부산" },
      { value: "대구광역시", label: "대구" },
      { value: "대전광역시", label: "대전" },
      { value: "광주광역시", label: "광주" },
    ],
    // Round 12 — place_makeup_shops.makeup_styles 실제: 내추럴(9)/모던(2)/리허설(2)/
    // 트렌디(2)/청순(2)/세련된(2)/우아한(2)/맞춤형(2). 매우 적어 의미 약함.
    // 글램/로맨틱 같은 기존 UI 값은 DB 0건.
    filterOptions1: {
      label: "메이크업 스타일",
      options: [
        { value: "내추럴", label: "내추럴" },
        { value: "모던", label: "모던" },
        { value: "청순", label: "청순" },
        { value: "트렌디", label: "트렌디" },
        { value: "세련된", label: "세련된" },
        { value: "우아한", label: "우아한" },
      ],
    },
    // makeup_shops 의 다른 boolean(includes_rehearsal, hair_makeup_separate 등)도
    // NULL 비율 90%+ 라 필터 가치 없음. 빈 슬롯으로 유지.
    filterOptions2: { label: "", options: [] },
    filterOptions3: { label: "", options: [] },
  },
  honeymoon: {
    title: "허니문 필터",
    regionLabel: "여행지",
    // honeymoon places.city = region_group (일본/동남아/유럽 등). 사용자의 한국
    // 거주지가 아니라 destination 광역 분류로 필터링.
    regions: [
      { value: "일본", label: "일본" },
      { value: "동남아", label: "동남아" },
      { value: "괌사이판", label: "괌·사이판" },
      { value: "유럽", label: "유럽" },
      { value: "미주", label: "미주" },
      { value: "대양주", label: "대양주" },
      { value: "중화권", label: "중화권" },
    ],
    // Round 12 — place_honeymoons.themes 실제: 휴양(19)/허니문(17)/럭셔리(12)/
    // 자연·액티비티(10)/가성비(9)/랜드마크(9)/도심관광(8)/자유여행(7)/쇼핑(4)/
    // 미식(2)/호캉스. 기존 UI [리조트/투어/해변/도시/문화] 는 매칭 0.
    filterOptions1: {
      label: "여행 유형",
      options: [
        { value: "휴양", label: "휴양" },
        { value: "럭셔리", label: "럭셔리" },
        { value: "자연·액티비티", label: "자연·액티비티" },
        { value: "가성비", label: "가성비" },
        { value: "랜드마크", label: "랜드마크" },
        { value: "도심관광", label: "도심관광" },
        { value: "자유여행", label: "자유여행" },
        { value: "쇼핑", label: "쇼핑" },
        { value: "미식", label: "미식" },
      ],
    },
    // product_type scalar 매핑. DB: package(34)/free_travel(12)/pass(1).
    filterOptions2: {
      label: "상품 유형",
      options: [
        { value: "package", label: "패키지" },
        { value: "free_travel", label: "자유여행" },
        { value: "pass", label: "이용권" },
      ],
    },
    // hotel_grade scalar 매핑. DB: 4성급(22)/5성급(11)/4.5성급(2)/특급(1).
    filterOptions3: {
      label: "호텔 등급",
      options: [
        { value: "4성급", label: "4성급" },
        { value: "5성급", label: "5성급" },
        { value: "특급", label: "특급" },
      ],
    },
  },
  jewelry: {
    title: "예물 필터",
    regionLabel: "가격대",
    // jewelry는 places.city가 본사·대표매장 도시 (서울 위주). region 필터는 brand_tier로 활용.
    regions: [
      { value: "대중", label: "대중 (50~150만원)" },
      { value: "프리미엄", label: "프리미엄 (150~400만원)" },
      { value: "럭셔리", label: "럭셔리 (400~1000만원)" },
      { value: "하이엔드", label: "하이엔드 (1000만원+)" },
    ],
    // Round 12 — place_jewelry.product_categories 실제 DB 28건 전부 "결혼반지" 단일.
    // 다른 유형(예물세트/예단/시계 등) 데이터 0건이라 UI 칩 클릭해도 결과 없음.
    // 데이터 추가될 때까지 단일 옵션만 노출.
    filterOptions1: {
      label: "상품 유형",
      options: [
        { value: "결혼반지", label: "결혼반지" },
      ],
    },
    // place_jewelry.metals 실제: 화이트골드(11)/18K(9)/14K(9)/로즈골드(7)/골드(7)/
    // 플래티넘(6)/실버. 14K/18K 추가하면 매칭율 더 높음.
    filterOptions2: {
      label: "메탈",
      options: [
        { value: "화이트골드", label: "화이트골드" },
        { value: "18K", label: "18K" },
        { value: "14K", label: "14K" },
        { value: "로즈골드", label: "로즈골드" },
        { value: "골드", label: "골드" },
        { value: "플래티넘", label: "플래티넘" },
      ],
    },
    // store_type DB: both(18)/offline(9)/online(1). 매칭 OK.
    filterOptions3: {
      label: "판매 채널",
      options: [
        { value: "both", label: "온·오프라인" },
        { value: "offline", label: "오프라인 매장" },
        { value: "online", label: "온라인" },
      ],
    },
  },
  appliances: {
    title: "혼수 필터",
    regionLabel: "유형",
    // appliance places.city는 매장 주소 (서울 강남구 등). region 칩은
    // product_type (매장/패키지/단품)으로 사용해 hybrid 모델을 노출.
    regions: [
      { value: "store", label: "매장" },
      { value: "package", label: "신혼 패키지" },
      { value: "single", label: "단품 모델" },
    ],
    // Round 12 — place_appliances.product_categories 실제: 가구(31)/침대(19)/에어컨(8)/
    // 세탁기/건조기(2)/냉장고(2)/소파(2)/의류관리기/김치냉장고/공기청정기/로봇청소기/
    // 매트리스/TV/프레임/베딩. "세탁기"/"건조기" 분리 옵션은 DB 와 매칭 안 되니 통합 표기.
    filterOptions1: {
      label: "카테고리",
      options: [
        { value: "가구", label: "가구" },
        { value: "침대", label: "침대" },
        { value: "소파", label: "소파" },
        { value: "매트리스", label: "매트리스" },
        { value: "에어컨", label: "에어컨" },
        { value: "냉장고", label: "냉장고" },
        { value: "세탁기/건조기", label: "세탁기/건조기" },
        { value: "공기청정기", label: "공기청정기" },
        { value: "로봇청소기", label: "로봇청소기" },
        { value: "의류관리기", label: "의류관리기" },
        { value: "TV", label: "TV" },
      ],
    },
    // place_appliances.brand_options 실제: LG(7)/삼성(6)/로보락(1)/시몬스(...). UI value
    // 와 DB value 정확 매칭만 유지. 비스포크/오브제/한샘/이케아/다이슨은 DB 0건이라 제거.
    filterOptions2: {
      label: "브랜드",
      options: [
        { value: "LG", label: "LG" },
        { value: "삼성", label: "삼성" },
        { value: "로보락", label: "로보락" },
      ],
    },
    // boolean_cols — value=컬럼명, 다중 선택 시 모두 true (AND).
    filterOptions3: {
      label: "혜택",
      options: [
        { value: "free_delivery", label: "무료 배송" },
        { value: "free_installation", label: "무료 설치" },
        { value: "old_appliance_pickup", label: "폐가전 수거" },
        { value: "card_discount_available", label: "카드 할인" },
      ],
    },
  },
  suits: {
    title: "예복 필터",
    regionLabel: "지역",
    regions: [
      { value: "서울특별시", label: "서울" },
      { value: "경기도", label: "경기" },
      { value: "인천광역시", label: "인천" },
      { value: "부산광역시", label: "부산" },
      { value: "대구광역시", label: "대구" },
      { value: "대전광역시", label: "대전" },
      { value: "광주광역시", label: "광주" },
      { value: "울산광역시", label: "울산" },
      { value: "세종", label: "세종" },
      { value: "강원", label: "강원" },
      { value: "충청북", label: "충북" },
      { value: "충청남", label: "충남" },
      { value: "전북", label: "전북" },
      { value: "전라남", label: "전남" },
      { value: "경상북", label: "경북" },
      { value: "경상남", label: "경남" },
      { value: "제주", label: "제주" },
    ],
    // Round 12 — place_tailor_shops.suit_styles 실제: 정장(97)/클래식(18)/턱시도(11)/
    // 비스포크(3)/모던(2)/MTM(2). 기존 UI [예복/캐주얼/프리미엄] 은 DB 0건.
    filterOptions1: {
      label: "예복 유형",
      options: [
        { value: "정장", label: "정장" },
        { value: "클래식", label: "클래식" },
        { value: "턱시도", label: "턱시도" },
        { value: "모던", label: "모던" },
        { value: "비스포크", label: "비스포크" },
        { value: "MTM", label: "MTM" },
      ],
    },
    // boolean — custom_available=true (93건). 데이터 풍부.
    filterOptions2: {
      label: "옵션",
      options: [
        { value: "custom_available", label: "맞춤 제작 가능" },
      ],
    },
    // 데이터 부족한 추가 차원 없음 — 빈 슬롯.
    filterOptions3: { label: "", options: [] },
  },
  hanbok: {
    title: "한복 필터",
    regionLabel: "지역",
    regions: [
      { value: "서울특별시", label: "서울" },
      { value: "경기도", label: "경기" },
      { value: "인천광역시", label: "인천" },
      { value: "부산광역시", label: "부산" },
      { value: "대구광역시", label: "대구" },
      { value: "대전광역시", label: "대전" },
      { value: "광주광역시", label: "광주" },
      { value: "울산광역시", label: "울산" },
      { value: "세종", label: "세종" },
      { value: "강원", label: "강원" },
      { value: "충청북", label: "충북" },
      { value: "충청남", label: "충남" },
      { value: "전북", label: "전북" },
      { value: "전라남", label: "전남" },
      { value: "경상북", label: "경북" },
      { value: "경상남", label: "경남" },
      { value: "제주", label: "제주" },
    ],
    // Round 12 — place_hanboks.hanbok_types 실제: 혼주(151)/대여(117)/신부(102)/
    // 신랑(72)/맞춤(50)/어머님(27)/폐백(16)/돌잔치(15)/아버님(14)/가족(6)/아동/행사/
    // 웨딩촬영(4)/하객. 기존 UI [신부한복/혼주한복/폐백한복] 는 잘못된 suffix 로 0 매칭.
    filterOptions1: {
      label: "한복 유형",
      options: [
        { value: "신부", label: "신부" },
        { value: "신랑", label: "신랑" },
        { value: "혼주", label: "혼주" },
        { value: "어머님", label: "어머님" },
        { value: "아버님", label: "아버님" },
        { value: "폐백", label: "폐백" },
        { value: "대여", label: "대여" },
        { value: "맞춤", label: "맞춤" },
        { value: "웨딩촬영", label: "웨딩촬영" },
        { value: "가족", label: "가족" },
      ],
    },
    // boolean — custom_available=true (75건). 데이터 충분.
    filterOptions2: {
      label: "옵션",
      options: [
        { value: "custom_available", label: "맞춤 제작 가능" },
      ],
    },
    // 한복 스타일(전통/현대 등) 별도 컬럼 없음. 다른 boolean(delivery_available)
    // 데이터 0개. 빈 슬롯.
    filterOptions3: { label: "", options: [] },
  },
  invitation_venues: {
    title: "청첩장 모임 필터",
    regionLabel: "지역",
    regions: [
      { value: "서울특별시", label: "서울" },
      { value: "경기도", label: "경기" },
      { value: "인천광역시", label: "인천" },
      { value: "부산광역시", label: "부산" },
      { value: "대구광역시", label: "대구" },
      { value: "대전광역시", label: "대전" },
      { value: "광주광역시", label: "광주" },
      { value: "울산광역시", label: "울산" },
      { value: "세종", label: "세종" },
      { value: "강원", label: "강원" },
      { value: "충청북", label: "충북" },
      { value: "충청남", label: "충남" },
      { value: "전북", label: "전북" },
      { value: "전라남", label: "전남" },
      { value: "경상북", label: "경북" },
      { value: "경상남", label: "경남" },
      { value: "제주", label: "제주" },
    ],
    // Round 12 — place_invitation_venues.venue_types 실제: 한식(65)/룸(20)/프라이빗(20)/
    // 양식(13)/코스(10)/일식(7)/이탈리안(3)/캐주얼다이닝(2)/중식(2). venue_types 는
    // 음식/공간 속성이 섞여있는 단일 컬럼이라 UI 도 단일 차원으로 통합.
    filterOptions1: {
      label: "분위기·음식",
      options: [
        { value: "한식", label: "한식" },
        { value: "양식", label: "양식" },
        { value: "일식", label: "일식" },
        { value: "중식", label: "중식" },
        { value: "이탈리안", label: "이탈리안" },
        { value: "코스", label: "코스" },
        { value: "프라이빗", label: "프라이빗" },
        { value: "룸", label: "룸" },
        { value: "캐주얼다이닝", label: "캐주얼다이닝" },
      ],
    },
    // 편의시설(valet_parking 등) NULL 100%, atmosphere 거의 비어있음. 빈 슬롯.
    filterOptions2: { label: "", options: [] },
    filterOptions3: { label: "", options: [] },
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

const CategoryFilterBar = forwardRef<HTMLDivElement, CategoryFilterBarProps>(function CategoryFilterBar({ category }, ref) {
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
    <div className="sticky top-14 z-30 bg-card border-b border-border">
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
            <div className="overflow-y-auto overscroll-contain py-4 space-y-6 max-h-[calc(80vh-80px)]">
              {/* Region Filter */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">{config.regionLabel}</h3>
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

              {/* Round 12 — 빈 슬롯(options.length===0) 은 섹션 자체 숨김. DB 데이터
                  부족·매핑 불가 카테고리에서 의미 없는 칩 노출 방지. */}
              {config.filterOptions1.options.length > 0 && (
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
              )}

              {config.filterOptions2.options.length > 0 && (
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
              )}

              {config.filterOptions3.options.length > 0 && (
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
              )}
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
                {region
                  ? (config.regions.find((r) => r.value === region)?.label ?? region)
                  : config.regionLabel}
              </FilterChip>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 max-h-[60vh] overflow-y-auto overscroll-contain" align="start">
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
          <PopoverContent className="w-40 p-2 max-h-[60vh] overflow-y-auto overscroll-contain" align="start">
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

        {config.filterOptions1.options.length > 0 && (
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
            <PopoverContent className="w-48 p-2 max-h-[60vh] overflow-y-auto overscroll-contain" align="start">
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
        )}
      </div>
    </div>
  );
});

export default CategoryFilterBar;
