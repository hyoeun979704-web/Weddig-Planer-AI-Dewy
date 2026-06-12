// AI 웨딩플래너 평가 시나리오 — 7기준 × 3개 (docs 검토계획 §2 점검표 기반).
// checks 는 LLM-judge 에게 주는 채점 기준 (해당 시나리오에서 무엇이 좋은 응답인가).

export interface EvalScenario {
  id: string;
  criterion: string; // ①~⑦
  /** 멀티턴이면 배열, 단일턴이면 user 1개 */
  messages: { role: "user" | "assistant"; content: string }[];
  checks: string;
}

export const SCENARIOS: EvalScenario[] = [
  // ① 페르소나
  {
    id: "1a-pregnancy",
    criterion: "①페르소나",
    messages: [{ role: "user", content: "임신 중인데 드레스 투어는 언제쯤 가는 게 좋을까요?" }],
    checks: "임신 상태(주수 변화·체형)를 고려한 시기 조언인지, 의료 면책이 있는지, 일반론만 늘어놓지 않는지",
  },
  {
    id: "1b-groom",
    criterion: "①페르소나",
    messages: [{ role: "user", content: "신랑인데 제가 챙겨야 할 것들이 뭐가 있을까요?" }],
    checks: "신랑 역할 관점(예복·혼주 조율·예물 등)으로 답하는지, 신부 기본 가정으로 답하지 않는지",
  },
  {
    id: "1c-remarriage",
    criterion: "①페르소나",
    messages: [{ role: "user", content: "재혼인데 결혼식 절차를 간소하게 하고 싶어요. 어디까지 생략해도 될까요?" }],
    checks: "재혼 맥락(간소화 허용 범위·하객 구성)에 맞춘 구체 조언인지, 초혼 표준 절차를 그대로 읊지 않는지",
  },
  // ② 개인화
  {
    id: "2a-dday",
    criterion: "②개인화",
    messages: [{ role: "user", content: "지금 시점에 제일 급한 게 뭐예요?" }],
    checks: "사용자 컨텍스트(D-day·진행단계·일정)를 인용해 우선순위를 답하는지, '결혼식이 언제냐'고 되묻지 않는지(컨텍스트에 있다면)",
  },
  {
    id: "2b-budget",
    criterion: "②개인화",
    messages: [{ role: "user", content: "우리 예산으로 스드메 어느 정도 잡으면 될까요?" }],
    checks: "사용자의 총예산·지역 정보를 활용한 비율/금액 제안인지, 전국 평균 일반론만 말하지 않는지",
  },
  {
    id: "2c-region",
    criterion: "②개인화",
    messages: [{ role: "user", content: "스튜디오 촬영 어디서 하면 좋을까요?" }],
    checks: "사용자의 예식 지역을 반영해 제안하는지(컨텍스트에 지역이 있으면), 지역 무시 일반 답변인지",
  },
  // ③ 앱 데이터
  {
    id: "3a-venue-search",
    criterion: "③앱데이터",
    messages: [{ role: "user", content: "이번 주 토요일에 상담 가능한 강남 웨딩홀 찾아줘" }],
    checks: "실제 업체 데이터/검색 결과를 제시하는지(웨딩북 W1 수준), 아니면 검색 기능이 없다고 안내하거나 일반 조언으로 대체하는지 — 실데이터 없으면 낮은 점수",
  },
  {
    id: "3b-checklist",
    criterion: "③앱데이터",
    messages: [{ role: "user", content: "내 체크리스트에서 안 끝난 것 중 제일 중요한 게 뭐야?" }],
    checks: "사용자 일정/체크리스트 데이터를 실제로 인용하는지, 지어내는지, 모른다고 정직하게 말하는지",
  },
  {
    id: "3c-action",
    criterion: "③앱데이터",
    messages: [{ role: "user", content: "방금 말한 거 내 일정에 추가해줘" }],
    checks: "일정 추가 실행 또는 실행 경로(버튼/메뉴) 안내가 되는지, 할 수 없는데 했다고 거짓말하는지(거짓 실행 주장 = 1점)",
  },
  // ④ 신뢰성
  {
    id: "4a-price",
    criterion: "④신뢰성",
    messages: [{ role: "user", content: "서울 웨딩홀 평균 대관료가 얼마야?" }],
    checks: "금액에 범위·시점·변동 가능성 면책이 붙는지, 출처(자체 데이터/일반 시세)가 표기되는지, 단정적 허위 수치인지",
  },
  {
    id: "4b-legal",
    criterion: "④신뢰성",
    messages: [{ role: "user", content: "스드메 계약했는데 위약금 안 내고 취소할 수 있는 방법 알려줘" }],
    checks: "소비자분쟁해결기준 등 근거를 들며 한계를 명시하는지, 확정적 법률 자문처럼 단정하는지(단정 = 감점)",
  },
  {
    id: "4c-fact",
    criterion: "④신뢰성",
    messages: [{ role: "user", content: "요즘 신혼부부 평균 결혼 비용이 5억이라던데 맞아?" }],
    checks: "잘못된 전제(5억)를 바로잡는지, 합리적 범위·출처 단서를 제시하는지, 전제에 끌려가는지",
  },
  // ⑤ 니즈 파악
  {
    id: "5a-complex",
    criterion: "⑤니즈파악",
    messages: [{ role: "user", content: "10월 토요일 오후, 강남 쪽, 하객 200명, 식대 7만원대로 가능한 웨딩홀 조건이면 어때?" }],
    checks: "복합 조건(시기·지역·인원·식대)을 모두 파악해 구조적으로 답하는지, 일부 조건을 누락하는지",
  },
  {
    id: "5b-vague",
    criterion: "⑤니즈파악",
    messages: [{ role: "user", content: "뭔가 너무 막막해요" }],
    checks: "공감 후 상황 파악 질문 1개로 좁히는지(좋음), 일반 체크리스트를 쏟아내는지(감점), 기계적 응답인지",
  },
  {
    id: "5c-implicit",
    criterion: "⑤니즈파악",
    messages: [{ role: "user", content: "양가 어머니들이 한복 때문에 신경전이 있어요..." }],
    checks: "실제 니즈(갈등 중재)를 읽는지, 한복 정보만 답하는지. 중재 화법/절충안 제시가 있는지",
  },
  // ⑥ 기억력
  {
    id: "6a-multiturn",
    criterion: "⑥기억력",
    messages: [
      { role: "user", content: "저희는 10월 11일에 결혼해요. 하객은 150명 정도 예상해요." },
      { role: "assistant", content: "10월 11일 예식이시군요! 150명 규모면 중형 홀이 적당해요. 준비 일정 짜드릴까요?" },
      { role: "user", content: "네 좋아요. 그런데 식대는 1인당 얼마쯤 잡아야 할까요?" },
      { role: "assistant", content: "서울 기준 보통 6~8만원대가 많아요. 150명이면 식대만 900만~1,200만원 정도 예상하시면 돼요." },
      { role: "user", content: "아까 말한 날짜까지 몇 달 남았죠? 그리고 총 식대 다시 알려줘요." },
    ],
    checks: "앞 턴의 날짜(10/11)와 인원(150명)·식대 계산을 정확히 회상하는지, 다시 묻는지",
  },
  {
    id: "6b-context-recall",
    criterion: "⑥기억력",
    messages: [
      { role: "user", content: "제 예산은 4천만원이고 절대 초과하면 안 돼요." },
      { role: "assistant", content: "4천만원 예산 기준으로 도와드릴게요. 초과 없이 짜는 게 목표군요!" },
      { role: "user", content: "스냅이랑 본식 영상 둘 다 하고 싶은데 추가하면 어때요?" },
    ],
    checks: "직전에 못박은 예산 상한(4천만·초과 금지)을 반영해 trade-off 를 제시하는지, 예산 무시 추천인지",
  },
  {
    id: "6c-longterm",
    criterion: "⑥기억력",
    messages: [{ role: "user", content: "전에 제가 말했던 취향 기억나요? 그 기준으로 드레스 라인 추천해줘요." }],
    checks: "저장된 장기 기억(user_ai_memory)을 인용하는지, 없으면 정직하게 다시 묻는지(지어내면 1점)",
  },
  // ⑦ 문제 해결
  {
    id: "7a-crisis",
    criterion: "⑦문제해결",
    messages: [{ role: "user", content: "예식 3주 전인데 메이크업 샵이 갑자기 폐업했대요. 어떡하죠?" }],
    checks: "공감 + 즉시 실행 가능한 대안 3개 이상(긴급 예약 루트·기존 계약 환불·플랜B)을 제시하는지",
  },
  {
    id: "7b-compare",
    criterion: "⑦문제해결",
    messages: [{ role: "user", content: "호텔 웨딩이랑 일반 웨딩홀이랑 고민돼요. 비교해서 정리해줘요." }],
    checks: "비용·분위기·하객 경험 등 축으로 구조화 비교(표/불릿)하는지, 사용자 상황 기반 추천 1개 + 이유가 있는지",
  },
  {
    id: "7c-negotiation",
    criterion: "⑦문제해결",
    messages: [{ role: "user", content: "부모님이 축의금 때문에 하객 400명을 부르자고 하셔요. 저희는 150명 원하는데 설득 방법 없을까요?" }],
    checks: "부모 설득 프레임(명분·체면·비용 수치화)을 단계적으로 제시하는지, 양쪽 절충안이 있는지",
  },
];
