export interface RegionData {
  label: string;
  /** Long-form label that matches WeddingInfoSetupModal's REGIONS list.
   *  Stored canonically in user_wedding_settings.wedding_region so both
   *  the Budget and Schedule pages can read/write the same value. */
  officialLabel: string;
  sub_regions: string[];
}

export interface RegionalAverage {
  total: number;
  venue: number;
  sdm: number;
  suit: number;
  hanbok: number;
  ring: number;
  meetup: number;
  house: number;
  honeymoon: number;
  etc: number;
  per_guest_meal: number;
  note: string;
}

export const regions: Record<string, RegionData> = {
  seoul: { label: "서울", officialLabel: "서울특별시", sub_regions: ["강남/서초", "강동/송파", "강서/영등포", "마포/용산", "종로/중구", "기타"] },
  gyeonggi: { label: "경기", officialLabel: "경기도", sub_regions: ["수원/화성", "성남/분당", "고양/파주", "용인", "안양/군포", "기타"] },
  incheon: { label: "인천", officialLabel: "인천광역시", sub_regions: ["남동/연수", "부평/계양", "서구/중구", "기타"] },
  busan: { label: "부산", officialLabel: "부산광역시", sub_regions: ["해운대/수영", "부산진/동래", "서면/남포동", "기타"] },
  daegu: { label: "대구", officialLabel: "대구광역시", sub_regions: ["수성구", "달서구", "중구/동구", "기타"] },
  daejeon: { label: "대전", officialLabel: "대전광역시", sub_regions: ["유성구", "서구", "중구/동구", "기타"] },
  gwangju: { label: "광주", officialLabel: "광주광역시", sub_regions: ["서구/남구", "북구/광산구", "기타"] },
  ulsan: { label: "울산", officialLabel: "울산광역시", sub_regions: ["남구", "중구", "기타"] },
  sejong: { label: "세종", officialLabel: "세종특별자치시", sub_regions: ["세종시"] },
  gangwon: { label: "강원", officialLabel: "강원특별자치도", sub_regions: ["춘천", "원주", "강릉", "기타"] },
  chungbuk: { label: "충북", officialLabel: "충청북도", sub_regions: ["청주", "충주", "기타"] },
  chungnam: { label: "충남", officialLabel: "충청남도", sub_regions: ["천안/아산", "서산/당진", "기타"] },
  jeonbuk: { label: "전북", officialLabel: "전북특별자치도", sub_regions: ["전주", "익산/군산", "기타"] },
  jeonnam: { label: "전남", officialLabel: "전라남도", sub_regions: ["여수/순천", "목포/무안", "기타"] },
  gyeongbuk: { label: "경북", officialLabel: "경상북도", sub_regions: ["포항", "구미/김천", "경주", "기타"] },
  gyeongnam: { label: "경남", officialLabel: "경상남도", sub_regions: ["창원/마산", "김해/양산", "진주", "기타"] },
  jeju: { label: "제주", officialLabel: "제주특별자치도", sub_regions: ["제주시", "서귀포시"] },
};

/**
 * Resolves any of {budget key, short label, official long label} to the
 * canonical budget region key. Used by consumers that read
 * user_wedding_settings.wedding_region — historically it's been stored as
 * either short ("서울") or long ("서울특별시") form depending on which page
 * wrote it. This makes the lookup tolerant in both directions.
 */
export const resolveRegionKey = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  if (regions[value]) return value;
  for (const [key, r] of Object.entries(regions)) {
    if (r.label === value || r.officialLabel === value) return key;
  }
  return undefined;
};

/**
 * Regional averages (KRW × 10,000). Calibrated so suit/hanbok/meetup are
 * surfaced as their own line items rather than being lumped into ring/sdm/etc.
 * Numbers reflect Seoul → other-region scaling on a percentage split:
 *   venue 15.6% · sdm 8.8% · suit 3.1% · hanbok 4.7% · ring 7.8% ·
 *   meetup 2.5% · house 25% · honeymoon 10.9% · etc 22.5%.
 * `total` is the sum of these (excludes meal — meal scales with guest count
 * and is added by getRegionalAvgWithMeal).
 */
