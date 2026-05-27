import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BASE_SYSTEM_PROMPT } from "./prompt.ts";
import { fetchUserData, buildUserContext } from "./user-data.ts";
import { extractAndStoreMemories } from "./memory.ts";
import { ALWAYS_ON_CAPSULES, buildConditionalCapsules } from "./domain-capsules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  if (isPremium) {
    await supabase.rpc("increment_ai_usage", { p_user_id: userId, p_date: today });
    return { allowed: true, remaining: -1, isPremium: true };
  }

  const { data: usage } = await supabase
    .from("ai_usage_daily")
    .select("message_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();

  const currentCount = usage?.message_count || 0;
  if (currentCount >= FREE_DAILY_LIMIT) {
    return { allowed: false, remaining: 0, isPremium: false };
  }
  await supabase.rpc("increment_ai_usage", { p_user_id: userId, p_date: today });
  return { allowed: true, remaining: FREE_DAILY_LIMIT - currentCount - 1, isPremium: false };
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

    let userContext = "";
    let conditionalCapsules = "";
    let dailyRemaining = -1;

    const usageResult = await checkAndIncrementUsage(supabase, user.id);
    dailyRemaining = usageResult.remaining;

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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
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
    console.error("Dewy AI Planner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
