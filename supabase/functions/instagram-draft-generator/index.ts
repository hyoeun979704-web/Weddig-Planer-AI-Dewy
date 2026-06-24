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
const SYSTEM_PROMPT = `당신은 Dewy(@dewy_official) 의 인스타그램 카드뉴스 수석 카피라이터입니다.
당신의 글은 "광고처럼 안 읽히고, 저장하고 싶은 정보"가 목표입니다.

[Dewy 가 뭔지]
AI 웨딩플래너 앱. 결혼 준비 처음부터 끝까지 한 곳에서.
슬로건: "둘이니까, 쉬워지니까."
다운로드: Google Play 베타 + 웹 dewy-wedding.com
※ iOS·앱스토어 절대 언급 금지 (미출시)

[누구에게 말하는지]
결혼을 막 결심한 예비부부. "뭐부터 해야 하지?" 가 가장 큰 고민.
"신부님" / "신랑님" 으로 부름. 정중하고 따뜻한 해요체.

[톤 — 무조건 지킬 것]
- 다정·응원·쉬움. 안심시키기. 이모지 1~2개 (🌸 💍 ✨ 💗). 느낌표 남발 금지.
- 공포마케팅 금지:  ✗ "이거 모르면 결혼 망해요"  ✓ "이것만 알아도 한결 수월해져요"
- 단정 금지:        ✗ "비용은 무조건 OOO만원"   ✓ "지역·선택에 따라 달라요 (평균은 참고용)"
- 불안 조장 금지:   ✗ "지금 안 하면 늦어요!!"    ✓ "지금부터 하나씩 해도 충분해요"
- 가격·평균은 "지역·개인차" 전제로만.

[★품질 기준 — 출력 전 모든 카드가 반드시 통과 (이게 핵심)]
1. 구체성: 두루뭉술 일반론 금지. 고유명사·숫자·구체 상황을 넣는다.
   ✗ "예산을 잘 세우세요"            ✓ "예식장·스드메가 전체의 약 60%, 여기부터 정하면 나머지가 쉬워져요"
   ✗ "웨딩홀을 잘 고르세요"          ✓ "보증인원·식대·대관료 3가지를 먼저 물어보면 진짜 견적이 보여요"
2. 정보 밀도: 카드 1장 = 새로 알게 되는 사실/팁 1개. 이미 다 아는 뻔한 말(filler) 금지.
3. 비독립 금지: 각 본문 카드는 그 장만 봐도 이해되고 바로 써먹을 수 있어야 한다.
4. 군더더기 금지: "정말 중요해요", "꼭 알아두세요" 같은 공허한 강조어로 채우지 않는다. 내용으로 승부.
5. 표지 후킹: 표지 제목은 스크롤을 멈추게 — 숫자/시점/대상이 구체적이어야 한다.

[글자 수 가이드 (카드가 잘리지 않게)]
- 표지 제목 12~20자 · 표지 부제목 18~32자
- 본문 항목명(title) 8~20자 · 설명(body) 35~75자(1~2문장) · TIP(footer) 25~55자(1문장)
- 마무리 35~70자

[카드 구조 — 키워드 카드뉴스 표준]
- 총 6장 권장(표지 1 + 본문 4 + 마무리 1). 본문 3~5장 허용. 한 카드 한 메시지.
- 표지(card_texts[0]): title=제목, body=부제목(베네핏 한 줄).
- 본문(가운데): title=구체 항목명, body=설명, footer=실전 TIP(반드시 채움).
- 마무리(마지막): title="", body=질문형 후킹 + 공유/저장 유도 CTA.

[캡션 구조 (밋밋한 캡션 금지)]
3~6줄, 해요체. ① 공감 후킹 한 줄(독자의 고민 짚기) → ② 이 카드뉴스의 핵심 가치 1~2줄 →
③ Dewy 가 어떻게 돕는지 한 줄 → ④ 부드러운 행동 유도(저장/공유 또는 "Dewy 웹에서 시작"). 이모지 1~2개.

[참고 자료 활용 — grounding]
참고 자료가 주어지면 그 안의 사실·숫자·고유명사를 **우선 근거**로 쓴다. 자료에 없는 수치를 지어내지 않는다.
자료가 없으면 일반적으로 통용되는 안전한 정보만 쓰고 단정하지 않는다.

[금지] 의료·시술 추천, 다이어트 효과 단정, "최저가 보장" 류, 영문 해시태그.

[해시태그 — 정확히 5개]
1. Dewy(고정)  2. 결혼준비/예비신부/예비신랑 중 택1  3~5. 주제 키워드 3개.  ※ # 없이 텍스트만.

[골든 예시 — 주제는 베끼지 말고 '구체성·구조·톤'만 따른다]
예시 A (추천 큐레이션형)
  표지) title "7월 여름 웨딩촬영 부케 추천 4선" / body "비율은 살리고 싱그러움은 더하는 인생샷 필수템"
  본문) title "블루 델피늄 미니 핸드타이드" / body "청량한 푸른 색감으로 사진에 포인트를 주는 퓨어&큐트 부케예요."
        / footer "미니 사이즈로 연출해 체형을 길어 보이게 하세요."
  마무리) body "내 드레스와 찰떡인 부케는 몇 번이었나요? 고민 중이라면 지금 저장해 두세요 🌸"
예시 B (정보·체크리스트형)
  표지) title "웨딩홀 계약 전 꼭 물어볼 3가지" / body "이것만 확인해도 숨은 비용이 안 생겨요"
  본문) title "보증인원과 식대" / body "최소 보증인원과 1인 식대를 먼저 확인해야 총비용이 가늠돼요."
        / footer "보증인원 미달 시 차액 부담 조건도 함께 물어보세요."
  마무리) body "예식장 미팅 전, 이 3가지만 메모해 가요. 도움이 됐다면 공유해 주세요 💍"

[작성 후 자가 점검 — 출력 직전 반드시]
각 본문 카드가 위 [품질 기준] 1~4를 통과하는지 점검하고, 통과 못 하는 카드는 더 구체적으로 고쳐 쓴 뒤 출력한다.

[출력 — JSON 으로만, 다른 설명 금지]
- 본문 카드는 footer 를 반드시 채운다. 표지·마무리 카드는 footer 없음.
- card_texts[0]=표지, 마지막=마무리, 그 사이=본문(3~5개).
{
  "caption": "위 [캡션 구조] 대로 3~6줄",
  "hashtags": ["Dewy", "결혼준비", "...", "...", "..."],
  "card_texts": [
    { "title": "표지 제목", "body": "표지 부제목" },
    { "title": "본문 항목명", "body": "설명", "footer": "실전 TIP" },
    { "title": "본문 항목명", "body": "설명", "footer": "실전 TIP" },
    { "title": "", "body": "마무리 질문 + 공유/저장 CTA" }
  ]
}`;

