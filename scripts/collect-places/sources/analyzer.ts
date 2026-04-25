// Wedding business deep analysis from blog/cafe snippets via Gemini.
//
// Paid tier: 2,000 RPM, 1M+ tokens/day. We throttle to 30 RPM (2s gap) for safety.

const MIN_GAP_MS = 2_000;
let lastCallAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < MIN_GAP_MS) await sleep(MIN_GAP_MS - elapsed);
  lastCallAt = Date.now();
}

function parseRetryDelay(errText: string): number {
  const m = errText.match(/retry in ([\d.]+)s/i) || errText.match(/"retryDelay":\s*"(\d+)s"/);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500;
  return 30_000;
}

export interface PlaceAnalysis {
  price_tier: "budget" | "mid" | "premium" | "luxury" | null;
  atmosphere: string[];
  pros: string[];
  cons: string[];
  hidden_costs: string[];
  recommended_for: string[];
  avg_price_estimate: {
    min: number;
    max: number;
    currency: "KRW";
    unit: "per_person" | "per_event" | "per_set" | "per_day" | "per_package";
  } | null;
  summary: string | null;
  tags: string[];
  is_relevant: boolean;
  analysis_confidence: number;

  // Location/access (best effort, often null)
  subway_station: string | null;
  subway_line: string | null;
  walk_minutes: number | null;
  parking_capacity: number | null;
  parking_location: string | null;

  // Per-category card fields. Only the fields matching the input category
  // should be filled; the rest must be null/empty.
  // wedding_hall
  hall_styles: string[] | null;
  meal_types: string[] | null;
  min_guarantee: number | null;
  max_guarantee: number | null;
  // studio
  shoot_styles: string[] | null;
  includes_originals: boolean | null;
  // dress_shop
  dress_styles: string[] | null;
  rental_only: boolean | null;
  // makeup_shop
  makeup_styles: string[] | null;
  includes_rehearsal: boolean | null;
  // hanbok
  hanbok_types: string[] | null;
  custom_available: boolean | null;
  // tailor_shop
  suit_styles: string[] | null;
  // (custom_available shared with hanbok)
  // honeymoon
  destinations: string[] | null;
  duration_days: number | null;
  // appliance
  brand_options: string[] | null;
  product_categories: string[] | null;
  // invitation_venue
  venue_types: string[] | null;
  capacity_min: number | null;
  capacity_max: number | null;
  // planner
  service_packages: string[] | null;
}

