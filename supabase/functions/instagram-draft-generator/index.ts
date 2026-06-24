// Dewy 인스타그램 카드뉴스 — AI 카피 생성기
//
// 입력:  { draftId } 또는 { topic, sourceType?, sourceId? }
// 처리:  content/instagram 의 콘텐츠 가이드를 시스템 프롬프트로 주입 + Gemini 호출
// 출력:  instagram_post_drafts 행에 caption, hashtags, card_texts UPDATE
//
// 호출 조건:
//   - admin 만 수동 호출 가능 (verify_jwt + 자체 role 검증)
//   - 향후 pg_cron 이 service_role 로도 호출 (자동 발굴 시)

import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


interface CardText {
  title?: string;
  body?: string;
  footer?: string;
}

interface GenerateResult {
  topic: string;
  caption: string;
  hashtags: string[];
  card_texts: CardText[];
}

// ============================================================================
// 시스템 프롬프트 — content/instagram/Project_Instructions.txt 와 일치 유지
// 파일 import 가 Edge Function 환경에선 어려워 직접 인라인. 두 곳을 함께 갱신할 것.
// ============================================================================
const SYSTEM_PROMPT = `당신은 Dewy(@dewy_official) 의 인스타그램 카드뉴스 카피라이터입니다.

[Dewy 가 뭔지]
AI 웨딩플래너 앱. 결혼 준비 처음부터 끝까지 한 곳에서.
슬로건: "둘이니까, 쉬워지니까."
다운로드: Google Play 베타 + 웹 dewy-wedding.com
※ iOS·앱스토어 절대 언급 금지 (미출시)

[누구에게 말하는지]
결혼을 막 결심한 예비부부. "뭐부터 해야 하지?" 가 가장 큰 고민.
"신부님" / "신랑님" 으로 부름. 정중하고 따뜻한 해요체.

[톤 — 무조건 지킬 것]
- 다정·응원·쉬움. 안심시키기.
- 이모지 1~2개 (🌸 💍 ✨ 💗). 느낌표 남발 금지.
- 공포마케팅 절대 금지:
  ✗ "이거 모르면 결혼 망해요" / "지금 안 하면 늦어요"
  ✓ "이것만 알아도 한결 수월해져요" / "지금부터 하나씩 해도 충분해요"
- 단정 금지:
  ✗ "결혼 비용은 무조건 OOO만원"
  ✓ "지역·선택에 따라 달라요 (평균은 참고용)"
- 가격·평균은 "지역·개인차" 전제. 한국소비자원 2026.02 출처.

[카드 구조 — 키워드 카드뉴스 표준 (반드시 이 형식)]
- 4:5 세로 1080×1350px. 총 6장 권장(표지 1 + 본문 4 + 마무리 1). 본문은 3~5장 허용.
- 1장(표지): 제목 + 부제목.
  · 제목 = 핵심 키워드 + 시점/숫자(예 "7월 여름 웨딩촬영 부케 추천 4선"). 구체적이고 클릭하고 싶게.
  · 부제목 = 베네핏 한 줄(예 "비율은 살리고 싱그러움은 더하는 인생샷 필수템").
- 본문 각 장(한 장 = 한 항목): 세 요소를 모두 채운다.
  · 항목명(title): 구체적·고유한 이름(예 "블루 델피늄 미니 핸드타이드"). 추상적 일반어 금지.
  · 설명(body): 1~2문장. 왜 좋은지·어떤 무드인지.
  · TIP(footer): 실전 연출·활용 팁 1문장(예 "미니 사이즈로 연출해 체형을 길어 보이게 하세요").
- 마지막 장(마무리): 질문형 후킹 + 공유 유도 CTA(예 "내 드레스와 찰떡인 부케는? 지금 공유해 보세요!").
- 한 카드 한 메시지. 위 톤 규칙(과장·공포마케팅·단정 금지) 그대로.

[골든 예시 — 이 품질·구조가 목표]
표지) 제목 "7월 여름 웨딩촬영 부케 추천 4선" · 부제목 "비율은 살리고 싱그러움은 더하는 인생샷 필수템"
본문) 항목명 "블루 델피늄 미니 핸드타이드" · 설명 "시원하고 청초한 푸른 색감으로 사진에 포인트를 주는
      퓨어&큐트 부케." · TIP "한 손에 쏙 들어오는 미니 사이즈로 체형을 길어 보이게 하고 사랑스러움을 강조하세요."
마무리) "내 드레스와 찰떡인 부케는 몇 번? 7월 웨딩촬영을 고민 중이라면 지금 바로 공유해 보세요!"

[광고 표기 — 자동 처리]
- partner_deal / 제휴 / 협찬: 캡션 첫 줄에 "#광고" 필수, 해시태그 #광고 포함
- tip_blog / tip_instagram 인용: 캡션에 "@출처 · 원문 프로필 링크"
- 자체 콘텐츠·앱 기능·자사 이벤트: 광고 표기 X

[금지 키워드]
의료·시술 추천, 다이어트 효과 단정, "최저가 보장" 류

[해시태그 — 정확히 5개 (2026 인스타 정책)]
1. #Dewy (고정)
2. #결혼준비 / #예비신부 / #예비신랑 (택1)
3~5. 주제 키워드 3개
※ 영문 해시태그 금지. # 없이 텍스트만 반환.

[출력 — JSON 으로만]
다음 JSON 스키마로만 답하세요. 다른 설명 금지.
- 본문 카드는 footer(TIP)를 **반드시** 채운다. 표지·마무리 카드는 footer 없음.
- card_texts[0]=표지, 마지막=마무리, 그 사이=본문(3~5개).

{
  "caption": "인스타 본문 캡션(따뜻한 해요체, 이모지 1~2개)",
  "hashtags": ["Dewy", "결혼준비", "...", "...", "..."],
  "card_texts": [
    { "title": "표지 제목", "body": "표지 부제목(베네핏 한 줄)" },
    { "title": "본문 항목명", "body": "설명 1~2문장", "footer": "실전 TIP 1문장" },
    { "title": "본문 항목명", "body": "설명 1~2문장", "footer": "실전 TIP 1문장" },
    { "title": "", "body": "마무리 질문 + 공유 유도 CTA" }
  ]
}`;

