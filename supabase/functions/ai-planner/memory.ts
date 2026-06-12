// Memory extraction. After the main streaming response kicks off, we
// fire-and-forget a tiny OpenAI call against the user's most recent message.
// The model returns an array of {fact_type, fact}, which we insert into
// user_ai_memory. Cheap (~200 in / ~80 out tokens per message) and async,
// so it doesn't block the user's chat. Idempotent unique index dedups.
const MEMORY_MODEL = "gpt-4o-mini";

const MEMORY_EXTRACTION_PROMPT = `당신은 결혼 플래닝 챗봇의 메모리 추출기입니다. 사용자가 방금 보낸 메시지에서, *향후 결혼 준비 상담에 도움이 될* 사실(facts)을 추출하세요.

추출 규칙 (반드시 준수):
1. 메시지에 명시적으로 표현된 사실만. 추측·일반화 금지.
2. 일회성 발화 / 단순 질문 / 인사말 / 감탄사 제외.
3. 카테고리 (반드시 이 중 하나):
   - preference: 취향·스타일·분위기·감성 ("야외 선호", "심플한 디자인 좋아함")
   - family: 가족 구성·관계·양가 분담 ("어머니가 해외 거주", "양가 50% 분담")
   - schedule: 특정 날짜·일정·기한 ("6월에 시연 예정")
   - budget: 예산·결제·가격 관련 ("총 5천만 예산", "스튜디오는 200만 이내")
   - vendor: 특정 업체에 대한 관심·평가 ("로얄파크 좋아 보임")
   - general: 그 외 의미 있는 정보
4. 각 사실은 *짧은 1문장 요약*. 원문 그대로 복사 금지.
5. 같은 카테고리에 여러 사실 있으면 별도 항목으로.
6. 추출할 게 없으면 빈 배열 반환.

응답 형식 (반드시 JSON 배열만, 다른 설명 없이):
[{"type":"preference","fact":"야외 웨딩 선호"},{"type":"family","fact":"부모님이 부산 거주"}]

추출할 게 없으면 []`;

interface ExtractedFact {
  type: string;
  fact: string;
}

const ALLOWED_FACT_TYPES = new Set(["preference", "family", "schedule", "budget", "vendor", "general"]);

export async function extractAndStoreMemories(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  userMessage: string,
  openaiApiKey: string,
): Promise<void> {
  if (userMessage.trim().length < 10) return;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: MEMORY_MODEL,
        temperature: 0.0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: MEMORY_EXTRACTION_PROMPT + '\n\n반드시 {"facts":[...]} 형태의 JSON 객체로만 응답.' },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!resp.ok) {
      console.warn("Memory extraction failed:", resp.status);
      return;
    }
    const data = await resp.json();
    const text: string | undefined = data.choices?.[0]?.message?.content;
    if (!text) return;

    let facts: ExtractedFact[];
    try {
      const parsed = JSON.parse(text);
      facts = Array.isArray(parsed) ? parsed : (parsed.facts ?? []);
    } catch {
      return;
    }
    if (!Array.isArray(facts) || facts.length === 0) return;

    const rows = facts
      .filter((f) => f && typeof f.fact === "string" && typeof f.type === "string")
      .filter((f) => f.fact.trim().length > 0 && f.fact.trim().length < 200)
      .filter((f) => ALLOWED_FACT_TYPES.has(f.type))
      .slice(0, 5)
      .map((f) => ({
        user_id: userId,
        fact_type: f.type,
        fact_text: f.fact.trim(),
        source_message: userMessage.slice(0, 500),
      }));

    if (rows.length === 0) return;

    await supabase.from("user_ai_memory").upsert(rows, {
      onConflict: "user_id,fact_text",
      ignoreDuplicates: true,
    });
  } catch (e) {
    console.warn("Memory extraction error:", e instanceof Error ? e.message : e);
  }
}