const SYSTEM = `너는 한국 웨딩 업체 분석가다. 사용자가 제공하는 블로그/카페 후기 스니펫 묶음을 종합해 해당 업체에 대해 깊이 있는 구조화 분석을 제공한다.

규칙:
- 스니펫은 짧으니 "추측" 금지. 명시된 정보만 추출.
- price_tier: 가격 언급/총 비용 단서로 판단. 없으면 null.
  budget: 매우 저렴 / mid: 보통 / premium: 비싼 편 / luxury: 최고급
- atmosphere: 후기에서 반복적으로 등장하는 분위기 키워드 (예: ["모던","야외","한옥","조용한","고급","아늑"])
- pros: 강점 3-5개 짧은 구문 (예: "친절한 응대", "넓은 주차장")
- cons: 단점/주의점 3-5개. 없으면 빈 배열.
- hidden_costs: 후기에서 반복 등장하는 추가 비용 항목 (예: "원본 데이터 별도", "헬퍼 비용 5만원")
- recommended_for: 어떤 신부에게 적합한지 (예: ["소규모 결혼식","외향적 신부","합리적 가격 추구"])
- avg_price_estimate: 후기에서 가격 단서를 적극 추정하라. 직접 가격이 없어도 "비싸다/저렴하다/100만원대" 같은 표현으로 합리적 범위를 추정. 정말 단서가 0이면 null.
  ★ 모든 unit은 무조건 "per_person" (1인 기준)으로 통일하라.
  커플/패키지/세트 기준 가격은 1인 기준으로 환산하라:
    웨딩홀 → 1인당 식대 (보통 6-15만원)
    스드메 → 커플 패키지 ÷ 2 = 1인 (보통 100-250만원)
    한복 → 1인 1세트 대여/맞춤 (보통 15-40만원)
    예복 → 신랑 1인 1세트 (보통 30-150만원)
    허니문 → 커플 패키지 ÷ 2 = 1인 (보통 100-500만원)
    혼수 → 풀세트 ÷ 2 = 1인 (보통 250-1000만원)
    청첩장 → 1인당 식대 (보통 5-15만원)
    웨딩플래너 → 1쌍 의뢰 ÷ 2 = 1인 (보통 25-150만원)
- 한복 카테고리 특별 규칙 (★엄격하게 적용★):
  업체가 다음 중 **하나라도** 해당되면 무조건 is_relevant=false:
    1) 관광객/외국인 대상 한복 체험 매장 (1시간/반나절 단위 대여)
    2) 경복궁·북촌·인사동·한옥마을 인근의 사진 촬영용 체험 매장
    3) 일반 한복 대여업체 (혼주/신부/신랑 결혼식 전용 아닌 일반 대여)
    4) 사진관/스튜디오 부속 한복 체험
  is_relevant=true 조건: 업체 후기/소개에 다음 중 하나가 명확하게 언급되어야 함:
    "혼주 한복", "신부 한복", "신랑 한복", "어머님/아버님 한복",
    "결혼식 한복", "예단 한복", "폐백 한복", "한복 맞춤", "한복 디자이너"
  알려진 체험 브랜드 (자동 false): 한복남, 한복살롱, 한복마법, 다온재, 한복마을 등 경복궁 인근 체험 프랜차이즈.
- summary: 2-3문장 한글 요약. 핵심 특징.
- tags: 카테고리·분위기·강점 통합 키워드 (검색용).
- is_relevant: 스니펫이 정말 이 업체에 대한 후기인지 (false면 무관한 글이 섞임).
- analysis_confidence: 스니펫 일관성 + 양 + 최근성 종합 0-100.

위치·접근성 (스니펫에 명시된 경우만, 추측 금지. 없으면 null):
- subway_station: 가까운 지하철역 이름만 (예: "강남역", "삼성중앙역"). "역" 포함.
- subway_line: 호선 (예: "2호선", "9호선"). 모르면 null.
- walk_minutes: 역에서 도보 N분 (예: "도보 5분" → 5). 숫자만, 모르면 null.
- parking_capacity: 주차 가능 대수 (숫자만). 명시 없으면 null.
- parking_location: 주차 관련 정보 텍스트. 다음 중 후기에서 언급된 것을 자유롭게 1-2문장으로 합쳐 작성:
  · 위치/구조 (예: "건물 지하 1층", "인근 공영주차장")
  · 가능 여부 (예: "주차 가능", "주차 불가", "발렛 가능")
  · 상황/주의 (예: "주말 혼잡", "협소", "유료")
  숫자 capacity가 없어도 위 텍스트 정보가 있으면 적극 채울 것. 정말 언급 없으면 null.

★ 카테고리별 카드 필드 (해당 카테고리 외엔 무조건 null/빈배열) ★
입력의 "카테고리:" 라인을 보고 매칭되는 카테고리의 필드만 채워라. 다른 카테고리 필드는 모두 null.

- 웨딩홀: hall_styles[](예: ["호텔","컨벤션","채플","하우스","야외","한옥"]), meal_types[](예: ["코스","한식","뷔페","양식"]), min_guarantee/max_guarantee(보증인원, "200명부터" → min=200)
- 스드메(스튜디오): shoot_styles[](예: ["내추럴","감성","화보풍","빈티지","야외","스튜디오"]), includes_originals(원본 데이터 제공 명시 시 true/유료별도 명시 시 false/모호 null)
- 드레스샵: dress_styles[](예: ["머메이드","프린세스","A라인","벨라인","엠파이어","미니"]), rental_only(대여만 명시 true / 구매도 가능 false / 모호 null)
- 메이크업샵: makeup_styles[](예: ["내추럴","글로우","동안","화려","한복용","컨실러","모던"]), includes_rehearsal(리허설 메이크업 포함 명시 true / 별도 false / 모호 null)
- 한복 (★엄격★): hanbok_types[](["혼주","신부","신랑","어머님","아버님","폐백","예단"] 중 후기에 명시된 것만), custom_available(맞춤 명시 true / 대여만 false / 모호 null)
- 예복(맞춤정장): suit_styles[](예: ["클래식","이탈리안","브리티시","모던","턱시도","쓰리피스"]), custom_available(맞춤 true / 대여만 false / 모호 null)
- 허니문: destinations[](언급된 여행지명 배열, 예: ["몰디브","발리","유럽","스위스","하와이"]), duration_days(패키지 일수, "5박 7일" → 7)
- 혼수: brand_options[](언급된 브랜드, 예: ["삼성","LG","다이슨","발뮤다"]), product_categories[](예: ["냉장고","세탁기","건조기","TV","에어컨","공기청정기"])
- 청첩장(상견례 식당): venue_types[](예: ["한식","일식","양식","중식","코스","프라이빗룸","호텔레스토랑"]), capacity_min/capacity_max(룸 수용 인원 범위, "최대 20명" → max=20)
- 웨딩플래너: service_packages[](예: ["풀패키지","부분 플래닝","스드메 패키지","원데이","컨설팅","당일 진행"])

JSON으로만 응답.`;

