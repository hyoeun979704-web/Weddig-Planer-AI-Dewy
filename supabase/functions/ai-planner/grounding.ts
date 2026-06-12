// L2 근거주입(RAG) — 가격/시세 질문에 앱의 실제 지역별 평균(budgetData)을,
// 업체 추천 질문에 places 실데이터를 근거로 주입해 LLM 의 환각을 차단한다.
// 가격 숫자는 src/data/budgetData.ts 의 regionalAverages 를 미러링(만원 단위).
// 시세는 분기마다 검토 — 드리프트 주의.

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

// ─────────────────────────────────────────────────────────────
// L2 업체 근거주입 — 추천 의도 질문에 places 실데이터 N건을 주입해
// 존재하지 않는 업체명 생성을 차단한다. 명시적 추천 질문은 클라이언트
// intentRouter(free_search 등)가 LLM 없이 즉답하므로, 여기는 라우터를
// 새서 LLM 으로 온 모호한 표현("괜찮은 메이크업샵 어디 없을까")용.
// ─────────────────────────────────────────────────────────────

// 카테고리 키워드 → places.category. 클라 searchHandlers 의
// PLACE_CATEGORY_KEYWORDS 미러(Deno 라 import 불가) — 드리프트 주의.
const VENDOR_CATEGORY_KEYWORDS: Record<string, string> = {
  웨딩홀: "wedding_hall", 식장: "wedding_hall", 결혼식장: "wedding_hall", 예식장: "wedding_hall",
  스튜디오: "studio", 촬영: "studio",
  드레스샵: "dress_shop", 드레스: "dress_shop",
  메이크업: "makeup_shop", 뷰티: "makeup_shop",
  한복: "hanbok",
  예복: "suit", 정장: "suit", 턱시도: "suit",
  허니문: "honeymoon", 신혼여행: "honeymoon",
  예물: "jewelry", 반지: "jewelry", 쥬얼리: "jewelry",
  가전: "appliance", 혼수: "appliance",
};

const VENDOR_CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀", studio: "스튜디오", dress_shop: "드레스샵", makeup_shop: "메이크업샵",
  hanbok: "한복", suit: "예복", honeymoon: "신혼여행", jewelry: "예물·반지", appliance: "가전·혼수",
};

// 추천·탐색 의도 어휘. "촬영 일정" 같은 비추천 문장 오탐을 줄이려고
// 카테고리 키워드와 AND 로만 쓴다.
const VENDOR_INTENT_RE = /(추천|알려|찾아|골라|어디|괜찮은|좋은\s*(곳|데)|할\s*만한|업체)/;

// 지역 라벨/약자 → places.city ILIKE 안전 substring. 클라 searchHandlers 의
// REGION_ALIAS_TO_SEARCH_KEY 미러 — 약자(충남 등)는 풀네임("충청남도")의
// 비연속 substring 이라 그대로 ILIKE 하면 0건(회귀 사례). 값은 연속 substring.
const REGION_TO_ILIKE: Record<string, string> = {
  충남: "충청남", 충청남도: "충청남", 충북: "충청북", 충청북도: "충청북",
  전남: "전라남", 전라남도: "전라남", 경남: "경상남", 경상남도: "경상남",
  경북: "경상북", 경상북도: "경상북", 전북: "전북", 전북특별자치도: "전북",
  강원: "강원", 강원특별자치도: "강원", 제주: "제주", 제주도: "제주", 제주특별자치도: "제주",
  세종: "세종", 세종특별자치시: "세종", 서울: "서울", 서울특별시: "서울",
  경기: "경기", 경기도: "경기", 인천: "인천", 인천광역시: "인천",
  부산: "부산", 부산광역시: "부산", 대구: "대구", 대구광역시: "대구",
  광주: "광주", 광주광역시: "광주", 대전: "대전", 대전광역시: "대전",
  울산: "울산", 울산광역시: "울산",
};

// 시군구 키워드 — district ILIKE 매칭(클라 SIGUNGU_KEYWORDS 미러).
const SIGUNGU_KEYWORDS = [
  "강남", "강북", "강동", "강서", "서초", "송파", "마포", "용산",
  "종로", "중구", "성동", "광진", "동대문", "성북", "도봉",
  "노원", "은평", "양천", "구로", "금천", "관악", "동작",
  "영등포", "서대문", "중랑", "강화",
  "성남", "수원", "용인", "안양", "고양",
  "천안", "청주", "춘천", "원주", "제천",
];

