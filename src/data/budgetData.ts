export interface RegionData {
  label: string;
  sub_regions: string[];
}

export interface RegionalAverage {
  total: number;
  venue: number;
  sdm: number;
  ring: number;
  house: number;
  honeymoon: number;
  etc: number;
  per_guest_meal: number;
  note: string;
}

export const regions: Record<string, RegionData> = {
  seoul: { label: "서울", sub_regions: ["강남/서초", "강동/송파", "강서/영등포", "마포/용산", "종로/중구", "기타"] },
  gyeonggi: { label: "경기", sub_regions: ["수원/화성", "성남/분당", "고양/파주", "용인", "안양/군포", "기타"] },
  incheon: { label: "인천", sub_regions: ["남동/연수", "부평/계양", "서구/중구", "기타"] },
  busan: { label: "부산", sub_regions: ["해운대/수영", "부산진/동래", "서면/남포동", "기타"] },
  daegu: { label: "대구", sub_regions: ["수성구", "달서구", "중구/동구", "기타"] },
  daejeon: { label: "대전", sub_regions: ["유성구", "서구", "중구/동구", "기타"] },
  gwangju: { label: "광주", sub_regions: ["서구/남구", "북구/광산구", "기타"] },
  ulsan: { label: "울산", sub_regions: ["남구", "중구", "기타"] },
  sejong: { label: "세종", sub_regions: ["세종시"] },
  gangwon: { label: "강원", sub_regions: ["춘천", "원주", "강릉", "기타"] },
  chungbuk: { label: "충북", sub_regions: ["청주", "충주", "기타"] },
  chungnam: { label: "충남", sub_regions: ["천안/아산", "서산/당진", "기타"] },
  jeonbuk: { label: "전북", sub_regions: ["전주", "익산/군산", "기타"] },
  jeonnam: { label: "전남", sub_regions: ["여수/순천", "목포/무안", "기타"] },
  gyeongbuk: { label: "경북", sub_regions: ["포항", "구미/김천", "경주", "기타"] },
  gyeongnam: { label: "경남", sub_regions: ["창원/마산", "김해/양산", "진주", "기타"] },
  jeju: { label: "제주", sub_regions: ["제주시", "서귀포시"] },
};

export const regionalAverages: Record<string, RegionalAverage> = {
  seoul: { total: 3200, venue: 500, sdm: 350, ring: 400, house: 800, honeymoon: 350, etc: 800, per_guest_meal: 8.5, note: "서울은 전국 평균 대비 약 20~30% 높음" },
  gyeonggi: { total: 2800, venue: 420, sdm: 300, ring: 350, house: 700, honeymoon: 330, etc: 700, per_guest_meal: 7.5, note: "분당/판교 등 일부 지역은 서울급" },
  incheon: { total: 2500, venue: 380, sdm: 280, ring: 300, house: 600, honeymoon: 300, etc: 640, per_guest_meal: 7.0, note: "" },
  busan: { total: 2600, venue: 400, sdm: 300, ring: 350, house: 650, honeymoon: 300, etc: 600, per_guest_meal: 7.0, note: "해운대/수영구는 서울급 비용" },
  daegu: { total: 2400, venue: 370, sdm: 270, ring: 300, house: 600, honeymoon: 280, etc: 580, per_guest_meal: 6.5, note: "" },
  daejeon: { total: 2300, venue: 350, sdm: 260, ring: 280, house: 550, honeymoon: 280, etc: 580, per_guest_meal: 6.5, note: "" },
  gwangju: { total: 2200, venue: 330, sdm: 250, ring: 270, house: 530, honeymoon: 270, etc: 550, per_guest_meal: 6.0, note: "" },
  ulsan: { total: 2500, venue: 380, sdm: 280, ring: 320, house: 630, honeymoon: 290, etc: 600, per_guest_meal: 7.0, note: "" },
  sejong: { total: 2400, venue: 360, sdm: 270, ring: 290, house: 580, honeymoon: 280, etc: 620, per_guest_meal: 6.5, note: "신도시 특성상 상승 추세" },
  gangwon: { total: 2000, venue: 300, sdm: 230, ring: 250, house: 450, honeymoon: 250, etc: 520, per_guest_meal: 6.0, note: "" },
  chungbuk: { total: 2100, venue: 310, sdm: 240, ring: 260, house: 480, honeymoon: 260, etc: 550, per_guest_meal: 6.0, note: "" },
  chungnam: { total: 2200, venue: 330, sdm: 250, ring: 270, house: 510, honeymoon: 270, etc: 570, per_guest_meal: 6.0, note: "천안/아산은 수도권 영향" },
  jeonbuk: { total: 2000, venue: 300, sdm: 230, ring: 240, house: 450, honeymoon: 250, etc: 530, per_guest_meal: 5.5, note: "" },
  jeonnam: { total: 1900, venue: 280, sdm: 220, ring: 230, house: 420, honeymoon: 240, etc: 510, per_guest_meal: 5.5, note: "" },
  gyeongbuk: { total: 2100, venue: 320, sdm: 240, ring: 260, house: 480, honeymoon: 260, etc: 540, per_guest_meal: 6.0, note: "" },
  gyeongnam: { total: 2300, venue: 350, sdm: 260, ring: 290, house: 550, honeymoon: 280, etc: 570, per_guest_meal: 6.5, note: "" },
  jeju: { total: 2200, venue: 350, sdm: 260, ring: 260, house: 500, honeymoon: 250, etc: 580, per_guest_meal: 6.5, note: "스몰웨딩/야외 비율 높음" },
};

