// Category slugs mirror src/lib/placeMappers.ts (DB canonical).
// Keep this in sync if the slug list ever changes.
// 웨딩플래너는 이 앱의 핵심 제품(AI 플래너)이므로 외부 수집 카테고리에서 제외.
export const CATEGORIES = {
  웨딩홀: "wedding_hall",
  스튜디오: "studio",
  드레스샵: "dress_shop",
  메이크업샵: "makeup_shop",
  한복: "hanbok",
  예복: "tailor_shop",
  허니문: "honeymoon",
  혼수: "appliance",
  예물: "jewelry",
  청첩장: "invitation_venue",
} as const;

export type CategoryLabel = keyof typeof CATEGORIES;
export type CategorySlug = (typeof CATEGORIES)[CategoryLabel];

// All 17 시·도 + secondary cities. Naver Local seeds use these tokens
// directly ("{region} 웨딩홀") so the keywords need to match real Naver
// search vernacular (people search "충북 웨딩홀" not "충청북도 웨딩홀").
export const REGIONS = [
  // 광역시·도 (17개)
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
  // 인기 광역 도시
  "수원",
  "성남",
  "용인",
  "고양",
  "청주",
  "천안",
  "전주",
  "포항",
  "창원",
  "춘천",
];

const KEYWORD_TEMPLATES: Record<CategoryLabel, string[]> = {
  웨딩홀: ["{region} 웨딩홀", "{region} 결혼식장", "{region} 호텔웨딩", "{region} 하우스웨딩"],
  스튜디오: ["{region} 웨딩스튜디오", "{region} 본식스냅", "{region} 웨딩촬영", "{region} 스냅촬영"],
  드레스샵: ["{region} 웨딩드레스샵", "{region} 드레스 대여", "{region} 드레스 가봉"],
  메이크업샵: ["{region} 웨딩메이크업", "{region} 신부 메이크업", "{region} 헤어메이크업"],
  한복: [
    "{region} 혼주 한복",
    "{region} 신부 한복 맞춤",
    "{region} 결혼식 한복 대여",
    "{region} 폐백 한복",
  ],
  예복: ["{region} 신랑 예복", "{region} 턱시도", "{region} 맞춤 정장", "{region} 예복 대여"],
  // 허니문은 "여행사"가 아니라 "여행 상품" 단위. region 토큰은 destination 도시명.
  // {region}이 없는 항목은 일반/카테고리 검색 (자유여행/항공권/이용권/패스 등).
  허니문: [
    "{region} 허니문 패키지",
    "{region} 신혼여행",
    "{region} 자유여행 패키지",
    "{region} 5박7일 패키지",
    "{region} 풀빌라 패키지",
    "{region} 항공권",
    "{region} 자유여행",
    "{region} 호텔 패키지",
    "허니문 패키지 추천",
    "신혼여행 패키지 비교",
    "JR 패스",
    "유레일 패스",
    "Klook 이용권",
    "디즈니랜드 자유이용권",
  ],
  혼수: ["{region} 혼수 가전", "신혼 가전 세트", "{region} 혼수 가구", "혼수 침대"],
  예물: [
    "{region} 결혼반지",
    "{region} 예물 주얼리",
    "{region} 다이아몬드 반지",
    "{region} 예단 패물",
    "{region} 커플링 매장",
  ],
  청첩장: ["{region} 청첩장 모임", "{region} 상견례 장소", "{region} 양가 상견례 식당"],
};

// 허니문은 국내 시·도가 아니라 해외 인기 신혼여행지 도시·국가가 region.
// 한국에서 가장 검색 많은 허니문 destination 위주.
export const HONEYMOON_REGIONS = [
  // 동남아 휴양
  "발리",
  "푸켓",
  "다낭",
  "코타키나발루",
  "보라카이",
  "세부",
  "몰디브",
  "사이판",
  // 일본
  "일본",
  "도쿄",
  "오사카",
  "교토",
  "후쿠오카",
  "오키나와",
  "삿포로",
  // 유럽
  "유럽",
  "파리",
  "스위스",
  "이탈리아",
  "산토리니",
  "런던",
  // 미주·대양주
  "괌",
  "하와이",
  "라스베가스",
  "뉴욕",
  "호주",
  "뉴질랜드",
  // 중화권
  "타이페이",
  "홍콩",
];

export function seedQueries(label: CategoryLabel, region?: string): string[] {
  const tpls = KEYWORD_TEMPLATES[label];
  const baseRegions = label === "허니문" ? HONEYMOON_REGIONS : REGIONS;
  const regions = region ? [region] : baseRegions;
  const out: string[] = [];
  for (const r of regions) {
    for (const t of tpls) {
      out.push(t.replace("{region}", r).trim());
    }
  }
  return Array.from(new Set(out));
}
