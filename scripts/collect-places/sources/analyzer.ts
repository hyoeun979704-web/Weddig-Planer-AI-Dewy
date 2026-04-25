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
  analysis_confidence: number; // 0-100, model's self-assessed certainty
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
- avg_price_estimate: 후기에 나온 가격 범위. 단위(unit) 명확히 추정. 없으면 null.
  unit: per_person(웨딩홀 1인당) | per_event(1회) | per_set(1세트) | per_day(1일) | per_package(패키지)
- summary: 2-3문장 한글 요약. 핵심 특징.
- tags: 카테고리·분위기·강점 통합 키워드 (검색용).
- is_relevant: 스니펫이 정말 이 업체에 대한 후기인지 (false면 무관한 글이 섞임).
- analysis_confidence: 스니펫 일관성 + 양 + 최근성 종합 0-100.

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
          summary: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          is_relevant: { type: "boolean" },
          analysis_confidence: { type: "number" },
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
