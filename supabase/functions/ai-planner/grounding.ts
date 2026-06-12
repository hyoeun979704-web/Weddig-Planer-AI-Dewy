// L2 근거주입(RAG) — 가격/시세 질문에 앱의 실제 지역별 평균(budgetData)을
// 근거로 주입해 LLM 의 가격 환각을 차단한다. 숫자는 src/data/budgetData.ts 의
// regionalAverages 를 미러링(만원 단위). 시세는 분기마다 검토 — 드리프트 주의.

interface RegionAvg {
  venue: number; meal: number; sdm: number; suit: number;
  hanbok: number; ring: number; honeymoon: number;
}

// 만원 단위. meal 은 per_guest_meal(인당) — guestCount 곱해 총 식대 산출.
const AVG: Record<string, RegionAvg> = {
  seoul:     { venue: 500, meal: 8.5, sdm: 280, suit: 100, hanbok: 150, ring: 250, honeymoon: 350 },
  gyeonggi:  { venue: 440, meal: 7.5, sdm: 250, suit: 90,  hanbok: 130, ring: 220, honeymoon: 310 },
  incheon:   { venue: 390, meal: 7.0, sdm: 220, suit: 80,  hanbok: 120, ring: 200, honeymoon: 275 },
  busan:     { venue: 400, meal: 7.0, sdm: 230, suit: 80,  hanbok: 120, ring: 200, honeymoon: 285 },
  daegu:     { venue: 370, meal: 6.5, sdm: 210, suit: 75,  hanbok: 110, ring: 190, honeymoon: 265 },
  daejeon:   { venue: 360, meal: 6.5, sdm: 200, suit: 70,  hanbok: 110, ring: 180, honeymoon: 250 },
  gwangju:   { venue: 340, meal: 6.0, sdm: 190, suit: 70,  hanbok: 100, ring: 170, honeymoon: 240 },
  ulsan:     { venue: 390, meal: 7.0, sdm: 220, suit: 80,  hanbok: 120, ring: 200, honeymoon: 275 },
  sejong:    { venue: 370, meal: 6.5, sdm: 210, suit: 75,  hanbok: 110, ring: 190, honeymoon: 265 },
  gangwon:   { venue: 310, meal: 6.0, sdm: 175, suit: 65,  hanbok: 95,  ring: 155, honeymoon: 220 },
  chungbuk:  { venue: 330, meal: 6.0, sdm: 185, suit: 65,  hanbok: 100, ring: 165, honeymoon: 230 },
  chungnam:  { venue: 340, meal: 6.0, sdm: 190, suit: 70,  hanbok: 100, ring: 170, honeymoon: 240 },
  jeonbuk:   { venue: 310, meal: 5.5, sdm: 175, suit: 65,  hanbok: 95,  ring: 155, honeymoon: 220 },
  jeonnam:   { venue: 295, meal: 5.5, sdm: 165, suit: 60,  hanbok: 90,  ring: 150, honeymoon: 210 },
  gyeongbuk: { venue: 330, meal: 6.0, sdm: 185, suit: 65,  hanbok: 100, ring: 165, honeymoon: 230 },
  gyeongnam: { venue: 360, meal: 6.5, sdm: 200, suit: 70,  hanbok: 110, ring: 180, honeymoon: 250 },
  jeju:      { venue: 340, meal: 6.5, sdm: 190, suit: 70,  hanbok: 100, ring: 170, honeymoon: 240 },
};

