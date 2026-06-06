// 청첩장 AI 텍스트 추천 — 슬롯에 어울리는 문구 3~5개 옵션 제안.
//
// 흐름:
//   1. 인증
//   2. 입력 검증
//   3. spend_hearts(1, "invitation_text_ai")
//   4. OpenAI Chat Completions 1회 호출 → 옵션 배열
//   5. 응답 반환 (실패 시 환불)
//
// 사용자가 청첩장 에디터에서 텍스트 슬롯을 선택 후 8초간 입력 없을 때
// 토스트가 뜨고, "추천받기" 클릭 시 이 함수가 호출됨.

import { adminClient } from "../_shared/supabase.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const HEART_COST = 1;

// 텍스트 추천에 쓰는 OpenAI 모델. 필요 시 OPENAI_TEXT_MODEL 로 override.
const OPENAI_TEXT_MODEL = Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-4o-mini";

interface RequestBody {
  slot_id: string;
  slot_role: string;             // 'intro' | 'greeting' | 'love_message' | ...
  slot_placeholder?: string;
  tone?: string;                 // ROMANTIC | MODERN | CLASSIC | ...
  template_hint?: string;
  user_data?: Record<string, string>;  // groom_name, bride_name, wedding_date, ...
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const supabaseAdmin = adminClient();

    const body = (await req.json()) as RequestBody;
    if (!body.slot_id || !body.slot_role) {
      return json({ error: "Missing required fields" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return json({ error: "openai_not_configured" }, 500);

    // 하트 차감
    const { data: spendData, error: spendError } = await supabaseAdmin.rpc(
      "spend_hearts",
      {
        p_user_id: userId,
        p_amount: HEART_COST,
        p_reason: "invitation_text_ai",
        p_ref_id: null,
      },
    );
    if (spendError) {
      console.error("spend_hearts error:", spendError);
      return json({ error: "hearts_error" }, 500);
    }
    const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
    if (!spendRow?.success) {
      return json(
        { error: "insufficient_hearts", message: spendRow?.message },
        402,
      );
    }

    try {
      const suggestions = await callOpenAI(OPENAI_API_KEY, body);
      return json(
        { suggestions, balance_after: spendRow.balance_after },
        200,
      );
    } catch (innerError) {
      console.error("inner error:", innerError);
      await refundHearts(supabaseAdmin, userId, HEART_COST, "openai_fail");
      return json({ error: "generation_failed" }, 500);
    }
  } catch (error) {
    console.error("invitation-text-suggest fatal:", error);
    return json({ error: "server_error" }, 500);
  }
});

// AI 추천에 컨텍스트로 넘길 수 있는 사용자 데이터 필드 — allowlist.
// 호출자가 user_data 객체 전체를 보낼 수 있으니 여기서 한 번 필터.
// 연락처·계좌·부모님 성함 같은 민감 정보는 의도적으로 제외.
const ALLOWED_USER_DATA_FIELDS = [
  "groom_name",
  "bride_name",
  "wedding_date",
  "wedding_time",
  "venue_name",
] as const;

async function callOpenAI(
  apiKey: string,
  body: RequestBody,
): Promise<string[]> {
  const tone = body.tone ?? "ROMANTIC";
  const role = body.slot_role;
  const placeholder = body.slot_placeholder ?? "";
  const hint = body.template_hint ?? "";
  const rawUserData = body.user_data ?? {};
  // allowlist 적용 — 그 외 필드는 OpenAI 에 전달하지 않는다
  const userData: Record<string, string> = {};
  for (const key of ALLOWED_USER_DATA_FIELDS) {
    const v = rawUserData[key];
    if (typeof v === "string" && v.trim()) userData[key] = v;
  }

  const userContextLines: string[] = [];
  if (userData.groom_name) userContextLines.push(`신랑 이름: ${userData.groom_name}`);
  if (userData.bride_name) userContextLines.push(`신부 이름: ${userData.bride_name}`);
  if (userData.wedding_date) userContextLines.push(`결혼 날짜: ${userData.wedding_date}`);
  if (userData.venue_name) userContextLines.push(`식장: ${userData.venue_name}`);

  const systemPrompt = `당신은 한국어 청첩장 카피라이터입니다. 청첩장의
특정 슬롯(${role})에 들어갈 문구를 3개 옵션으로 제안합니다. 각 옵션은
서로 다른 표현이어야 하고, 모두 ${tone} 톤이어야 합니다. 출력은
{"suggestions": ["문구1", "문구2", "문구3"]} 형태의 STRICT JSON 객체만
(다른 텍스트 없음).`;

  const userPrompt = `슬롯 역할: ${role}
톤: ${tone}
${hint ? `톤 힌트: ${hint}\n` : ""}${placeholder ? `예시 문구 (스타일 참고): "${placeholder}"\n` : ""}${userContextLines.length ? `\n신혼부부 정보:\n${userContextLines.join("\n")}\n` : ""}
이 슬롯에 어울리는 한국어 문구를 3개 제안하세요. 각 문구는 2~4 줄,
청첩장 톤에 맞는 격조와 정성이 느껴져야 합니다.

출력 형식 (반드시 JSON 객체):
{
  "suggestions": [
    "첫 번째 문구...",
    "두 번째 문구...",
    "세 번째 문구..."
  ]
}

신혼부부 이름이 주어졌다면 적절히 활용. 다른 텍스트는 출력하지 마세요.`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_TEXT_MODEL,
      temperature: 0.9,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`openai_${resp.status}: ${t.substring(0, 200)}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("openai_no_response");

  // json_object 모드는 객체를 반환 — {"suggestions": [...]} 를 기대하되,
  // 모델이 배열을 그대로 줄 수도 있으니 둘 다 처리.
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    parsed = JSON.parse(stripped);
  }
  const list = Array.isArray(parsed)
    ? parsed
    : (parsed as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("openai_bad_format");
  }
  return list.filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refundHearts(
  client: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string,
) {
  try {
    await client.rpc("earn_hearts", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: "refund_failed_invitation_text",
      p_ref_id: null,
    });
  } catch (e) {
    console.error("refund failed:", e, reason);
  }
}
