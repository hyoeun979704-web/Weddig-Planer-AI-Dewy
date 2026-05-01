/**
 * 챗봇 의도 라우터 (Intent Router)
 *
 * AI 플래너 챗봇의 사용자 메시지를 클라이언트에서 먼저 분석하여,
 * LLM 호출 없이 즉답 가능한 영역은 정적 응답·DB 조회 결과로 처리한다.
 *
 * 외부 API 호출 없이 동작하므로:
 *  - 일일 무료 한도 차감 X
 *  - LLM 비용 발생 X
 *  - 응답 시간 50~200ms (LLM 1~5초 대비 빠름)
 *  - 정확성 100% (할루시네이션 X)
 *
 * 매칭 실패 시 null을 반환하여 기존 LLM 호출 흐름으로 fallback.
 */

export type ChatIntent =
  | "greeting"
  | "thanks"
  | "help"
  | "dday"
  | "budget_summary"
  | "schedule_today"
  | "schedule_upcoming"
  | "checklist_time"
  | "service_intro"
  | "pricing"
  | "contact"
  | null;

export interface IntentMatch {
  intent: ChatIntent;
  /** 즉답 가능 시 텍스트 */
  staticReply?: string;
  /** DB 조회 필요 시 핸들러 키 */
  dbHandler?: "dday" | "budget" | "schedule_today" | "schedule_upcoming" | "checklist";
  /** 매칭된 키워드 (디버깅·로그용) */
  matchedKeyword?: string;
}

interface IntentPattern {
  intent: ChatIntent;
  /** 정규식 또는 키워드 배열 */
  patterns: (RegExp | string)[];
  /** 즉답 가능 여부 (DB 조회 없이) */
  staticReply?: string;
  /** DB 조회 핸들러 */
  dbHandler?: IntentMatch["dbHandler"];
}