// 정식 명칭(officialLabel) · 약칭 모두 → 키. user_wedding_settings.wedding_region 은
// "서울특별시" 같은 officialLabel, budget_settings.region 은 키일 수 있어 둘 다 수용.
const REGION_TO_KEY: Record<string, string> = {
  서울특별시: "seoul", 서울: "seoul", seoul: "seoul",
  경기도: "gyeonggi", 경기: "gyeonggi", gyeonggi: "gyeonggi",
  인천광역시: "incheon", 인천: "incheon", incheon: "incheon",
  부산광역시: "busan", 부산: "busan", busan: "busan",
  대구광역시: "daegu", 대구: "daegu", daegu: "daegu",
  대전광역시: "daejeon", 대전: "daejeon", daejeon: "daejeon",
  광주광역시: "gwangju", 광주: "gwangju", gwangju: "gwangju",
  울산광역시: "ulsan", 울산: "ulsan", ulsan: "ulsan",
  세종특별자치시: "sejong", 세종: "sejong", sejong: "sejong",
  강원특별자치도: "gangwon", 강원도: "gangwon", 강원: "gangwon", gangwon: "gangwon",
  충청북도: "chungbuk", 충북: "chungbuk", chungbuk: "chungbuk",
  충청남도: "chungnam", 충남: "chungnam", chungnam: "chungnam",
  전라북도: "jeonbuk", 전북: "jeonbuk", jeonbuk: "jeonbuk",
  전라남도: "jeonnam", 전남: "jeonnam", jeonnam: "jeonnam",
  경상북도: "gyeongbuk", 경북: "gyeongbuk", gyeongbuk: "gyeongbuk",
  경상남도: "gyeongnam", 경남: "gyeongnam", gyeongnam: "gyeongnam",
  제주특별자치도: "jeju", 제주도: "jeju", 제주: "jeju", jeju: "jeju",
};

const LABEL: Record<keyof RegionAvg, string> = {
  venue: "웨딩홀 대관", meal: "식대(인당)", sdm: "스드메", suit: "예복",
  hanbok: "한복", ring: "예물", honeymoon: "허니문",
};

// 가격/시세 의도 감지 — 금액·평균·비용 어휘 + 웨딩 항목.
const PRICE_RE = /(평균|얼마|시세|비용|가격|예산|만원|대관료|식대|단가)/;
const ITEM_RE = /(웨딩홀|예식장|홀|식대|스드메|스튜디오|드레스|메이크업|예복|한복|예물|예단|허니문|신혼여행)/;

export function isPriceQuery(text: string): boolean {
  return PRICE_RE.test(text) && (ITEM_RE.test(text) || /평균.*결혼|결혼.*평균|총.*비용/.test(text));
}

/**
 * 가격 질문이면 사용자 지역 평균을 "근거 데이터" 블록으로 반환(없으면 "").
 * 프롬프트의 신뢰성 계약(L3)과 결합 — LLM 은 이 숫자만 인용해야 한다.
 */
export function buildPriceGrounding(
  text: string,
  region: string | null | undefined,
  guestCount: number | null | undefined,
): string {
  if (!isPriceQuery(text)) return "";
  const key = region ? REGION_TO_KEY[region.trim()] : undefined;
  const avg = key ? AVG[key] : undefined;
  if (!avg) {
    // 지역 미상 — 숫자 없이 "지어내지 말고 범위·견적 안내" 지침만.
    return "\n\n## 근거 데이터 (가격)\n사용자 지역 정보가 없어 구체 평균을 제공할 수 없습니다. 임의의 금액을 단정하지 말고, '지역·업체별로 달라서 견적을 받아보시는 게 정확하다'고 안내하세요.";
  }
  const guests = guestCount && guestCount > 0 ? guestCount : null;
  const lines = (Object.keys(LABEL) as (keyof RegionAvg)[]).map((k) => {
    if (k === "meal") {
      const total = guests ? ` (예상 하객 ${guests}명 기준 총 약 ${Math.round(avg.meal * guests)}만원)` : "";
      return `- ${LABEL[k]}: 약 ${avg.meal}만원/인${total}`;
    }
    return `- ${LABEL[k]}: 약 ${avg[k]}만원`;
  });
  return [
    "\n\n## 근거 데이터 (가격 — 이 숫자만 사용)",
    `다음은 사용자 예식 지역의 항목별 평균(앱 집계, 만원). 가격을 답할 때 이 표의 숫자를 근거로 인용하고, 표에 없는 임의의 금액·업체별 단가를 지어내지 마세요. 평균임을 명시하고 "업체·시즌별 상이" 단서를 답니다.`,
    ...lines,
  ].join("\n");
}
