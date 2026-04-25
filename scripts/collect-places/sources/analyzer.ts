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
  // Wedding-hall specific (null for other categories)
  min_guarantee: number | null;
  max_guarantee: number | null;
  summary: string | null;
  tags: string[];
  is_relevant: boolean;
  analysis_confidence: number; // 0-100, model's self-assessed certainty

  // ── Category-specific extractions (fill only the section matching `category`)
  duration_days: number | null;       // honeymoon: "5박 7일" → 7
  capacity_min: number | null;        // invitation_venue
  capacity_max: number | null;
  destinations: string[];             // honeymoon: ["발리","프라하"]
  brand_options: string[];            // appliance: ["LG","삼성","위니아"]

  // ── Booleans (only set when snippets explicitly support the value)
  custom_available: boolean | null;   // hanbok / tailor_shop
  rental_only: boolean | null;        // dress_shop
  includes_originals: boolean | null; // studio (원본 데이터 포함)
  includes_rehearsal: boolean | null; // makeup_shop (리허설 포함)
  shuttle_bus_available: boolean | null; // wedding_hall
  parking_available: boolean | null;
  valet_parking: boolean | null;

  // ── place_details extras (fill only when the snippets mention it)
  parking_capacity: number | null;
  subway_station: string | null;
  subway_line: string | null;
  walk_minutes: number | null;
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
- min_guarantee, max_guarantee: 웨딩홀 보증인원 범위. 다른 카테고리는 무조건 null.
  예: "보증인원 200명부터 가능" → min_guarantee=200, max_guarantee=null.

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

── 카테고리별 추가 추출 (해당 카테고리만 채우고 나머지는 null/빈배열):
- 허니문(honeymoon):
  · duration_days: 여행 일수 (예: "5박 7일" → 7, "3박 4일" → 4). 언급 없으면 null.
  · destinations: 실제 여행지명 배열 (예: ["발리","사이판"]). 일반 단어("유럽","동남아")만 있으면 그대로.
- 청첩장(invitation_venue):
  · capacity_min, capacity_max: 수용 인원 범위 (예: "30-100명" → 30,100). 언급 없으면 null.
- 혼수(appliance):
  · brand_options: 후기에 등장하는 가전 브랜드명 (예: ["LG","삼성","다이슨"]). 일반 카테고리는 tags로.

── 카테고리별 boolean (스니펫에서 명확히 언급될 때만 true/false, 아니면 null):
- 한복/예복: custom_available — "맞춤 제작", "맞춤 한복", "맞춤 예복" 언급 시 true.
- 드레스샵: rental_only — "대여만 가능", "맞춤 안함" 명시 시 true. 대여+맞춤 둘 다면 false.
- 스튜디오: includes_originals — "원본 데이터 포함" 시 true, "원본 별도/추가" 시 false.
- 메이크업: includes_rehearsal — "리허설 메이크업 포함" 시 true.
- 웨딩홀: shuttle_bus_available — "셔틀버스 운행" 언급.
- 모든 카테고리: parking_available — "주차 가능"/"주차장" 언급. valet_parking — "발레파킹/발렛".

── 상세 페이지 정보 (스니펫에서 명시된 경우만):
- parking_capacity: 주차 대수 숫자 (예: "100대 주차 가능" → 100).
- subway_station, subway_line: 지하철 접근 (예: "2호선 강남역 도보 5분" → station="강남역", line="2호선").
- walk_minutes: 지하철역에서 도보 분 (위 예시 → 5).

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
          // Category-specific
          duration_days: { type: "number", nullable: true },
          capacity_min: { type: "number", nullable: true },
          capacity_max: { type: "number", nullable: true },
          destinations: { type: "array", items: { type: "string" } },
          brand_options: { type: "array", items: { type: "string" } },
          // Booleans
          custom_available: { type: "boolean", nullable: true },
          rental_only: { type: "boolean", nullable: true },
          includes_originals: { type: "boolean", nullable: true },
          includes_rehearsal: { type: "boolean", nullable: true },
          shuttle_bus_available: { type: "boolean", nullable: true },
          parking_available: { type: "boolean", nullable: true },
          valet_parking: { type: "boolean", nullable: true },
          // Detail page extras
          parking_capacity: { type: "number", nullable: true },
          subway_station: { type: "string", nullable: true },
          subway_line: { type: "string", nullable: true },
          walk_minutes: { type: "number", nullable: true },
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
