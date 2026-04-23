import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BASE_SYSTEM_PROMPT } from "./prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 3;



interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserData {
  profile: { display_name: string | null; email: string | null } | null;
  favorites: { item_type: string; item_id: string; name?: string }[];
  weddingSettings: { wedding_date: string | null } | null;
  scheduleItems: { title: string; scheduled_date: string; completed: boolean }[];
}

// deno-lint-ignore no-explicit-any
async function fetchUserData(supabase: any, userId: string): Promise<UserData> {
  const [profileRes, favoritesRes, weddingRes, scheduleRes] = await Promise.all([
    supabase.from("profiles").select("display_name, email").eq("user_id", userId).maybeSingle(),
    supabase.from("favorites").select("item_type, item_id").eq("user_id", userId),
    supabase.from("user_wedding_settings").select("wedding_date").eq("user_id", userId).maybeSingle(),
    supabase.from("user_schedule_items").select("title, scheduled_date, completed").eq("user_id", userId).order("scheduled_date", { ascending: true }),
  ]);

  const favorites = favoritesRes.data || [];
  
  const enrichedFavorites = await Promise.all(
    favorites.map(async (fav: { item_type: string; item_id: string }) => {
      let name = "";
      try {
        const tableName = fav.item_type === "venue" ? "venues" : 
              fav.item_type === "studio" ? "studios" :
              fav.item_type === "honeymoon" ? "honeymoon" :
              fav.item_type === "hanbok" ? "hanbok" :
              fav.item_type === "suit" ? "suits" :
              fav.item_type === "appliance" ? "appliances" :
              fav.item_type === "honeymoon_gift" ? "honeymoon_gifts" :
              fav.item_type === "invitation_venue" ? "invitation_venues" : "venues";
        const { data } = await supabase
          .from(tableName)
          .select("name")
          .eq("id", fav.item_id)
          .single();
        name = (data as { name?: string })?.name || "";
      } catch {
        // ignore
      }
      return { ...fav, name };
    })
  );

  return {
    profile: profileRes.data,
    favorites: enrichedFavorites,
    weddingSettings: weddingRes.data,
    scheduleItems: scheduleRes.data || [],
  };
}

function buildUserContext(userData: UserData): string {
  const parts: string[] = [];
  
  if (userData.profile?.display_name) {
    parts.push(`사용자 이름: ${userData.profile.display_name}`);
  }
  
  if (userData.weddingSettings?.wedding_date) {
    const weddingDate = new Date(userData.weddingSettings.wedding_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    parts.push(`예식일: ${userData.weddingSettings.wedding_date}`);
    if (daysUntil > 0) {
      parts.push(`D-Day: D-${daysUntil} (${daysUntil}일 남음)`);
    } else if (daysUntil === 0) {
      parts.push(`D-Day: 오늘이 결혼식입니다!`);
    } else {
      parts.push(`D-Day: D+${Math.abs(daysUntil)} (결혼식 ${Math.abs(daysUntil)}일 지남)`);
    }
  }
  
  if (userData.scheduleItems.length > 0) {
    const pending = userData.scheduleItems.filter(i => !i.completed);
    const completed = userData.scheduleItems.filter(i => i.completed);
    
    let scheduleText = `\n웨딩 체크리스트 (총 ${userData.scheduleItems.length}개, 완료 ${completed.length}개):`;
    
    if (pending.length > 0) {
      scheduleText += `\n- 남은 일정:`;
      pending.slice(0, 5).forEach(item => {
        scheduleText += `\n  · ${item.title} (${item.scheduled_date})`;
      });
      if (pending.length > 5) {
        scheduleText += `\n  · ... 외 ${pending.length - 5}개`;
      }
    }
    
    parts.push(scheduleText);
  }
  
  if (userData.favorites.length > 0) {
    const grouped: Record<string, string[]> = {};
    const typeLabels: Record<string, string> = {
      venue: "웨딩홀",
      studio: "스튜디오",
      honeymoon: "허니문",
      hanbok: "한복",
      suit: "예복",
      appliance: "혼수가전",
      honeymoon_gift: "허니문 선물",
      invitation_venue: "상견례 장소",
    };
    
    for (const fav of userData.favorites) {
      const label = typeLabels[fav.item_type] || fav.item_type;
      if (!grouped[label]) grouped[label] = [];
      if (fav.name) grouped[label].push(fav.name);
    }
    
    const favList = Object.entries(grouped)
      .map(([type, names]) => `- ${type}: ${names.join(", ")}`)
      .join("\n");
    
    parts.push(`\n관심 업체 목록:\n${favList}`);
  }
  
  if (parts.length === 0) return "";
  
  return `\n\n## 7. 현재 사용자 정보 (User Context)\n\n다음은 현재 대화하고 있는 사용자의 정보입니다. 이 정보를 바탕으로 더 맞춤화된 조언을 제공하세요:\n\n${parts.join("\n")}`;
}

// deno-lint-ignore no-explicit-any
async function checkAndIncrementUsage(supabase: any, userId: string): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> {
  const today = new Date().toISOString().split("T")[0];

  // Check subscription
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
    // Increment usage for tracking but no limit
    await supabase.rpc("increment_ai_usage", { p_user_id: userId, p_date: today });
    return { allowed: true, remaining: -1, isPremium: true };
  }

  // Free user: check daily limit
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

  // Increment
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

    let userContext = "";
    let dailyRemaining = -1;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          // Check usage limits
          const usageResult = await checkAndIncrementUsage(supabase, user.id);
          dailyRemaining = usageResult.remaining;

          if (!usageResult.allowed) {
            return new Response(
              JSON.stringify({
                error: "daily_limit",
                message: "오늘의 무료 질문 3회를 모두 사용했어요",
                remaining: 0,
                upgrade_url: "/premium",
              }),
              {
                status: 429,
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json",
                  "X-Daily-Remaining": "0",
                },
              }
            );
          }

          const userData = await fetchUserData(supabase, user.id);
          userContext = buildUserContext(userData);
          console.log("User context loaded for:", user.id, "premium:", usageResult.isPremium, "remaining:", usageResult.remaining);
        }
      } catch (e) {
        console.log("Could not fetch user data:", e);
      }
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + userContext;
    console.log("Dewy AI Planner request received, messages count:", messages.length, "has user context:", !!userContext);

    // Try Gemini first, fallback to Lovable AI gateway
    let streamResponse: Response | null = null;

    // Attempt Gemini API
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
        }
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

    // Fallback to Lovable AI gateway
    if (!streamResponse) {
      console.log("Falling back to Lovable AI gateway");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "AI 서비스를 이용할 수 없어요. 잠시 후 다시 시도해주세요." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lovableResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      });

      if (!lovableResp.ok) {
        const errText = await lovableResp.text();
        console.error("Lovable AI gateway error:", lovableResp.status, errText);
        if (lovableResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "요청 한도를 초과했어요. 잠시 후 다시 시도해주세요." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (lovableResp.status === 402) {
          return new Response(
            JSON.stringify({ error: "크레딧이 부족해요." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "AI 서비스에 문제가 발생했어요." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      streamResponse = lovableResp;
    }

    return new Response(streamResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Daily-Remaining": String(dailyRemaining),
      },
    });
  } catch (error) {
    console.error("Dewy AI Planner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
