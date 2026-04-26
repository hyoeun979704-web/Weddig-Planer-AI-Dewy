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
  허니문: ["허니문 패키지", "신혼여행 추천", "유럽 허니문", "동남아 허니문"],
  혼수: ["{region} 혼수 가전", "신혼 가전 세트", "{region} 혼수 가구", "혼수 침대"],
  청첩장: ["{region} 청첩장 모임", "{region} 상견례 장소", "{region} 양가 상견례 식당"],
};

export function seedQueries(label: CategoryLabel, region?: string): string[] {
  const tpls = KEYWORD_TEMPLATES[label];
  const regions = region ? [region] : REGIONS;
  const out: string[] = [];
  for (const r of regions) {
    for (const t of tpls) {
      out.push(t.replace("{region}", r).trim());
    }
  }
  return Array.from(new Set(out));
}