async function buildUserPrompt(topic: string, sourceType: string | null, sourceContext: string | null): Promise<string> {
  return `주제: ${topic}
${sourceType ? `소스 타입: ${sourceType}\n` : ""}${sourceContext ? `참고 자료:\n${sourceContext}\n` : ""}
위 주제로 카드뉴스(표지 1 + 본문 3~5 + 마무리 1) + 캡션 + 해시태그 5개를 JSON 으로 만들어주세요.
본문 카드마다 TIP(footer)을 반드시 포함하세요.`;
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<GenerateResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiFlash}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API failed: ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response missing text");

  const parsed = JSON.parse(text);

  // 해시태그 5개 강제 (Gemini 가 가끔 더 줄 때 자르고, 부족하면 그대로)
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags.slice(0, 5).map((h: string) => String(h).replace(/^#/, ""))
    : [];

  return {
    topic: parsed.topic ?? "",
    caption: String(parsed.caption ?? ""),
    hashtags,
    card_texts: Array.isArray(parsed.card_texts) ? parsed.card_texts : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !geminiKey) {
      console.error("instagram-draft-generator misconfigured");
      return new Response(
        JSON.stringify({ error: "server_misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) 호출자 검증: admin 또는 service_role
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // admin role 체크
      const { data: hasRole } = await adminClient.rpc("has_role", {
        _user_id: claimsData.claims.sub,
        _role: "admin",
      });
      if (!hasRole) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2) 입력 파싱
    const body = await req.json().catch(() => ({}));
    const draftId: string | undefined = body.draftId;
    let topic: string | undefined = body.topic;
    const sourceType: string | null = body.sourceType ?? null;
    const sourceContext: string | null = body.sourceContext ?? null;

    if (!draftId && !topic) {
      return new Response(
        JSON.stringify({ error: "Either draftId or topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // draftId 가 있으면 기존 행에서 topic 가져오기
    if (draftId && !topic) {
      const { data: draft, error } = await adminClient
        .from("instagram_post_drafts")
        .select("topic, source_type")
        .eq("id", draftId)
        .single();
      if (error || !draft) {
        return new Response(
          JSON.stringify({ error: "Draft not found", details: error?.message }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      topic = draft.topic;
    }

    // 3) Gemini 호출
    const userPrompt = await buildUserPrompt(topic!, sourceType, sourceContext);
    const result = await callGemini(geminiKey, SYSTEM_PROMPT, userPrompt);

    // 4) draft 업데이트
    if (draftId) {
      const { error: updateError } = await adminClient
        .from("instagram_post_drafts")
        .update({
          caption: result.caption,
          hashtags: result.hashtags,
          card_texts: result.card_texts,
          card_count: result.card_texts.length,
        })
        .eq("id", draftId);

      if (updateError) {
        console.error("draft update failed:", updateError);
        return new Response(
          JSON.stringify({ error: "Draft update failed", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, draftId, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("instagram-draft-generator error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
