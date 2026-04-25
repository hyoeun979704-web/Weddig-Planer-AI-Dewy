export const CATEGORIES = {
  웨딩홀: "wedding_hall",
  스드메: "studio",
  한복: "hanbok",
  예복: "suit",
  허니문: "honeymoon",
  혼수: "appliance",
  청첩장: "invitation",
  웨딩플래너: "planner",
} as const;

export type CategoryLabel = keyof typeof CATEGORIES;
export type CategorySlug = (typeof CATEGORIES)[CategoryLabel];

export const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "수원",
  "성남",
  "용인",
  "고양",
];

const KEYWORD_TEMPLATES: Record<CategoryLabel, string[]> = {
  웨딩홀: ["{region} 웨딩홀", "{region} 결혼식장", "{region} 호텔웨딩", "{region} 하우스웨딩"],
  스드메: ["{region} 웨딩스튜디오", "{region} 스드메 패키지", "{region} 본식스냅", "{region} 웨딩촬영"],
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
  웨딩플래너: ["{region} 웨딩플래너", "{region} 결혼 컨설팅", "결혼 준비 플래너"],
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
