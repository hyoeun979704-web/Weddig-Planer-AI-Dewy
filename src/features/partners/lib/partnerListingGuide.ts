// 가이드형 상세정보 위저드(S1.5) 단일 소스 — 업종(place category)별 소개글 골격·좋은예/나쁜예·
// 추천 키워드 칩·진입 카피. 설계: docs/260629_partner_app_master_plan.md §8.
//
// W3(유지비) 대응: 예시·칩을 코드 분기로 흩지 않고 여기 한 곳에서만 정의한다. 위저드·전체편집
// 양쪽이 import 해 같은 가이드를 보여준다(드리프트 차단).
// 카피 톤(§8.3): 토스·당근식 담백체. 설명하지 말고 예시가 말하게. 한 줄에 하나.

export interface FieldGuide {
  /** 왜 — 이 항목이 노출/전환에 주는 효과(담백 1줄). */
  why: string;
  /** 좋은 예 — 신부 눈높이의 구체 정보. */
  good: string;
  /** 나쁜 예 — 추상·자화자찬(피해야 할 형태). */
  bad: string;
  /** 입력란 placeholder(골격). 빈칸 공포 제거용. */
  placeholder: string;
}

export interface CategoryListingGuide {
  /** 위저드 진입/소개 1줄. */
  intro: string;
  /** 상세 소개글 작성 가이드. */
  description: FieldGuide;
  /** 추천 키워드 칩(검색·필터 보조). 통제어휘 아님 — 제안일 뿐. */
  keywordChips: string[];
}

// 신호 없을 때 우아한 기본(빈 신호 폴백) — 업종 미상/etc 등.
export const DEFAULT_LISTING_GUIDE: CategoryListingGuide = {
  intro: "신부가 궁금해하는 것부터 적으면 추천·검색에서 위에 떠요.",
  description: {
    why: "자세할수록 위에 떠요.",
    good: "어떤 신부에게 맞는지 · 무엇을 받는지 · 가격대를 한눈에",
    bad: "최고의 서비스, 후회 없는 선택",
    placeholder: "어떤 신부에게 맞나요? / 무엇을 제공하나요? / 가격대는?",
  },
  keywordChips: ["가성비", "프리미엄", "소규모", "당일예약"],
};

