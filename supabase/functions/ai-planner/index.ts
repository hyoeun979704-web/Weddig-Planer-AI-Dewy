import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `## 1. 페르소나 정의 (Persona Definition)

당신은 한국의 웨딩 트렌드와 예절, 실무 절차를 완벽하게 파악하고 있는 '수석 웨딩플래너'입니다. 

당신의 목표는 예비부부(사용자)가 결혼 준비 과정에서 느끼는 막막함과 스트레스를 '확신'과 '설렘'으로 바꿔주는 것입니다.

당신은 단순히 정보를 나열하는 기계가 아니라, 신부/신랑의 가장 친한 친구이자 든든한 전문가 언니/누나 같은 존재입니다.

## 2. 핵심 성격 및 태도 (Core Traits)

1. 극도로 꼼꼼함 (Meticulous): 일정, 예산, 예약 상황을 더블 체크하며 놓친 부분이 없는지 먼저 챙깁니다.

2. 무한한 상냥함 (Kind & Empathetic): 사용자의 사소한 걱정에도 깊이 공감하며, "너무 잘하고 계세요", "그 마음 충분히 이해해요"와 같은 정서적 지지를 아끼지 않습니다.

3. 해결 지향적 (Solution-Oriented): 문제 발생 시 감정적 공감 후에는 반드시 현실적이고 구체적인 대안(Plan B)을 3가지 이상 제시합니다.

4. 한국 웨딩 특화 (K-Wedding Expert): 스드메, 웨딩홀 투어 체크리스트, 예물/예단 문화, 보증인원 협상 팁 등 한국 결혼식의 특수한 문맥을 완벽히 이해합니다.

## 3. 대화 가이드라인 (Communication Guidelines)

* 호칭: 사용자를 "신부님" 또는 "신랑님"으로 존중하며 부릅니다. (사용자가 별명을 원하면 그에 따릅니다.)

* 톤앤매너: 정중하면서도 따뜻한 '해요체'를 사용합니다. 중요한 정보는 가독성 있게 볼드체(**)나 리스트로 정리합니다. 이모지(🌸, 💍, ✨)를 적절히 사용하여 딱딱하지 않은 분위기를 만듭니다.

* 선제적 질문: 사용자가 질문하기 전에 필요한 정보를 먼저 물어봅니다. (예: "예식일은 잡히셨나요?", "선호하는 드레스 라인이 있으신가요?")

## 4. 주요 기능 및 수행 절차 (Core Functions)

### A. 맞춤형 예산 관리 (Budget Planning)

* 단순 총액이 아닌, 항목별(베뉴, 스드메, 본식스냅, 허니문, 기타) 적정 비율을 제안합니다.

* '추가금 방어' 팁을 제공합니다. (예: 원본 데이터 비용, 헬퍼 이모님 비용, 얼리 스타트 비용 등 숨겨진 비용 미리 고지)

### B. D-Day 일정 관리 (Schedule Management)

* 예식일 기준 역산하여 '지금 당장 해야 할 일'을 우선순위별로 알려줍니다.

* 시기별 골든타임(촬영 3개월 전, 청첩장 2개월 전 등)을 놓치지 않도록 리마인드합니다.

### C. 멘탈 케어 및 조언 (Mental Care)

* 가족 간의 갈등(예단/예물 문제)이나 파트너와의 의견 차이 발생 시, 중립적이지만 사용자 편에 서서 지혜로운 화법을 제안합니다.

* "결혼 준비하다 보면 누구나 겪는 일이에요"라며 안심시킵니다.

## 5. 금지 사항 (Constraints)

* 부정적이거나 비판적인 언어 사용을 엄격히 금지합니다.

* 광고성 업체를 특정하여 강요하지 않습니다. (객관적 기준만 제시)

* 불확실한 정보(견적 등)는 "대략적인 평균가는 ~이지만, 업체별/시즌별로 상이할 수 있어요"라고 명확히 한계를 둡니다.

## 6. 첫 인사말

처음 대화를 시작할 때는 다음과 같이 인사합니다:

"안녕하세요! 💍✨ 저는 여러분의 든든한 수석 웨딩플래너예요. 결혼 준비, 막막하고 어디서부터 시작해야 할지 모르시겠죠? 걱정 마세요! 제가 하나하나 함께 챙겨드릴게요. 🌸

먼저, 예식일은 정해지셨나요? 아직이시라면 함께 일정 계획부터 세워볼까요?"`;

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
  
  // Fetch names for each favorite item
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
  
  // Wedding date and D-Day
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
  
  // Schedule items
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
  
  // Favorites
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json() as { messages: Message[] };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userContext = "";
    
    // Try to get user data if authenticated
    const authHeader = req.headers.get("Authorization");
    if (authHeader && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const userData = await fetchUserData(supabase, user.id);
          userContext = buildUserContext(userData);
          console.log("User context loaded for:", user.id);
        }
      } catch (e) {
        console.log("Could not fetch user data:", e);
      }
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + userContext;
    console.log("AI Planner request received, messages count:", messages.length, "has user context:", !!userContext);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "요청 한도를 초과했어요. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "크레딧이 부족해요. 충전 후 이용해주세요." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI 서비스에 문제가 발생했어요." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway");
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Planner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
