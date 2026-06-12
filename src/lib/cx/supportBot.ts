// CX 고객센터 챗봇의 룰 기반 두뇌 — LLM 미사용(0원·0환각, CX 는 정확성 우선).
// 1) 문제 해결 가이드(트러블슈팅) 의도 매칭 → 2) FAQ 키워드 스코어링 폴백.
// 어디서도 답을 못 찾으면 null → UI 가 담당자 연결(에스컬레이션)을 제안한다.
import { faqs } from "@/data/faqs";

export interface SupportAnswer {
  text: string;
  /** 매칭 출처 — 로깅·튜닝용 */
  source: "guide" | "faq";
}

interface Guide {
  patterns: RegExp[];
  answer: string;
}

// 트러블슈팅 가이드 — 오류·결제·로그인 등 "문제 상황" 우선 대응.
// FAQ 보다 먼저 매칭한다(문제 호소는 기능 설명보다 해결 단계가 정답).
const GUIDES: Guide[] = [
  // 주의: 구체적 가이드(결제·로그인 등)를 먼저 두고 광범위한 오류 가이드는
  // 마지막에 — "결제가 안 돼요"가 일반 오류 패턴(안 돼)에 가로채이지 않게.
  {
    patterns: [/(로그인|로그아웃|세션|인증).*(안|불가|만료|실패|문제)/, /(가입|회원가입).*(안|불가|실패)/],
    answer: [
      "로그인 문제는 이렇게 해보세요:",
      "",
      "1. 구글/카카오 중 **가입했던 계정**으로 시도했는지 확인",
      "2. 브라우저 쿠키/캐시 삭제 후 재시도",
      "3. 다른 브라우저(크롬 권장)에서 시도",
      "",
      "계속 안 되면 \"해결 안 됐어요\"를 눌러주세요 — 계정 상태를 직접 확인해 드릴게요.",
    ].join("\n"),
  },
  {
    patterns: [/(결제|구독|충전).*(안|실패|오류|문제|중복|두\s*번)/, /돈.*(나갔|빠져)/],
    answer: [
      "결제 문제는 꼭 도와드릴게요 💳",
      "",
      "- **결제했는데 반영이 안 됐다면**: 5분 정도 후 앱을 재실행해 보세요(승인 지연).",
      "- **중복 결제가 의심되면**: 카드사 승인 내역과 [구독 관리](/premium) 화면을 비교해 보세요.",
      "- **인앱결제 환불**: 결제하신 스토어(Google Play 등) 정책에 따라 처리돼요.",
      "",
      "해결이 안 되면 \"해결 안 됐어요\"를 눌러주세요. 결제 이력을 확인해 바로 처리해 드릴게요.",
    ].join("\n"),
  },
  {
    patterns: [/(환불|취소).*(어떻|방법|하고|해줘|원해|받)/],
    answer: [
      "환불·취소 안내드려요:",
      "",
      "- 프리미엄 구독·인앱결제는 결제하신 **스토어(Google Play 등) 정책**에 따라 처리됩니다.",
      "- 하트 충전 등 앱 내 결제 관련 환불은 담당자 확인이 필요해요.",
      "",
      "구체적인 건이 있으시면 \"해결 안 됐어요\"를 눌러 접수해 주세요 — 결제 내역 확인 후 안내드릴게요.",
    ].join("\n"),
  },
  {
    patterns: [/(사진|이미지|업로드).*(안|실패|오류)/],
    answer: [
      "사진 업로드가 안 될 때는:",
      "",
      "1. 파일 크기가 너무 크지 않은지 확인 (10MB 이하 권장)",
      "2. JPG/PNG 형식인지 확인",
      "3. 네트워크가 불안정하면 Wi-Fi 로 전환 후 재시도",
      "",
      "반복되면 \"해결 안 됐어요\"로 알려주세요.",
    ].join("\n"),
  },
  {
    patterns: [/(개인정보|데이터).*(삭제|지워|탈퇴)/, /탈퇴/],
    answer: [
      "탈퇴·데이터 삭제 안내드려요:",
      "",
      "- 탈퇴는 **설정 → 계정**에서 가능해요.",
      "- 탈퇴 시 개인정보는 법령상 보관 의무 항목을 제외하고 지체 없이 삭제됩니다.",
      "- AI 시뮬레이션에 올린 사진은 30일 내 자동 삭제돼요.",
      "",
      "처리가 안 된 데이터가 보이면 \"해결 안 됐어요\"로 알려주세요.",
    ].join("\n"),
  },
  {
    patterns: [/(오류|에러|버그|안\s*(돼|되|열려|눌려)|먹통|멈|튕|깨져|하얀\s*화면|빈\s*화면)/],
    answer: [
      "불편을 드려 죄송해요 🙏 화면 오류는 대부분 아래 순서로 해결돼요:",
      "",
      "1. **새로고침** (앱이면 완전히 종료 후 재실행)",
      "2. 네트워크 연결 확인 (Wi-Fi ↔ 데이터 전환)",
      "3. 로그아웃 후 다시 로그인",
      "4. 브라우저/앱을 최신 버전으로 업데이트",
      "",
      "그래도 같은 문제가 반복되면 아래 \"해결 안 됐어요\"를 눌러주세요. 담당자가 직접 확인해 드릴게요.",
    ].join("\n"),
  },
];

