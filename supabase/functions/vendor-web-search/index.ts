/**
 * vendor-web-search — DB에 매칭 업체가 없거나 부족할 때 Gemini Google
 * Search Grounding으로 실시간 웹 검색 후 출처와 함께 답변.
 *
 * 안전 설계:
 * - 기존 ai-planner의 일 5회 한도에 합산 (별도 카운터 없음)
 * - 호출 시 ai_usage_daily.message_count 증가 (rpc increment_ai_usage)
 * - 출처(URL·제목)는 Gemini groundingMetadata에서 받은 것만 표시 →
 *   환각 차단 (LLM이 생성한 URL은 노출 안 함)
 * - 검색 실패·키 누락 시 graceful: 클라이언트가 기존 "데이터 없음"
 *   메시지로 떨어뜨림
 * - 응답 최대 1024 토큰 (장황한 LLM 출력 방지)
 *
 * 입력:
 *   { queryType: "search" | "price" | "popular",
 *     category?: string, region?: string, originalMessage: string }
 *
 * 출력:
 *   { reply: string, sources: { title, uri }[], grounded: boolean }
 *   또는 { error, message }
 */

import { MODELS } from "../_shared/llm.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const FREE_DAILY_LIMIT = 5;

interface SearchRequest {
  queryType: "search" | "price" | "popular";
  category?: string;
  region?: string;
  originalMessage: string;
}

// 카테고리 슬러그 → 한국어 라벨 (Gemini 프롬프트용)
const CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스샵",
  makeup_shop: "메이크업샵",
  hanbok: "한복",
  suit: "예복",
  honeymoon: "신혼여행",
  jewelry: "예물·반지",
  appliance: "가전·혼수",
};

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

// 쿼리 타입에 따라 LLM에게 줄 지시문을 조립.
// 검색 결과 형식·톤·길이·금기 사항을 명시해 환각·장황함 방지.
function buildPrompt(req: SearchRequest): string {
  const catLabel = req.category ? (CATEGORY_LABEL[req.category] ?? req.category) : "";
  const region = req.region ?? "";
  const today = new Date().toISOString().split("T")[0];

  const intro = `당신은 한국 결혼 준비를 돕는 챗봇 Dewy예요. 사용자가 우리 DB에서 찾지 못한 정보를 묻고 있어서, 오늘(${today}) 기준 웹 검색으로 답해드려야 해요.

검색 컨텍스트:
- 사용자 질문: "${req.originalMessage}"
${region ? `- 지역: ${region}\n` : ""}${catLabel ? `- 카테고리: ${catLabel}\n` : ""}- 요청 유형: ${req.queryType === "price" ? "시세·평균 가격" : req.queryType === "popular" ? "인기·평점 상위 업체" : "업체 검색·추천"}

**중요 지시사항:**
1. Google Search를 적극 활용해 **${today} 기준 최신 정보**로 답변
2. 한국 결혼 관련 블로그·웨딩 사이트·후기 사이트를 우선 참고
3. **업체 이름을 명시할 때는 반드시 검색 결과에 등장한 곳만** — 추측 금지
4. 가격은 검색 결과에 명시된 범위로만 답변, 모르면 "검색 결과에 가격 표기 없음" 명시
5. 톤: 따뜻하고 친구 같은 말투 ("~예요", "~해요"). 신부님 호칭 사용.
6. 출처는 답변 본문에 끼워넣지 말고, Gemini의 grounding metadata로만 처리 (시스템이 자동 표시)
7. 길이: 4~8줄 정도 간결하게. 마크다운 굵게(**) 활용.
8. **신뢰성 디스클레이머**: 응답 끝에 한 줄로 "_실제 가격·예약 가능 여부는 업체에 직접 확인해주세요_" 같은 메시지 포함

응답 형식 예시:
**${region || "해당 지역"} ${catLabel || "업체"} 정보 🌐**

[검색 결과 요약 — 가격 범위·특징 3~5줄]

_${today} 기준 웹 검색 결과예요. 가격·예약 가능 여부는 업체에 직접 확인해주세요._`;

  return intro;
}

// Gemini grounding metadata에서 출처 URL·제목 추출.
// chunks 형식: { web: { uri, title } } — title이 없으면 도메인 사용.
// deno-lint-ignore no-explicit-any
function extractSources(geminiResp: any): { title: string; uri: string }[] {
  const chunks = geminiResp?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: { title: string; uri: string }[] = [];
  const seen = new Set<string>();

  // deno-lint-ignore no-explicit-any
  for (const c of chunks as any[]) {
    const web = c?.web;
    if (!web?.uri) continue;
    if (seen.has(web.uri)) continue;
    seen.add(web.uri);
    let title = (web.title ?? "").trim();
    if (!title) {
      try {
        title = new URL(web.uri).hostname.replace(/^www\./, "");
      } catch {
        title = web.uri;
      }
    }
    sources.push({ title, uri: web.uri });
  }
  return sources.slice(0, 5); // 너무 많으면 응답이 지저분 → 상위 5
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as SearchRequest;

    // 입력 검증 — 비어있으면 거부 (LLM 비용 낭비 방지)
    if (!body?.originalMessage || body.originalMessage.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "invalid_input", message: "검색어가 너무 짧아요" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "not_configured", message: "웹 검색 기능이 아직 설정되지 않았어요" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 인증·한도 체크 — ai-planner와 동일 로직 (일 5회 한도 합산)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let dailyRemaining = -1;

    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);

      if (user) {
        userId = user.id;
        const usageResult = await checkAndIncrementUsage(supabase, user.id);
        dailyRemaining = usageResult.remaining;

        if (!usageResult.allowed) {
          return new Response(
            JSON.stringify({
              error: "daily_limit",
              message: "오늘의 무료 질문 5회를 모두 사용했어요. 프리미엄으로 무제한 가능해요.",
              upgrade_url: "/premium",
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Daily-Remaining": "0" } },
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "unauthenticated", message: "로그인이 필요해요" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "unauthenticated", message: "로그인이 필요해요" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = buildPrompt(body);
    console.log("vendor-web-search call:", { userId, queryType: body.queryType, category: body.category, region: body.region });

    // Gemini 2.5 Flash + Google Search Grounding
    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.geminiFlash}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      },
    );

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.warn("Gemini API failed:", geminiResp.status, errText.slice(0, 300));
      return new Response(
        JSON.stringify({
          error: "search_failed",
          message: "웹 검색 중 일시적 문제가 발생했어요. 잠시 후 다시 시도해주세요.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await geminiResp.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const sources = extractSources(data);
    const grounded = sources.length > 0;

    if (!reply) {
      return new Response(
        JSON.stringify({
          error: "empty_response",
          message: "검색 결과를 가져오지 못했어요.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 출처가 없으면 신뢰도 경고를 응답 앞에 추가 (환각 가능성 알림)
    const finalReply = grounded
      ? reply
      : `⚠️ _검증된 출처를 찾지 못했어요. 아래 정보는 참고용이며 정확하지 않을 수 있어요._\n\n${reply}`;

    return new Response(
      JSON.stringify({
        reply: finalReply,
        sources,
        grounded,
        remaining: dailyRemaining,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Daily-Remaining": String(dailyRemaining),
        },
      },
    );
  } catch (e) {
    const err = e as Error;
    console.error("vendor-web-search error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: "internal", message: "서버 오류가 발생했어요. 잠시 후 다시 시도해주세요." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
