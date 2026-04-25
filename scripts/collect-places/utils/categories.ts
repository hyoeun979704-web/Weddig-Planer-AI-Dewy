// 웨딩플래너는 자체 AI가 담당하므로 외부 업체 수집 대상에서 제외.
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

// 전국 커버리지: 광역시·특별시 8개 + 광역도 주요 시 + 제주
export const REGIONS = [
  // 광역시·특별시
  "서울",
  "부산",
  "인천",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  // 경기
  "수원",
  "성남",
  "용인",
  "고양",
  "안양",
  "안산",
  // 강원
  "춘천",
  "원주",
  "강릉",
  // 충북
  "청주",
  // 충남
  "천안",
  "아산",
  // 전북
  "전주",
  // 전남
  "여수",
  "순천",
  // 경북
  "포항",
  "경주",
  // 경남
  "창원",
  "김해",
  // 제주
  "제주",
];

const KEYWORD_TEMPLATES: Record<CategoryLabel, string[]> = {
  웨딩홀: ["{region} 웨딩홀", "{region} 결혼식장", "{region} 호텔웨딩", "{region} 하우스웨딩"],
  스튜디오: [
    "{region} 웨딩스튜디오",
    "{region} 본식스냅",
    "{region} 웨딩촬영",
    "{region} 야외 웨딩촬영",
  ],
  드레스샵: [
    "{region} 웨딩드레스",
    "{region} 드레스샵",
    "{region} 드레스 대여",
    "{region} 신부 드레스",
  ],
  메이크업샵: [
    "{region} 웨딩 메이크업",
    "{region} 본식 메이크업",
    "{region} 신부 메이크업",
    "{region} 신부 헤어메이크업",
  ],
  한복: [
    "{region} 혼주 한복",
    "{region} 신부 한복 맞춤",
    "{region} 결혼식 한복 대여",
    "{region} 폐백 한복",
  ],
  예복: ["{region} 신랑 예복", "{region} 턱시도", "{region} 맞춤 정장", "{region} 예복 대여"],
  허니문: ["허니문 패키지", "신혼여행 추천", "유럽 허니문", "동남아 허니문"],
  혼수: ["{region} 혼수 가전", "신혼 가전 세트", "{region} 혼수 가구", "혼수 침대"],
  청첩장: [
    "{region} 청첩장 모임 식당",
    "{region} 청첩장 모임 장소",
    "{region} 청첩장 모임 추천",
    "{region} 친구 모임 코스 요리",
  ],
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