// 한국어 토큰화(거친 버전) — 2글자 이상 어절만. FAQ 스코어링용.
const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^가-힣a-z0-9]+/)
    .filter((t) => t.length >= 2);

/** FAQ 키워드 스코어링 — 질문 일치 가중(×2) + 답변 일치. */
const matchFaq = (text: string): string | null => {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;
  let best: { score: number; answer: string; question: string } | null = null;
  for (const f of faqs) {
    const q = f.question.toLowerCase();
    const a = f.answer.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (q.includes(t)) score += 2;
      else if (a.includes(t)) score += 1;
    }
    if (score > (best?.score ?? 0)) best = { score, answer: f.answer, question: f.question };
  }
  // 임계값: 토큰이 거의 안 겹치는 우연 매칭(1점)은 버린다.
  if (!best || best.score < 3) return null;
  return `**${best.question}**\n\n${best.answer}`;
};

/**
 * CX 챗봇 응답 — 트러블슈팅 가이드 우선, 없으면 FAQ.
 * null 이면 자동 답변 불가 → 담당자 연결로 에스컬레이션.
 */
export function answerSupportQuery(text: string): SupportAnswer | null {
  for (const g of GUIDES) {
    if (g.patterns.some((p) => p.test(text))) return { text: g.answer, source: "guide" };
  }
  const faq = matchFaq(text);
  if (faq) return { text: faq, source: "faq" };
  return null;
}

/** 에스컬레이션 접수 본문 — 대화 전사 + 발생 컨텍스트(운영자 확인용). */
export function buildEscalationContent(
  transcript: Array<{ role: "user" | "assistant"; content: string }>,
  context?: string | null,
): string {
  const lines = transcript.map((m) => `${m.role === "user" ? "사용자" : "듀이봇"}: ${m.content}`);
  return [
    "[고객센터 챗봇 에스컬레이션 — 자동 접수]",
    context ? `발생 위치/컨텍스트: ${context}` : null,
    "",
    "── 대화 내용 ──",
    ...lines,
  ].filter((l): l is string => l !== null).join("\n").slice(0, 4000);
}

/** 에스컬레이션 제목 — 첫 사용자 메시지에서 유도. */
export function deriveEscalationTitle(transcript: Array<{ role: string; content: string }>): string {
  const first = transcript.find((m) => m.role === "user")?.content ?? "";
  const collapsed = first.replace(/\s+/g, " ").trim();
  if (!collapsed) return "고객센터 챗봇 문의";
  return collapsed.length > 40 ? `${collapsed.slice(0, 40)}…` : collapsed;
}
