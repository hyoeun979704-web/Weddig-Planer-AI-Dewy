// 청첩장 AI 텍스트 추천 — 슬롯에 어울리는 문구 3~5개 옵션 제안.
//
// 흐름:
//   1. 인증
//   2. 입력 검증
//   3. spend_hearts(1, "invitation_text_ai")
//   4. Gemini Flash 1회 호출 → 옵션 배열
//   5. 응답 반환 (실패 시 환불)
//
// 사용자가 청첩장 에디터에서 텍스트 슬롯을 선택 후 8초간 입력 없을 때
// 토스트가 뜨고, "추천받기" 클릭 시 이 함수가 호출됨.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HEART_COST = 1;

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as RequestBody;
    if (!body.slot_id || !body.slot_role) {
      return json({ error: "Missing required fields" }, 400);
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "gemini_not_configured" }, 500);

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
      const suggestions = await callGemini(GEMINI_API_KEY, body);
      return json(
        { suggestions, balance_after: spendRow.balance_after },
        200,
      );
    } catch (innerError) {
      console.error("inner error:", innerError);
      await refundHearts(supabaseAdmin, userId, HEART_COST, "gemini_fail");
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

async function callGemini(
  apiKey: string,
  body: RequestBody,
): Promise<string[]> {
  const tone = body.tone ?? "ROMANTIC";
  const role = body.slot_role;
  const placeholder = body.slot_placeholder ?? "";
  const hint = body.template_hint ?? "";
  const rawUserData = body.user_data ?? {};
  // allowlist 적용 — 그 외 필드는 Gemini 에 전달하지 않는다
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
서로 다른 표현이어야 하고, 모두 ${tone} 톤이어야 합니다. 출력은 STRICT
JSON 배열만 (다른 텍스트 없음).`;

  const userPrompt = `슬롯 역할: ${role}
톤: ${tone}
${hint ? `톤 힌트: ${hint}\n` : ""}${placeholder ? `예시 문구 (스타일 참고): "${placeholder}"\n` : ""}${userContextLines.length ? `\n신혼부부 정보:\n${userContextLines.join("\n")}\n` : ""}
이 슬롯에 어울리는 한국어 문구를 3개 제안하세요. 각 문구는 2~4 줄,
청첩장 톤에 맞는 격조와 정성이 느껴져야 합니다.

출력 형식 (반드시 JSON 배열):
[
  "첫 번째 문구...",
  "두 번째 문구...",
  "세 번째 문구..."
]

신혼부부 이름이 주어졌다면 적절히 활용. 다른 텍스트는 출력하지 마세요.`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`gemini_${resp.status}: ${t.substring(0, 200)}`);
  }
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini_no_response");

  let parsed: string[];
  try {
    parsed = JSON.parse(text);
  } catch {
    const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    parsed = JSON.parse(stripped);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("gemini_bad_format");
  }
  return parsed.filter((s) => typeof s === "string" && s.trim().length > 0);
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
