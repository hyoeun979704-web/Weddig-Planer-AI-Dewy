import { MODELS } from "../_shared/llm.ts";
import { getPrompt } from "../_shared/prompts.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BASE_SYSTEM_PROMPT } from "./prompt.ts";
import { fetchUserData, buildUserContext } from "./user-data.ts";
import { extractAndStoreMemories } from "./memory.ts";
import { ALWAYS_ON_CAPSULES, buildConditionalCapsules } from "./domain-capsules.ts";
import { buildPriceGrounding, buildVendorGrounding, isVendorQuery, type VendorGrounding } from "./grounding.ts";
import { createSseAuditTransform } from "./postprocess.ts";


// 사용 한도: 무료 일 10회 / 프리미엄 분당 10회 + 일 200회(남용 방지선).
const FREE_DAILY_LIMIT = 10;
const PREMIUM_PER_MINUTE = 10;
const PREMIUM_DAILY_LIMIT = 200;
// 본경로 채팅 모델 — OpenAI 단일(gpt-4o). 환각 약점은 프롬프트 불확실성 계약(L3)+
// 근거주입(L2 RAG)으로 보강. eval 모드는 model_override 로 다른 모델 비교 가능.
const CHAT_MODEL = "gpt-4o";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// deno-lint-ignore no-explicit-any
async function checkAndIncrementUsage(supabase: any, userId: string): Promise<{ allowed: boolean; remaining: number; isPremium: boolean; blockedBy: string | null }> {
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

  // 일/분 동시 원자 게이트 — 무료는 일 10회(분당 동일=추가 제약 없음),
  // 프리미엄은 분당 10회 + 일 200회(남용 방지선). 한도 도달이면 allowed=false.
  const minuteLimit = isPremium ? PREMIUM_PER_MINUTE : FREE_DAILY_LIMIT;
  const dailyLimit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const { data: gate, error: gateError } = await supabase.rpc("increment_ai_usage_gated", {
    p_user_id: userId,
    p_date: today,
    p_minute_limit: minuteLimit,
    p_daily_limit: dailyLimit,
  });
  // 게이트 실패(에러)도 fail-closed 거부(강한 정합성, 비용 차단).
  if (gateError || !gate?.allowed) {
    return { allowed: false, remaining: 0, isPremium, blockedBy: gate?.blocked_by ?? "daily" };
  }
  return {
    allowed: true,
    remaining: isPremium ? -1 : Math.max(0, FREE_DAILY_LIMIT - (gate.daily_count as number)),
    isPremium,
    blockedBy: null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, eval_options } = await req.json() as {
      messages: Message[];
      /**
       * 모델 비교 평가 전용(운영자만). 일반 사용자가 보내면 무시된다.
       * - list_models: 프로바이더 모델 목록 반환 (생성 안 함)
       * - provider/model: 이 호출만 해당 모델로 생성 (비스트리밍 JSON 응답)
       * - raw_system: judge 용 — 시스템 프롬프트를 통째로 대체(컨텍스트 미주입)
       */
      eval_options?: {
        list_models?: boolean;
        provider?: "gemini" | "openai";
        model?: string;
        raw_system?: string;
      };
    };
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // GEMINI 키 누락 검사는 일반(스트리밍) 경로에서만 — 평가 모드는 OpenAI
    // 단독으로도 돌 수 있어야 하므로 아래 분기 직전에 확인한다.

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

    // ───── 모델 비교 평가 모드 (운영자 전용) ─────
    // 비관리자가 eval_options 를 보내면 조용히 무시하고 일반 경로로 진행한다.
    let evalMode: typeof eval_options | undefined;
    if (eval_options) {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roleRows ?? []).some((r: { role: string }) => r.role === "admin");
      if (isAdmin) evalMode = eval_options;
    }

    if (evalMode?.list_models) {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      const [g, o] = await Promise.all([
        GEMINI_API_KEY
          ? fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}&pageSize=100`)
              .then((r) => r.json()).catch(() => null)
          : Promise.resolve(null),
        OPENAI_API_KEY
          ? fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } })
              .then((r) => r.json()).catch(() => null)
          : Promise.resolve(null),
      ]);
      return new Response(
        JSON.stringify({
          gemini_key: !!GEMINI_API_KEY,
          openai_key: !!OPENAI_API_KEY,
          gemini: (g?.models ?? []).map((m: { name: string }) => m.name),
          openai: (o?.data ?? []).map((m: { id: string }) => m.id),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 일반 경로는 OpenAI(gpt-4o) 가 본모델 — OPENAI 키 필수.
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!evalMode && !OPENAI_API_KEY) {
      console.error("ai-planner: OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service is temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 일일 사용량 체크는 entitlement 게이트 — 실패하면 fail-closed.
    // (평가 모드는 내부 측정이라 게이트·메모리 추출을 모두 건너뛴다)
    const usageResult = evalMode
      ? { allowed: true, remaining: -1, isPremium: true, blockedBy: null }
      : await checkAndIncrementUsage(supabase, user.id);
    const dailyRemaining = usageResult.remaining;

    if (!usageResult.allowed) {
      // 분당 rate-limit(주로 프리미엄 폭주) vs 일일 한도 구분 — UX·클라 분기.
      const isMinute = usageResult.blockedBy === "minute";
      return new Response(
        JSON.stringify({
          error: isMinute ? "rate_limit" : "daily_limit",
          message: isMinute
            ? "잠시만요! 요청이 너무 빨라요. 잠시 후 다시 시도해 주세요."
            : usageResult.isPremium
              ? "오늘 사용량이 많아 잠시 제한됐어요. 잠시 후 다시 이용해 주세요."
              : `오늘의 무료 질문 ${FREE_DAILY_LIMIT}회를 모두 사용했어요`,
          remaining: 0,
          upgrade_url: usageResult.isPremium ? undefined : "/premium",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Daily-Remaining": "0" } },
      );
    }

    // 사용자 컨텍스트 로드는 best-effort — 실패해도 빈 컨텍스트로 답변은 이어간다.
    // (judge 호출(raw_system)은 컨텍스트 자체가 오염원이라 로드하지 않음)
    let userContext = "";
    let conditionalCapsules = "";
    let priceGrounding = "";
    let vendorGrounding: VendorGrounding = { block: "", names: [] };
    const lastUserContent = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!evalMode?.raw_system) try {
      const userData = await fetchUserData(supabase, user.id);
      userContext = buildUserContext(userData);
      conditionalCapsules = buildConditionalCapsules(userData.weddingSettings);
      // L2 근거주입(RAG): 가격 질문이면 지역 평균 시세를, 업체 추천 질문이면
      // places 실데이터를 근거로 주입(환각 차단).
      priceGrounding = buildPriceGrounding(
        lastUserContent,
        userData.budgetSettings?.region ?? userData.weddingSettings?.wedding_region,
        userData.budgetSettings?.guest_count,
      );
      vendorGrounding = await buildVendorGrounding(
        supabase,
        lastUserContent,
        userData.weddingSettings?.wedding_region,
      );
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

    // Fire-and-forget memory extraction (OpenAI) — 평가 모드는 시나리오 입력이
    // 사용자 기억을 오염시키므로 제외.
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg?.content && !evalMode && OPENAI_API_KEY) {
      extractAndStoreMemories(supabase, user.id, lastUserMsg.content, OPENAI_API_KEY).catch(
        (e) => console.warn("memory extraction (bg) failed:", e),
      );
    }

    // 캐싱 분리: 정적 프롬프트(BASE+상시캡슐)는 모든 요청 공통 → OpenAI 가
    // 접두를 캐시(입력비↓). 동적(페르소나 캡슐+사용자 컨텍스트)은 별도 메시지로
    // 뒤에 붙여 정적 접두의 캐시 적중을 깨지 않게 한다.
    // 시스템 프롬프트는 DB(ai_prompts)에서 실시간 로드 — 어드민이 고치면 즉시 반영.
    // 조회 실패/미시드면 코드의 BASE_SYSTEM_PROMPT 로 폴백(동작 무변).
    const basePrompt = await getPrompt(supabase, "ai_planner_system", BASE_SYSTEM_PROMPT);
    const staticPrompt = basePrompt + ALWAYS_ON_CAPSULES;
    const dynamicContext = conditionalCapsules + userContext + priceGrounding + vendorGrounding.block;
    const systemPrompt = evalMode?.raw_system ?? staticPrompt + dynamicContext;

    // ───── 평가 모드 생성: 모델 교체 + 비스트리밍 + 지연/토큰 측정 ─────
    if (evalMode) {
      const provider = evalMode.provider ?? "gemini";
      const started = Date.now();
      let text = "";
      let usage: unknown = null;
      let modelUsed = "";

      if (provider === "openai") {
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (!OPENAI_API_KEY) {
          return new Response(JSON.stringify({ error: "openai_not_configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        modelUsed = evalMode.model ?? "gpt-4o-mini";
        const oaMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ];
        // 모델 세대에 따라 max_tokens / max_completion_tokens 가 갈려 폴백 재시도.
        const call = (tokParam: string) =>
          fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({ model: modelUsed, messages: oaMessages, [tokParam]: 2048 }),
          });
        let resp = await call("max_completion_tokens");
        if (!resp.ok) {
          const errText = await resp.text();
          if (errText.includes("max_completion_tokens")) resp = await call("max_tokens");
          else {
            return new Response(JSON.stringify({ error: "provider_error", detail: errText.slice(0, 300) }), {
              status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        if (!resp.ok) {
          const errText = await resp.text();
          return new Response(JSON.stringify({ error: "provider_error", detail: errText.slice(0, 300) }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const json = await resp.json();
        text = json.choices?.[0]?.message?.content ?? "";
        usage = json.usage ?? null;
      } else {
        if (!GEMINI_API_KEY) {
          return new Response(JSON.stringify({ error: "gemini_not_configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        modelUsed = evalMode.model ?? MODELS.geminiFlash;
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelUsed}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: messages.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
              generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
            }),
          },
        );
        if (!resp.ok) {
          const errText = await resp.text();
          return new Response(JSON.stringify({ error: "provider_error", detail: errText.slice(0, 300) }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const json = await resp.json();
        text = (json.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? "")
          .join("");
        usage = json.usageMetadata ?? null;
      }

      return new Response(
        JSON.stringify({ text, model: modelUsed, provider, latency_ms: Date.now() - started, usage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    console.log("Dewy AI Planner request received, messages:", messages.length, "ctx:", !!userContext);

    // OpenAI gpt-4o 스트리밍. 캐시 적중을 위해 정적 system → 동적 system 순서로
    // 메시지 접두를 구성. SSE(choices[].delta.content)는 클라가 그대로 파싱한다.
    const chatMessages = [
      { role: "system", content: staticPrompt },
      ...(dynamicContext ? [{ role: "system", content: dynamicContext }] : []),
      ...messages.map((m: Message) => ({ role: m.role, content: m.content })),
    ];

    let streamResponse: Response | null = null;
    try {
      const oaResp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: CHAT_MODEL,
          stream: true,
          messages: chatMessages,
          max_tokens: 2048,
          temperature: 0.8,
        }),
      });
      if (oaResp.ok) streamResponse = oaResp;
      else console.warn("OpenAI API failed:", oaResp.status, (await oaResp.text()).slice(0, 200));
    } catch (e) {
      console.warn("OpenAI API call error:", e);
    }

    if (!streamResponse) {
      return new Response(
        JSON.stringify({ error: "AI service is temporarily unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // L4 출력 후처리: 패스스루로 전문을 모아 [DONE] 직전에 점검(면책 보강·환각 모니터링).
    const auditedBody = streamResponse.body!.pipeThrough(createSseAuditTransform({
      hasPriceGrounding: priceGrounding !== "",
      groundedVendorNames: vendorGrounding.names,
      isVendorQuery: isVendorQuery(lastUserContent),
    }));
    return new Response(auditedBody, {
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