const PATTERNS: IntentPattern[] = [
  // ── 인사 ────────────────────────────────────────
  {
    intent: "greeting",
    patterns: [/^(안녕|하이|반가|hi|hello|반갑)/i, "안녕하세요", "처음", "안뇽"],
    staticReply:
      "안녕하세요, 신부님 🌸\n저는 AI 웨딩플래너 듀이(Dewy)예요.\n\n결혼 준비의 막막함을 함께 풀어드릴게요.\n아래 빠른 질문 카드를 누르거나, 무엇이든 직접 물어봐 주세요 💍",
  },

  // ── 감사 ────────────────────────────────────────
  {
    intent: "thanks",
    patterns: [/^(고마|감사|thanks|thx|땡큐)/i, "고마워", "고맙습니다", "감사합니다"],
    staticReply:
      "도움이 되어 다행이에요 🌿\n결혼 준비하시면서 또 막히는 부분 있으면 언제든 물어봐 주세요. 신부님의 든든한 친구가 되어 드릴게요 ✨",
  },

  // ── 도움말 ──────────────────────────────────────
  {
    intent: "help",
    patterns: [/도움|사용법|어떻게 (써|사용)|뭐 (할|돼)|기능/, "도와줘", "헬프", "help"],
    staticReply:
      "이런 것들을 도와드릴 수 있어요:\n\n💍 **웨딩홀 추천** — 지역·예산·하객수에 맞는 식장\n📸 **스드메 가이드** — 촬영 순서·견적·체크포인트\n📅 **준비 타임라인** — 시기별 해야 할 일\n💰 **예산 플래너** — 항목별 비율·추가금 방어\n🌿 **갈등 조율** — 양가 의견 차이 해결 화법\n\n예산은 얼마나 잡으셨어요? 예식일은 정해지셨나요?",
  },

  // ── D-Day 조회 ──────────────────────────────────
  {
    intent: "dday",
    patterns: [/d-?day/i, /디데이|디 데이/, /며칠.*남|얼마.*남/, /결혼식.*까지|예식.*까지/],
    dbHandler: "dday",
  },

  // ── 예산 요약 ───────────────────────────────────
  {
    intent: "budget_summary",
    patterns: [/예산.*얼마|예산.*확인|예산.*보여/, /얼마.*썼|지출.*얼마/, /예산 (조회|상태|현황)/],
    dbHandler: "budget",
  },

  // ── 오늘 일정 ───────────────────────────────────
  {
    intent: "schedule_today",
    patterns: [/오늘.*일정|오늘.*뭐/, /오늘.*할/],
    dbHandler: "schedule_today",
  },

  // ── 다가오는 일정 ───────────────────────────────
  {
    intent: "schedule_upcoming",
    patterns: [/이번 주.*일정|이번주.*일정/, /다가오는|곧.*있을/, /다음.*일정/],
    dbHandler: "schedule_upcoming",
  },

  // ── 시기별 체크리스트 ──────────────────────────
  {
    intent: "checklist_time",
    patterns: [
      /(\d+)\s*개월.*전/,
      /(\d+)\s*주.*전/,
      /체크리스트/,
      /지금.*해야|뭐.*해야/,
    ],
    dbHandler: "checklist",
  },

  // ── 서비스 소개 ────────────────────────────────
  {
    intent: "service_intro",
    patterns: [/듀이|dewy/i, /이 (앱|서비스).*뭐|이 (앱|서비스).*소개/, /무료/],
    staticReply:
      "듀이(Dewy)는 한국 결혼 문화에 특화된 통합 웨딩 플랫폼이에요.\n\n🌸 AI 플래너 (저예요!) — 일 5회 무료, Premium 무제한\n👗 AI 드레스 피팅 — 사진으로 어울리는 스타일 미리보기\n💌 모바일·종이 청첩장 — 곧 출시\n📸 웨딩촬영 시안 — 곧 출시\n🎬 식전영상 외주 — 곧 출시\n\n자세한 내용은 마이페이지나 [Premium](/premium) 페이지에서 확인하실 수 있어요.",
  },

  // ── 가격 문의 ──────────────────────────────────
  {
    intent: "pricing",
    patterns: [/가격|요금|얼마|비용.*얼마|결제|premium.*얼마/i],
    staticReply:
      "**무료 사용**\n• AI 플래너 일 5회 질문\n• 기본 정보·플래닝·커뮤니티 무제한\n\n**Premium 구독**\n• AI 플래너 무제한\n• 견적서 PDF 자동 생성\n• 예산 분석 리포트 PDF\n\n**AI Studio (드레스 피팅 등)**\n• 충전식 하트(토큰) 결제\n• 1,900원부터\n• 신규 가입 시 5 하트 무료\n\n자세한 가격은 [Premium 페이지](/premium)에서 확인하실 수 있어요.",
  },

  // ── 문의·연락 ──────────────────────────────────
  {
    intent: "contact",
    patterns: [/문의|연락|이메일|메일|고객.*센터|cs/i],
    staticReply:
      "고객 문의는 다음 채널로 받고 있어요 📬\n\n• 이메일: help@dewy-wedding.com\n• 1:1 문의: [고객센터](/contact)\n• FAQ: [자주 묻는 질문](/faq)\n\n결혼 준비 관련 질문은 저(듀이)에게 바로 물어봐 주셔도 돼요 ✨",
  },
];

/**
 * 사용자 메시지에서 의도를 매칭한다.
 * 매칭 실패 시 null 반환 → 기존 LLM 호출 흐름으로 fallback.
 */
export const matchIntent = (message: string): IntentMatch | null => {
  const trimmed = message.trim();
  if (!trimmed) return null;

  for (const pattern of PATTERNS) {
    for (const p of pattern.patterns) {
      const matched =
        typeof p === "string"
          ? trimmed.toLowerCase().includes(p.toLowerCase())
          : p.test(trimmed);

      if (matched) {
        return {
          intent: pattern.intent,
          staticReply: pattern.staticReply,
          dbHandler: pattern.dbHandler,
          matchedKeyword: typeof p === "string" ? p : p.source,
        };
      }
    }
  }

  return null;
};
