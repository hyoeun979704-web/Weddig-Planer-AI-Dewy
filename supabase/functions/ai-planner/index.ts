import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BASE_SYSTEM_PROMPT } from "./prompt.ts";
import { fetchUserData, buildUserContext } from "./user-data.ts";
import { extractAndStoreMemories } from "./memory.ts";
import { ALWAYS_ON_CAPSULES, buildConditionalCapsules } from "./domain-capsules.ts";


const FREE_DAILY_LIMIT = 5;

interface Message {
  role: "user" | "assistant";
  content: string;
}

// deno-lint-ignore no-explicit-any
async function checkAndIncrementUsage(supabase: any, userId: string): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> {
  const today = new Date().toISOString().split("T")[0];

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, expires_at, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const isPremium = sub &&
    sub.plan !== "free" &&
    sub.status === "active" &&
    ((sub.trial_ends_at && new Date(sub.trial_ends_at) > now) ||
     (sub.expires_at && new Date(sub.expires_at) > now));

  // 원자적 check-and-increment — 한도 미만일 때만 +1 하고 새 카운트 반환, 한도 도달이면
  // NULL. 이전엔 SELECT 후 별도 RPC 로 +1 하는 비원자 구조라 동시 요청이 같은 카운트를
  // 읽고 둘 다 통과(한도 초과)할 수 있었다. premium 은 사실상 무제한(큰 limit)으로 추적.
  const limit = isPremium ? 2_147_483_647 : FREE_DAILY_LIMIT;
  const { data: newCount, error: gateError } = await supabase.rpc("increment_ai_usage_if_allowed", {
    p_user_id: userId,
    p_date: today,
    p_limit: limit,
  });
  // 게이트 실패(에러) 또는 한도 도달(null) → fail-closed 거부(강한 정합성, 비용 차단).
  if (gateError || newCount == null) {
    return { allowed: false, remaining: 0, isPremium };
  }
  return {
    allowed: true,
    remaining: isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - (newCount as number)),
    isPremium,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json() as { messages: Message[] };
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // 서버 환경변수 누락 — 클라이언트가 디버깅하기 쉽도록 500 (config 오류)으로 응답.
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("ai-planner misconfigured: SUPABASE_URL / SERVICE_ROLE_KEY missing");
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 일일 사용량 체크는 entitlement 게이트 — 실패하면 fail-closed.
    const usageResult = await checkAndIncrementUsage(supabase, user.id);
    const dailyRemaining = usageResult.remaining;

    if (!usageResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "daily_limit",
          message: "오늘의 무료 질문 5회를 모두 사용했어요",
          remaining: 0,
          upgrade_url: "/premium",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Daily-Remaining": "0" } },
      );
    }

    // 사용자 컨텍스트 로드는 best-effort — 실패해도 빈 컨텍스트로 답변은 이어간다.
    let userContext = "";
    let conditionalCapsules = "";
    try {
      const userData = await fetchUserData(supabase, user.id);
      userContext = buildUserContext(userData);
      conditionalCapsules = buildConditionalCapsules(userData.weddingSettings);
      console.log(
        "User context loaded for:", user.id,
        "premium:", usageResult.isPremium,
        "remaining:", usageResult.remaining,
        "memories:", userData.memories.length,
        "capsules:", conditionalCapsules ? "yes" : "no",
      );
    } catch (e) {
      console.warn("Could not load user context, proceeding without it:", e);
    }

    // Fire-and-forget memory extraction on the user's most recent message.
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg?.content) {
      extractAndStoreMemories(supabase, user.id, lastUserMsg.content, GEMINI_API_KEY).catch(
        (e) => console.warn("memory extraction (bg) failed:", e),
      );
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + ALWAYS_ON_CAPSULES + conditionalCapsules + userContext;
    console.log("Dewy AI Planner request received, messages count:", messages.length, "has user context:", !!userContext);

    let streamResponse: Response | null = null;
    const geminiContents = messages.map((m: Message) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    try {
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiFlash}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: geminiContents,
            generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
          }),
        },
      );

      if (geminiResp.ok) {
        streamResponse = geminiResp;
        console.log("Streaming response from Gemini API");
      } else {
        const errText = await geminiResp.text();
        console.warn("Gemini API failed:", geminiResp.status, errText.slice(0, 200));
      }
    } catch (e) {
      console.warn("Gemini API call error:", e);
    }

    if (!streamResponse) {
      return new Response(
        JSON.stringify({ error: "AI service is temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Daily-Remaining": String(dailyRemaining) },
    });
  } catch (error) {
    // 내부 에러 상세(DB 스키마/컬럼명 등)는 로그로만, 클라에는 제네릭 메시지.
    console.error("Dewy AI Planner error:", error);
    return new Response(
      JSON.stringify({ error: "AI 플래너 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
