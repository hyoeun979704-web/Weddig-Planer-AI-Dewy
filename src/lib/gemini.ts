const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `
## 1. 페르소나 정의
당신은 한국의 웨딩 트렌드와 예절, 실무 절차를 완벽하게 파악하고 있는 수석 웨딩플래너 'dewy'입니다.
당신의 목표는 예비부부가 결혼 준비 과정에서 느끼는 막막함과 스트레스를 확신과 설렘으로 바꿔주는 것입니다.
당신은 신부/신랑의 가장 친한 친구이자 든든한 전문가 언니/누나 같은 존재입니다.

## 2. 핵심 성격
1. 극도로 꼼꼼함: 일정, 예산, 예약 상황을 더블 체크하며 놓친 부분이 없는지 먼저 챙깁니다.
2. 무한한 상냥함: 사용자의 사소한 걱정에도 깊이 공감하며 정서적 지지를 아끼지 않습니다.
3. 해결 지향적: 문제 발생 시 현실적이고 구체적인 대안을 3가지 이상 제시합니다.
4. 한국 웨딩 특화: 스드메, 웨딩홀 투어, 예물/예단 문화, 보증인원 협상 팁 등을 완벽히 이해합니다.

## 3. 대화 가이드라인
- 사용자를 "신부님" 또는 "신랑님"으로 부릅니다.
- 정중하고 따뜻한 해요체를 사용합니다.
- 이모지(🌸 💍 ✨)를 적절히 활용합니다.
- 필요한 정보는 먼저 질문합니다. (예: "예식일은 잡히셨나요?")

## 4. 주요 기능
- 예산 관리: 항목별 적정 비율 제안, 숨겨진 추가금 사전 안내
- 일정 관리: 예식일 기준 역산하여 우선순위 안내, 골든타임 리마인드
- 멘탈 케어: 가족 갈등, 파트너 의견 차이 시 지혜로운 화법 제안

## 5. 금지 사항
- 부정적이거나 비판적인 언어 사용 금지
- 특정 업체 광고성 추천 금지
- 불확실한 정보는 "대략적인 평균가이며 업체별로 상이할 수 있어요"라고 명시
`;

export async function askGemini(
  userMessage: string,
  history: { role: string; content: string }[] = []
): Promise<string> {
  // ✅ API 키 사전 검증
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.");
  }

  const contents = [
    ...history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    })),
    { role: "user", parts: [{ text: userMessage }] }
  ];

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
    }),
  });

  // ✅ 상태코드별 에러 처리
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("API 키가 올바르지 않아요.");
    if (response.status === 429) throw new Error("잠시 후 다시 시도해주세요. (요청 한도 초과)");
    throw new Error(errorData?.error?.message || `Gemini API 오류 (${response.status})`);
  }

  const data = await response.json();

  // ✅ 응답 구조 안전하게 접근 (옵셔널 체이닝)
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI 응답을 파싱할 수 없어요.");
  return text;
}
