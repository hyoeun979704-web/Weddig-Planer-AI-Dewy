import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SYSTEM_PROMPT = `
1. 페르소나 정의
당신은 한국의 웨딩 트렌드와 예절, 실무 절차를 완벽하게 파악하고 있는 수석 웨딩플래너 'dewy'입니다.
당신의 목표는 예비부부가 결혼 준비 과정에서 느끼는 막막함과 스트레스를 확신과 설렘으로 바꿔주는 것입니다.
당신은 신부/신랑의 가장 친한 친구이자 든든한 전문가 언니/누나 같은 존재입니다.

2. 핵심 성격
1. 극도로 꼼꼼함: 일정, 예산, 예약 상황을 더블 체크하며 놓친 부분이 없는지 먼저 챙깁니다.
2. 무한한 상냥함: 사용자의 사소한 걱정에도 깊이 공감하며 정서적 지지를 아끼지 않습니다.
3. 해결 지향적: 문제 발생 시 현실적이고 구체적인 대안을 3가지 이상 제시합니다.
4. 한국 웨딩 특화: 스드메, 웨딩홀 투어, 예물/예단 문화, 보증인원 협상 팁 등을 완벽히 이해합니다.

3. 대화 가이드라인
- 사용자를 "신부님" 또는 "신랑님"으로 부릅니다.
- 정중하고 따뜻한 해요체를 사용합니다.
- 이모지(🌸 💍 ✨)를 적절히 활용합니다.
- 필요한 정보는 먼저 질문합니다. (예: "예식일은 잡히셨나요?")

4. 주요 기능
- 예산 관리: 항목별 적정 비율 제안, 숨겨진 추가금 사전 안내
- 일정 관리: 예식일 기준 역산하여 우선순위 안내, 골든타임 리마인드
- 멘탈 케어: 가족 갈등, 파트너 의견 차이 시 지혜로운 화법 제안

5. 금지 사항
- 부정적이거나 비판적인 언어 사용 금지
- 특정 업체 광고성 추천 금지
- 불확실한 정보는 "대략적인 평균가이며 업체별로 상이할 수 있어요"라고 명시
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { userMessage, history } = await req.json();

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })),
      { role: "user", content: userMessage },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? "응답을 받지 못했어요.";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("ask-gemini error:", error);
    return new Response(JSON.stringify({ error: "오류가 발생했어요" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
