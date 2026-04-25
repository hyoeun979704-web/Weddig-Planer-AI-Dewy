// Extract structured place info from Naver search snippets via Gemini.

export interface ExtractedPlace {
  name: string | null;
  region: string | null; // "서울특별시 강남구"
  city: string | null;
  district: string | null;
  description: string | null;
  price_hint: string | null;
  official_url: string | null;
  tags: string[];
  is_business_listing: boolean; // true if snippet looks like a real vendor
}

interface ExtractInput {
  category_label: string; // 한복/스드메 etc
  snippets: { source: string; title: string; description: string; link: string; postdate?: string }[];
}

const SYSTEM = `너는 한국어 웨딩 업체 정보 추출기다. 입력으로 들어오는 블로그/카페 검색 스니펫에서 실제 사업체 정보를 식별해 JSON으로 추출한다.

규칙:
- name: 업체명. 후기/소개 글에서 명시된 정확한 상호. 추측 금지.
- region: 사업장 주소 또는 명시된 지역. "서울특별시 강남구" 형태.
- city, district: region 분리.
- price_hint: 텍스트에서 보이는 가격 정보. 없으면 null.
- official_url: 글에 명시된 공식 사이트/예약 링크. blog.naver.com이나 cafe.naver.com은 NULL (블로그 후기 링크일 뿐).
- tags: 키워드 (예: ["하우스웨딩", "야외", "프리미엄"]).
- is_business_listing: true면 실제 업체 후기·정보 글, false면 일반 글/이벤트/팁 글 등.

출력은 반드시 단일 JSON 객체. 문자열 필드는 unsure하면 null.`;

export async function extractPlace(
  input: ExtractInput,
  apiKey: string
): Promise<ExtractedPlace | null> {
  const userPrompt = `카테고리: ${input.category_label}\n\n스니펫:\n${input.snippets
    .map(
      (s, i) =>
        `[${i + 1}] (${s.source}) ${s.title}\n${s.description}\n링크: ${s.link}${s.postdate ? `  일자: ${s.postdate}` : ""}`
    )
    .join("\n\n")}\n\n위 스니펫들을 종합해 단일 업체 정보를 JSON으로 추출하라.`;

  const body = {
    system_instruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
      response_schema: {
        type: "object",
        properties: {
          name: { type: "string", nullable: true },
          region: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          district: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          price_hint: { type: "string", nullable: true },
          official_url: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          is_business_listing: { type: "boolean" },
        },
        required: ["is_business_listing", "tags"],
      },
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    console.warn("Gemini extract failed:", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text) as ExtractedPlace;
  } catch (e) {
    console.warn("Gemini JSON parse failed:", text.slice(0, 200));
    return null;
  }
}