export const regionalAverages: Record<string, RegionalAverage> = {
  seoul:     { total: 3230, venue: 500, sdm: 280, suit: 100, hanbok: 150, ring: 250, meetup: 80, house: 800, honeymoon: 350, etc: 720, per_guest_meal: 8.5, note: "서울은 전국 평균 대비 약 20~30% 높음" },
  gyeonggi:  { total: 2840, venue: 440, sdm: 250, suit: 90,  hanbok: 130, ring: 220, meetup: 70, house: 700, honeymoon: 310, etc: 630, per_guest_meal: 7.5, note: "분당/판교 등 일부 지역은 서울급" },
  incheon:   { total: 2540, venue: 390, sdm: 220, suit: 80,  hanbok: 120, ring: 200, meetup: 65, house: 625, honeymoon: 275, etc: 565, per_guest_meal: 7.0, note: "" },
  busan:     { total: 2615, venue: 400, sdm: 230, suit: 80,  hanbok: 120, ring: 200, meetup: 65, house: 650, honeymoon: 285, etc: 585, per_guest_meal: 7.0, note: "해운대/수영구는 서울급 비용" },
  daegu:     { total: 2420, venue: 370, sdm: 210, suit: 75,  hanbok: 110, ring: 190, meetup: 60, house: 600, honeymoon: 265, etc: 540, per_guest_meal: 6.5, note: "" },
  daejeon:   { total: 2325, venue: 360, sdm: 200, suit: 70,  hanbok: 110, ring: 180, meetup: 60, house: 575, honeymoon: 250, etc: 520, per_guest_meal: 6.5, note: "" },
  gwangju:   { total: 2210, venue: 340, sdm: 190, suit: 70,  hanbok: 100, ring: 170, meetup: 55, house: 550, honeymoon: 240, etc: 495, per_guest_meal: 6.0, note: "" },
  ulsan:     { total: 2540, venue: 390, sdm: 220, suit: 80,  hanbok: 120, ring: 200, meetup: 65, house: 625, honeymoon: 275, etc: 565, per_guest_meal: 7.0, note: "" },
  sejong:    { total: 2420, venue: 370, sdm: 210, suit: 75,  hanbok: 110, ring: 190, meetup: 60, house: 600, honeymoon: 265, etc: 540, per_guest_meal: 6.5, note: "신도시 특성상 상승 추세" },
  gangwon:   { total: 2020, venue: 310, sdm: 175, suit: 65,  hanbok: 95,  ring: 155, meetup: 50, house: 500, honeymoon: 220, etc: 450, per_guest_meal: 6.0, note: "" },
  chungbuk:  { total: 2125, venue: 330, sdm: 185, suit: 65,  hanbok: 100, ring: 165, meetup: 50, house: 525, honeymoon: 230, etc: 475, per_guest_meal: 6.0, note: "" },
  chungnam:  { total: 2210, venue: 340, sdm: 190, suit: 70,  hanbok: 100, ring: 170, meetup: 55, house: 550, honeymoon: 240, etc: 495, per_guest_meal: 6.0, note: "천안/아산은 수도권 영향" },
  jeonbuk:   { total: 2020, venue: 310, sdm: 175, suit: 65,  hanbok: 95,  ring: 155, meetup: 50, house: 500, honeymoon: 220, etc: 450, per_guest_meal: 5.5, note: "" },
  jeonnam:   { total: 1925, venue: 295, sdm: 165, suit: 60,  hanbok: 90,  ring: 150, meetup: 50, house: 475, honeymoon: 210, etc: 430, per_guest_meal: 5.5, note: "" },
  gyeongbuk: { total: 2125, venue: 330, sdm: 185, suit: 65,  hanbok: 100, ring: 165, meetup: 50, house: 525, honeymoon: 230, etc: 475, per_guest_meal: 6.0, note: "" },
  gyeongnam: { total: 2325, venue: 360, sdm: 200, suit: 70,  hanbok: 110, ring: 180, meetup: 60, house: 575, honeymoon: 250, etc: 520, per_guest_meal: 6.5, note: "" },
  jeju:      { total: 2210, venue: 340, sdm: 190, suit: 70,  hanbok: 100, ring: 170, meetup: 55, house: 550, honeymoon: 240, etc: 495, per_guest_meal: 6.5, note: "스몰웨딩/야외 비율 높음" },
};

/**
 * Returns regional averages with per-guest meal cost computed as a separate `meal` field.
 * The hall venue averages cover dry hall/setup costs only; the meal value scales
 * with guest count and is exposed alongside venue so it can be assigned to its own
 * "meal" budget category. `total` includes meal so the headline figure is realistic.
 */
export const getRegionalAvgWithMeal = (regionKey: string, guestCount: number) => {
  const avg = regionalAverages[regionKey];
  if (!avg) return null;
  const meal = Math.round(avg.per_guest_meal * guestCount);
  return {
    ...avg,
    meal,
    total: avg.total + meal,
  };
};