// 긴 키워드 우선 매칭("결혼식장"이 "식장"보다 먼저).
const VENDOR_KEYWORDS_SORTED = Object.keys(VENDOR_CATEGORY_KEYWORDS).sort((a, b) => b.length - a.length);
const REGION_KEYWORDS_SORTED = [...Object.keys(REGION_TO_ILIKE), ...SIGUNGU_KEYWORDS].sort((a, b) => b.length - a.length);

function inferVendorCategory(text: string): string | null {
  for (const kw of VENDOR_KEYWORDS_SORTED) {
    if (text.includes(kw)) return VENDOR_CATEGORY_KEYWORDS[kw];
  }
  return null;
}

function inferRegionIlike(text: string): string | null {
  for (const kw of REGION_KEYWORDS_SORTED) {
    if (text.includes(kw)) return REGION_TO_ILIKE[kw] ?? kw;
  }
  return null;
}

export function isVendorQuery(text: string): boolean {
  return VENDOR_INTENT_RE.test(text) && inferVendorCategory(text) !== null;
}

export interface VendorGrounding {
  /** 동적 컨텍스트에 덧붙일 근거 블록(해당 없으면 "") */
  block: string;
  /** 주입한 업체명 — L4 후처리 모니터링용 */
  names: string[];
}

const EMPTY_VENDOR_GROUNDING: VendorGrounding = { block: "", names: [] };

/**
 * 업체 추천 의도면 places 실데이터(활성 업체)를 근거 블록으로 반환.
 * 매칭 0건이어도 "지어내지 말라"는 지침 블록을 주입해 환각을 차단한다.
 */
export async function buildVendorGrounding(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  text: string,
  fallbackRegionLabel: string | null | undefined,
): Promise<VendorGrounding> {
  if (!isVendorQuery(text)) return EMPTY_VENDOR_GROUNDING;
  const category = inferVendorCategory(text)!;
  // 질문 속 지역 우선, 없으면 사용자 예식 지역. 값은 위 allowlist 의
  // 고정 substring 만 — 원문 사용자 입력을 ILIKE/or() 에 넣지 않는다(인젝션 방어).
  const region = inferRegionIlike(text) ??
    (fallbackRegionLabel ? REGION_TO_ILIKE[fallbackRegionLabel.trim()] ?? null : null);

  try {
    let query = supabase
      .from("places")
      .select("name, category, city, district, avg_rating, min_price, is_partner")
      .eq("is_active", true)
      .eq("category", category)
      .order("is_partner", { ascending: false })
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .limit(5);
    if (region) query = query.or(`district.ilike.%${region}%,city.ilike.%${region}%`);
    const { data, error } = await query;
    if (error) throw error;

    const label = VENDOR_CATEGORY_LABEL[category] ?? category;
    const rows = (data ?? []) as Array<{
      name: string; city: string | null; district: string | null;
      avg_rating: number | null; min_price: number | null; is_partner: boolean | null;
    }>;
    if (rows.length === 0) {
      return {
        block: `\n\n## 근거 데이터 (업체)\n조건(${region ? `${region} ` : ""}${label})에 맞는 업체 데이터가 없습니다. **임의의 업체명을 지어내 추천하지 마세요.** 객관적 선택 기준만 제시하고, "앱의 업체 탐색에서 조건으로 찾아보실 수 있어요"로 안내하세요.`,
        names: [],
      };
    }
    const lines = rows.map((p) => {
      const where = [p.city, p.district].filter(Boolean).join(" ");
      const bits = [
        where && `(${where})`,
        p.min_price ? `최저 ${Math.round(p.min_price / 10000).toLocaleString()}만원~` : null,
        p.avg_rating ? `평점 ${p.avg_rating}` : null,
        p.is_partner ? "듀이 파트너" : null,
      ].filter(Boolean).join(" · ");
      return `- ${p.name}${bits ? ` ${bits}` : ""}`;
    });
    return {
      block: [
        "\n\n## 근거 데이터 (업체 — 이 목록의 업체만 실명 언급 가능)",
        `다음은 앱에 등록된 ${region ? `${region} 지역 ` : ""}${label} 실데이터입니다. 업체를 추천할 때 이 목록 안에서만 실명을 언급하고, **목록에 없는 업체명을 지어내지 마세요.** 가격은 "최저가 기준, 옵션·시즌별 상이"를 명시하세요. 목록이 부족하면 "앱의 업체 탐색에서 더 보실 수 있어요"로 안내합니다.`,
        ...lines,
      ].join("\n"),
      names: rows.map((p) => p.name),
    };
  } catch (e) {
    // 근거 조회 실패는 답변을 막지 않는다 — 주입 없이 L3 계약(지어내기 금지)에 맡김.
    console.warn("vendor grounding query failed:", e instanceof Error ? e.message : e);
    return EMPTY_VENDOR_GROUNDING;
  }
}