/**
 * Returns regional averages with per-guest meal cost folded into `venue` and `total`.
 * Wedding hall venue averages in `regionalAverages` only cover hall rental/setup;
 * meal cost scales with guest count and must be added separately to avoid
 * showing users an unrealistically low budget.
 */
export const getRegionalAvgWithMeal = (regionKey: string, guestCount: number) => {
  const avg = regionalAverages[regionKey];
  if (!avg) return null;
  const mealCost = Math.round(avg.per_guest_meal * guestCount);
  return {
    ...avg,
    venue: avg.venue + mealCost,
    total: avg.total + mealCost,
    mealCost,
    baseVenue: avg.venue,
  };
};

export type BudgetCategory = "venue" | "sdm" | "ring" | "house" | "honeymoon" | "etc";

export interface CategoryInfo {
  label: string;
  emoji: string;
  color: string;
  sub_items: string[];
}

export const categories: Record<BudgetCategory, CategoryInfo> = {
  venue: { label: "웨딩홀", emoji: "💒", color: "#F4A7B9", sub_items: ["웨딩홀 대관료", "식대(뷔페/코스)", "주차비", "폐백실", "포토존", "추가 시간", "기타"] },
  sdm: { label: "스드메", emoji: "📸", color: "#A78BFA", sub_items: ["스튜디오 촬영", "드레스 대여", "메이크업", "본식스냅", "영상 촬영", "원본 데이터", "앨범 추가", "헬퍼", "부케", "기타"] },
  ring: { label: "예물/예단", emoji: "💍", color: "#F59E0B", sub_items: ["결혼반지", "예물(시계/주얼리)", "예단(한복/이불)", "함/폐백음식", "기타"] },
  house: { label: "혼수", emoji: "🏠", color: "#10B981", sub_items: ["가전(TV/냉장고/세탁기 등)", "가구(침대/소파/식탁 등)", "생활용품", "인테리어/리모델링", "이사비", "기타"] },
  honeymoon: { label: "허니문", emoji: "✈️", color: "#3B82F6", sub_items: ["항공권", "숙소", "여행자보험", "현지경비", "기타"] },
  etc: { label: "기타", emoji: "🎁", color: "#6B7280", sub_items: ["청첩장(종이/모바일)", "축의금 답례품", "결혼식 소품/데코", "사회자/축가", "감사선물", "기타"] },
};

export const paidByOptions = [
  { value: "shared", label: "공동", emoji: "🤝" },
  { value: "groom", label: "신랑측", emoji: "🤵" },
  { value: "bride", label: "신부측", emoji: "👰" },
] as const;

export const paymentStageOptions = [
  { value: "deposit", label: "예약금", emoji: "🔖" },
  { value: "contract", label: "계약금", emoji: "📝" },
  { value: "full", label: "완납", emoji: "✅" },
] as const;

export const paymentMethodOptions = [
  { value: "cash", label: "현금", emoji: "💵" },
  { value: "card", label: "카드", emoji: "💳" },
  { value: "transfer", label: "계좌이체", emoji: "🏦" },
  { value: "check", label: "수표", emoji: "🧾" },
] as const;

export const savingTips: Record<BudgetCategory, string[]> = {
  venue: [
    "주중이나 오전 예식은 10~30% 할인되는 곳이 많아요",
    "보증인원을 정확히 맞추면 불필요한 식대를 줄일 수 있어요",
    "얼리버드 예약(6개월 이상 전)으로 할인 받을 수 있어요",
    "별도 세팅비, 주차비, 포토존 비용은 계약 전 꼭 확인하세요",
  ],
  sdm: [
    "평일 촬영은 주말 대비 10~20% 저렴한 경우가 많아요",
    "원본 데이터 포함 여부를 꼭 확인하세요 (추가비 30~50만원)",
    "스드메 패키지는 개별 계약보다 평균 15% 절약돼요",
    "헬퍼비, 얼리스타트비 등 숨겨진 추가금을 미리 확인하세요",
  ],
  ring: [
    "예물은 시즌 세일(연말, 발렌타인) 때 구매하면 10~15% 절약",
    "브랜드 정가보다 백화점 카드 할인 + 상품권 활용이 효과적이에요",
    "예단 범위는 양가가 미리 협의하면 불필요한 지출을 줄일 수 있어요",
  ],
  house: [
    "가전은 결합 패키지로 구매하면 개별보다 15~20% 절약돼요",
    "전시품/리퍼 제품도 품질이 동일하면서 30~40% 저렴해요",
    "이사 비수기(3~5월, 9~11월 제외)에 하면 비용이 줄어요",
  ],
  honeymoon: [
    "비수기 출발(6~7월, 11~12월)은 항공+숙소가 30% 이상 저렴해요",
    "허니문 전문 여행사 패키지가 직접 예약보다 저렴한 경우가 많아요",
    "여행자보험은 카드사 무료 보험 혜택을 먼저 확인하세요",
  ],
  etc: [
    "모바일 청첩장은 종이 대비 80% 이상 절약돼요",
    "답례품은 온라인 대량 주문으로 개당 단가를 낮출 수 있어요",
    "지인 축가나 사회는 답례 선물로 대체하면 비용 절약이 돼요",
  ],
};