// 업종별 가이드. 키 = place category(BusinessListingDetailForm DETAIL_SCHEMA 와 동일).
export const LISTING_GUIDE: Record<string, CategoryListingGuide> = {
  wedding_hall: {
    intro: "홀 분위기·수용 인원·식대를 적으면 견적 문의가 늘어요.",
    description: {
      why: "하객 수·홀 타입·식대를 적으면 신부가 바로 비교해요.",
      good: "실내 가든홀, 하객 200명, 주차 100대, 식대 5.9만~",
      bad: "강남 최고의 프리미엄 웨딩홀, 평생 한 번의 선택",
      placeholder: "홀 타입(채플·가든·호텔) / 수용 인원 / 식대 / 주차 / 보증 인원",
    },
    keywordChips: ["채플홀", "가든홀", "호텔", "스몰웨딩", "주차편리", "역세권"],
  },
  studio: {
    intro: "촬영 컨셉과 받는 결과물을 적으면 취향 맞는 신부가 찾아와요.",
    description: {
      why: "촬영 스타일·원본 제공·드레스 여부가 결정 포인트예요.",
      good: "내추럴·필름 촬영, 원본 전체 제공, 드레스 2벌 포함",
      bad: "감성 가득한 인생샷, 최고의 퀄리티 보장",
      placeholder: "촬영 스타일 / 원본 제공 / 드레스 포함 / 촬영 시간 / 보정 컷 수",
    },
    keywordChips: ["내추럴", "필름", "야외촬영", "원본제공", "드레스포함", "헤어메이크업"],
  },
  dress_shop: {
    intro: "드레스 스타일과 피팅 조건을 적으면 취향 맞는 신부가 예약해요.",
    description: {
      why: "실루엣·대여/구매·피팅 횟수가 신부의 선택 기준이에요.",
      good: "머메이드·A라인 보유, 대여 전용, 피팅 3회, 수선 포함",
      bad: "당신을 위한 단 하나의 드레스, 최고급 수입원단",
      placeholder: "드레스 스타일(실루엣) / 대여·구매 / 피팅 횟수 / 수선 포함 여부",
    },
    keywordChips: ["머메이드", "A라인", "프린세스", "심플", "대여전용", "수입드레스"],
  },
  makeup_shop: {
    intro: "메이크업 스타일·리허설·출장 여부를 적으면 문의가 늘어요.",
    description: {
      why: "스타일·리허설 포함·출장 지역이 결정 포인트예요.",
      good: "내추럴·글램, 리허설 포함, 헤어 동시, 서울·경기 출장",
      bad: "신부님을 가장 빛나게, 최고의 메이크업 아티스트",
      placeholder: "메이크업 스타일 / 리허설 포함 / 헤어 동시 / 출장 지역 / 소요시간",
    },
    keywordChips: ["내추럴", "글램", "청순", "리허설포함", "출장가능", "혼주메이크업"],
  },
  hanbok: {
    intro: "한복 유형·맞춤/대여·배송을 적으면 비교가 쉬워져요.",
    description: {
      why: "신부/혼주·맞춤/대여·대여 기간이 선택 기준이에요.",
      good: "신부·혼주 한복, 맞춤 제작, 대여 3일, 전국 배송",
      bad: "전통의 멋, 가장 아름다운 우리 한복",
      placeholder: "한복 유형 / 맞춤·대여 / 대여 기간 / 배송 / 사이즈 옵션",
    },
    keywordChips: ["신부한복", "혼주한복", "맞춤제작", "대여", "전통", "생활한복"],
  },
  tailor_shop: {
    intro: "예복 유형·원단·제작 기간을 적으면 신랑이 바로 비교해요.",
    description: {
      why: "대여/맞춤·원단·제작 기간이 결정 포인트예요.",
      good: "턱시도·정장, 맞춤 제작, 수입원단, 제작 14일, 수선 포함",
      bad: "남자의 품격, 최고급 맞춤 예복의 자존심",
      placeholder: "예복 유형 / 대여·맞춤 / 원단 / 제작 소요일 / 피팅 횟수",
    },
    keywordChips: ["턱시도", "맞춤정장", "대여", "수입원단", "빅사이즈", "수선포함"],
  },
  honeymoon: {
    intro: "여행 지역·일정·평균 경비를 적으면 상담 문의가 늘어요.",
    description: {
      why: "지역·박일·포함 내역·평균 경비가 비교 기준이에요.",
      good: "몰디브 5박7일, 리조트·항공 포함, 2인 700만원대",
      bad: "꿈같은 신혼여행, 평생 잊지 못할 추억",
      placeholder: "여행 지역 / 박·일 / 포함 내역(항공·숙소) / 평균 경비",
    },
    keywordChips: ["리조트", "유럽", "동남아", "괌사이판", "허니문패키지", "자유여행"],
  },
  appliance: {
    intro: "취급 품목·브랜드·세트 혜택을 적으면 견적 문의가 늘어요.",
    description: {
      why: "품목·브랜드·세트가·배송설치가 결정 포인트예요.",
      good: "삼성·LG 가전 풀세트, 무료 배송·설치, 혼수 패키지 할인",
      bad: "최저가 보장, 신혼 가전의 모든 것",
      placeholder: "취급 품목 / 브랜드 / 세트 가격 / 무료 배송·설치 여부",
    },
    keywordChips: ["삼성", "LG", "비스포크", "풀세트", "무료설치", "혼수패키지"],
  },
  jewelry: {
    intro: "취급 품목·메탈·세트 구성을 적으면 비교가 쉬워져요.",
    description: {
      why: "메탈·상품 유형·커플세트·각인 여부가 선택 기준이에요.",
      good: "예물세트·결혼반지, 플래티넘·골드, 커플세트, 무료 각인",
      bad: "영원한 사랑의 약속, 명품 주얼리",
      placeholder: "취급 품목 / 메탈 / 커플세트 / 각인 / 가격대",
    },
    keywordChips: ["결혼반지", "예물세트", "플래티넘", "다이아", "커플링", "각인무료"],
  },
  invitation_venue: {
    intro: "장소 분위기·수용 인원·룸 구성을 적으면 예약 문의가 늘어요.",
    description: {
      why: "장소 유형·인원·룸 수가 모임 예약의 기준이에요.",
      good: "한정식 룸, 최대 20명, 프라이빗룸 3개, 주차 가능",
      bad: "품격 있는 자리, 소중한 분들을 위한 공간",
      placeholder: "장소 유형 / 최소·최대 인원 / 룸 개수 / 주차 / 메뉴 가격대",
    },
    keywordChips: ["한정식", "레스토랑", "프라이빗룸", "상견례", "소규모", "주차가능"],
  },
};

// business_profiles.service_category ↔ place category 차이 보정(검증 규칙: label vs value).
// 대부분 동일하나 suit(기업 업종) = tailor_shop(place). 그 외는 그대로.
const CATEGORY_ALIAS: Record<string, string> = { suit: "tailor_shop" };

/** 업종 가이드 조회 — business/place 카테고리 모두 허용, 없으면 우아한 기본(빈 신호 폴백). */
export function getListingGuide(category: string | null | undefined): CategoryListingGuide {
  if (!category) return DEFAULT_LISTING_GUIDE;
  const key = CATEGORY_ALIAS[category] ?? category;
  return LISTING_GUIDE[key] ?? DEFAULT_LISTING_GUIDE;
}