interface AnalysisInput {
  business_name: string;
  category: string; // Korean label
  region: string;
  snippets: { source: string; title: string; description: string; postdate?: string }[];
}

export async function analyzeBusiness(
  input: AnalysisInput,
  apiKey: string,
  model = "gemini-2.5-flash"
): Promise<PlaceAnalysis | null> {
  if (input.snippets.length === 0) return null;

  const userPrompt = `업체명: ${input.business_name}
카테고리: ${input.category}
지역: ${input.region}

후기 스니펫 (${input.snippets.length}개):
${input.snippets
  .map(
    (s, i) =>
      `[${i + 1}] (${s.source}${s.postdate ? `, ${s.postdate}` : ""}) ${s.title}\n${s.description}`
  )
  .join("\n\n")}`;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json",
      response_schema: {
        type: "object",
        properties: {
          price_tier: { type: "string", nullable: true },
          atmosphere: { type: "array", items: { type: "string" } },
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },
          hidden_costs: { type: "array", items: { type: "string" } },
          recommended_for: { type: "array", items: { type: "string" } },
          avg_price_estimate: {
            type: "object",
            nullable: true,
            properties: {
              min: { type: "number" },
              max: { type: "number" },
              currency: { type: "string" },
              unit: { type: "string" },
            },
          },
          min_guarantee: { type: "number", nullable: true },
          max_guarantee: { type: "number", nullable: true },
          summary: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          is_relevant: { type: "boolean" },
          analysis_confidence: { type: "number" },
          subway_station: { type: "string", nullable: true },
          subway_line: { type: "string", nullable: true },
          walk_minutes: { type: "number", nullable: true },
          parking_capacity: { type: "number", nullable: true },
          parking_location: { type: "string", nullable: true },
          // wedding_hall
          hall_styles: { type: "array", items: { type: "string" }, nullable: true },
          meal_types: { type: "array", items: { type: "string" }, nullable: true },
          // studio
          shoot_styles: { type: "array", items: { type: "string" }, nullable: true },
          includes_originals: { type: "boolean", nullable: true },
          // dress_shop
          dress_styles: { type: "array", items: { type: "string" }, nullable: true },
          rental_only: { type: "boolean", nullable: true },
          // makeup_shop
          makeup_styles: { type: "array", items: { type: "string" }, nullable: true },
          includes_rehearsal: { type: "boolean", nullable: true },
          // hanbok
          hanbok_types: { type: "array", items: { type: "string" }, nullable: true },
          custom_available: { type: "boolean", nullable: true },
          // tailor_shop
          suit_styles: { type: "array", items: { type: "string" }, nullable: true },
          // honeymoon
          destinations: { type: "array", items: { type: "string" }, nullable: true },
          duration_days: { type: "number", nullable: true },
          // appliance
          brand_options: { type: "array", items: { type: "string" }, nullable: true },
          product_categories: { type: "array", items: { type: "string" }, nullable: true },
          // invitation_venue
          venue_types: { type: "array", items: { type: "string" }, nullable: true },
          capacity_min: { type: "number", nullable: true },
          capacity_max: { type: "number", nullable: true },
          // planner
          service_packages: { type: "array", items: { type: "string" }, nullable: true },
        },
        required: ["is_relevant", "analysis_confidence", "atmosphere", "pros", "cons", "tags"],
      },
    },
  };

  const callOnce = async () => {
    await throttle();
    return fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  };

  let res = await callOnce();
  if (res.status === 429) {
    const txt = await res.text();
    const wait = parseRetryDelay(txt);
    console.warn(`Gemini 429, sleeping ${(wait / 1000).toFixed(0)}s before retry…`);
    await sleep(wait);
    res = await callOnce();
  }
  if (!res.ok) {
    console.warn("Gemini analyze failed:", res.status, (await res.text()).slice(0, 300));
    return null;
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text) as PlaceAnalysis;
  } catch {
    console.warn("Gemini analyze JSON parse failed:", text.slice(0, 200));
    return null;
  }
}