export type BudgetCategory =
  | "venue"
  | "meal"
  | "sdm"
  | "suit"
  | "hanbok"
  | "ring"
  | "meetup"
  | "house"
  | "honeymoon"
  | "etc";

/** Render order on the main page. Big-spend (venue/meal/house) up top,
 *  attire (sdm/suit/hanbok) grouped, then 예물/상견례, then trailing items. */
export const categoryKeys: BudgetCategory[] = [
  "venue", "meal", "sdm", "suit", "hanbok", "ring", "meetup", "house", "honeymoon", "etc",
];

/**
 * Shop-style schedule categories that map cleanly to a single budget
 * category. After splitting hanbok and suit into their own budget rows,
 * both tailor_shop and hanbok are now FULL-mapped.
 */
export const FULL_MAPPED_SCHEDULE_CATEGORIES = [
  "wedding_hall", "studio", "dress_shop", "makeup_shop",
  "tailor_shop", "hanbok", "appliance", "honeymoon",
] as const;

/**
 * Schedule categories that only cover part of their budget row. Excluding
 * these surfaces a small "X 제외" label instead of dimming the whole row,
 * since the user may still log other sub-items there (e.g. 모바일 청첩장
 * 디자인비는 따로 발생할 수 있음).
 */
export const PARTIAL_MAPPED_SCHEDULE_CATEGORIES = ["invitation_venue"] as const;

/**
 * Maps the shop-style category values used in `user_schedule_items.category`
 * (wedding_hall, studio, dress_shop, etc.) to the budget category they
 * correspond to. Used to surface schedule tasks as budget records and
 * pre-fill the category when the user records an expense from a task.
 *
 * Returns null for non-expense categories like "general" or unrecognized
 * values so callers can skip them.
 */
export const scheduleCategoryToBudget = (scheduleCategory: string | null | undefined): BudgetCategory | null => {
  if (!scheduleCategory) return null;
  switch (scheduleCategory) {
    case "wedding_hall": return "venue";
    case "studio":
    case "dress_shop":
    case "makeup_shop":
      return "sdm";
    case "tailor_shop":
      return "suit";
    case "hanbok":
      return "hanbok";
    case "appliance":
      return "house";
    case "honeymoon":
      return "honeymoon";
    case "invitation_venue":
      return "etc";
    default:
      return null;
  }
};

export interface CategoryInfo {
  label: string;
  emoji: string;
  color: string;
  sub_items: string[];
}

export const categories: Record<BudgetCategory, CategoryInfo> = {
  venue: { label: "웨딩홀", emoji: "", color: "#F4A7B9", sub_items: ["웨딩홀 대관료", "세팅비", "주차비", "폐백실", "포토존", "추가 시간", "기타"] },
  meal: { label: "식대", emoji: "", color: "#F97316", sub_items: ["성인 식대(뷔페/코스)", "어린이 식대", "주류/음료", "추가 인원 식대", "케이크/디저트", "기타"] },
  sdm: { label: "스드메", emoji: "", color: "#A78BFA", sub_items: ["스튜디오 촬영", "드레스 대여", "메이크업", "본식스냅", "영상 촬영", "원본 데이터", "앨범 추가", "헬퍼", "부케", "기타"] },
  suit: { label: "예복", emoji: "", color: "#1E40AF", sub_items: ["신랑 예복(턱시도/정장)", "구두·셔츠·타이", "신부측 부모 예복", "신랑측 부모 예복", "맞춤·가봉비", "기타"] },
  hanbok: { label: "한복", emoji: "", color: "#BE185D", sub_items: ["신부 한복", "신랑 한복", "신부측 부모 한복", "신랑측 부모 한복", "한복 대여 vs 구매", "보관/세탁", "기타"] },
  ring: { label: "예물/예단", emoji: "", color: "#F59E0B", sub_items: ["결혼반지", "예물(시계/주얼리)", "예단(이불/혼수품)", "함/폐백음식", "기타"] },
  meetup: { label: "상견례", emoji: "", color: "#B45309", sub_items: ["상견례 식사", "양가 선물", "교통·숙박(원거리)", "기타"] },
  house: { label: "혼수", emoji: "", color: "#10B981", sub_items: ["가전(TV/냉장고/세탁기 등)", "가구(침대/소파/식탁 등)", "생활용품", "인테리어/리모델링", "이사비", "기타"] },
  honeymoon: { label: "허니문", emoji: "", color: "#3B82F6", sub_items: ["항공권", "숙소", "여행자보험", "현지경비", "기타"] },
  etc: { label: "기타", emoji: "", color: "#6B7280", sub_items: ["청첩장(종이/모바일)", "축의금 답례품", "결혼식 소품/데코", "사회자/축가", "감사선물", "기타"] },
};