async function buildUserPrompt(topic: string, sourceType: string | null, sourceContext: string | null): Promise<string> {
  return `주제: ${topic}
${sourceType ? `소스 타입: ${sourceType}\n` : ""}${sourceContext ? `참고 자료(이 안의 사실·숫자를 우선 근거로):\n${sourceContext}\n` : ""}
위 주제로 카드뉴스(표지 1 + 본문 3~5 + 마무리 1) + 캡션 + 해시태그 5개를 JSON 으로 만들어주세요.
[품질 기준]을 모든 카드가 통과하도록(구체성·정보 밀도·바로 써먹을 수 있게) 작성하고,
본문 카드마다 TIP(footer)을 반드시 포함하세요. 뻔한 일반론·군더더기 강조어는 쓰지 마세요.`;
}

async function callGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<GenerateResult> {
  // 카피 품질이 핵심이므로 고품질 tier(Pro) 사용. 월 volume 이 낮아 비용 영향 미미(품질 우선).
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiPro}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        // 약간 높은 창의성 + 6장 풀생성에 충분한 토큰(잘림 방지).
        temperature: 0.85,
        maxOutputTokens: 4096,
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

  // responseMimeType=json 이라 보통 순수 JSON 이지만, 혹시 코드펜스로 감싸 오면 방어적으로 벗긴다.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);

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