export const paidByOptions = [
  { value: "shared", label: "부부 공동", emoji: "" },
  { value: "groom", label: "신랑측", emoji: "" },
  { value: "bride", label: "신부측", emoji: "" },
] as const;

/**
 * Stage of payment within a single vendor contract. Korean wedding vendors
 * typically run on a 예약금 → 계약금 → 정계약(중도금) → 잔금 timeline; "완납" is
 * for one-shot purchases (가전·예물 등) where there's no installment.
 *
 * - deposit (예약금): refundable booking deposit
 * - contract (계약금): signed-contract deposit, partial-refund window
 * - midpayment (정계약): formal contract / mid-payment installment
 * - balance (잔금): remaining payment, usually due on event day
 * - full (완납): paid in full, no installments
 */
export const paymentStageOptions = [
  { value: "deposit", label: "예약금", emoji: "" },
  { value: "contract", label: "계약금", emoji: "" },
  { value: "midpayment", label: "정계약", emoji: "" },
  { value: "balance", label: "잔금", emoji: "" },
  { value: "full", label: "완납", emoji: "" },
] as const;

export const paymentMethodOptions = [
  { value: "cash", label: "현금", emoji: "" },
  { value: "card", label: "카드", emoji: "" },
  { value: "transfer", label: "계좌이체", emoji: "" },
  { value: "check", label: "수표", emoji: "" },
] as const;

export const savingTips: Record<BudgetCategory, string[]> = {
  venue: [
    "주중이나 오전 예식은 10~30% 할인되는 곳이 많아요",
    "얼리버드 예약(6개월 이상 전)으로 할인 받을 수 있어요",
    "세팅비, 주차비, 폐백실 사용료는 계약 전 꼭 확인하세요",
    "포토존/추가시간 비용이 별도인지 미리 체크하세요",
  ],
  meal: [
    "보증인원을 실제 참석 예상보다 약간 적게 잡으면 불필요한 식대를 줄일 수 있어요",
    "어린이 식대(8세 미만)는 50% 할인되는 곳이 많아요",
    "코너 메뉴/주류는 패키지 외 추가비가 큰 항목이니 미리 확인하세요",
    "성인/어린이 인원 비율을 청첩장 회신 단계에서 정확히 집계하세요",
  ],
  sdm: [
    "평일 촬영은 주말 대비 10~20% 저렴한 경우가 많아요",
    "원본 데이터 포함 여부를 꼭 확인하세요 (추가비 30~50만원)",
    "스드메 패키지는 개별 계약보다 평균 15% 절약돼요",
    "헬퍼비, 얼리스타트비 등 숨겨진 추가금을 미리 확인하세요",
  ],
  suit: [
    "예복은 대여 + 셔츠/타이 구매 조합이 풀구매 대비 40~60% 저렴해요",
    "본식·신혼여행에 다시 입을 정장이라면 구매도 합리적이에요",
    "양가 부모님 예복은 함께 맞추면 패키지 할인 받기 좋아요",
    "가봉비·이염비가 별도인지 견적 단계에서 확인하세요",
  ],
  hanbok: [
    "대여는 신부 한복 기준 15~30만원, 구매는 80~200만원으로 격차 큼",
    "양가 부모 한복은 평소 입을 일이 적다면 대여가 합리적이에요",
    "본식만 입을지·폐백까지 입을지에 따라 대여 시간 옵션이 달라져요",
    "한복 보관·세탁비도 견적에 포함되는지 확인하세요",
  ],
  ring: [
    "예물은 시즌 세일(연말, 발렌타인) 때 구매하면 10~15% 절약",
    "브랜드 정가보다 백화점 카드 할인 + 상품권 활용이 효과적이에요",
    "예단 범위는 양가가 미리 협의하면 불필요한 지출을 줄일 수 있어요",
  ],
  meetup: [
    "상견례는 위치 절충(중간 지점)으로 양가 교통비 부담 최소화하세요",
    "코스 1인 5~8만원대 한정식이 일반적이에요",
    "양가 선물은 양 측 협의로 비슷한 가격대 맞추면 부담 적어요",
    "원거리(KTX/항공) 시 숙박비도 미리 잡아두세요",
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
