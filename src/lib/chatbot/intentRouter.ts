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
  | "favorites"
  | "favorites_by_type"
  | "favorites_search"
  | "cart"
  | "region"
  | "hearts"
  | "points"
  | "wedding_info"
  | "service_intro"
  | "pricing"
  | "contact"
  // ── Phase e: 사용자 데이터·이력 확장 ──
  | "orders"
  | "payments"
  | "my_posts"
  | "my_comments"
  | "ai_usage"
  | "deal_claims"
  | "couple_status"
  | "diary"
  | "votes"
  | "subscription_status"
  | "dress_fitting_history"
  | "heart_history"
  | "activity_summary"
  | "this_week"
  | null;

export interface IntentMatch {
  intent: ChatIntent;
  /** 즉답 가능 시 텍스트 */
  staticReply?: string;
  /** DB 조회 필요 시 핸들러 키 */
  dbHandler?:
    | "dday"
    | "budget"
    | "schedule_today"
    | "schedule_upcoming"
    | "checklist"
    | "favorites"
    | "favorites_by_type"
    | "favorites_search"
    | "cart"
    | "region"
    | "hearts"
    | "points"
    | "wedding_info"
    | "orders"
    | "payments"
    | "my_posts"
    | "my_comments"
    | "ai_usage"
    | "deal_claims"
    | "couple_status"
    | "diary"
    | "votes"
    | "subscription_status"
    | "dress_fitting_history"
    | "heart_history"
    | "activity_summary"
    | "this_week";
  /** 매칭된 키워드 (디버깅·로그용) */
  matchedKeyword?: string;
  /** 동적으로 추출된 인자 (검색 키워드·종류 등) */
  args?: {
    keyword?: string;
    itemType?: string;
  };
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

  // ── 찜 목록 (전체 카테고리 분포) ────────────────
  {
    intent: "favorites",
    patterns: [
      /^찜\s*(목록|한)?\s*[?!]?$/,
      /^즐겨\s*찾기\s*[?!]?$/,
      /북마크\s*(목록)?\s*[?!]?$/,
    ],
    dbHandler: "favorites",
  },

  // ── 장바구니 ───────────────────────────────────
  {
    intent: "cart",
    patterns: [
      /장바구니/,
      /담은\s*상품|담아둔/,
      /구매\s*예정/,
      /카트/,
    ],
    dbHandler: "cart",
  },

  // ── 지역 정보 ──────────────────────────────────
  {
    intent: "region",
    patterns: [
      /내\s*지역|결혼\s*지역|예식\s*지역/,
      /어디서\s*결혼/,
      /지역.*(어디|뭐)/,
      /근처.*식장/,
    ],
    dbHandler: "region",
  },

  // ── 하트 잔액 (AI Studio) ──────────────────────
  {
    intent: "hearts",
    patterns: [
      /하트\s*(잔액|얼마|남|있)/,
      /토큰\s*(잔액|얼마|남|있)/,
      /AI\s*Studio.*(잔|남|얼마)/i,
      /드레스.*피팅.*몇/,
    ],
    dbHandler: "hearts",
  },

  // ── 포인트 ─────────────────────────────────────
  {
    intent: "points",
    patterns: [
      /포인트\s*(잔액|얼마|남|있|확인)/,
      /적립.*얼마|적립.*확인/,
    ],
    dbHandler: "points",
  },

  // ── 결혼 정보 종합 ─────────────────────────────
  {
    intent: "wedding_info",
    patterns: [
      /내\s*(결혼|웨딩)\s*정보/,
      /결혼\s*정보\s*(보여|확인|알려)/,
      /내\s*예식|내\s*프로필/,
      /파트너.*누구|배우자.*누구/,
    ],
    dbHandler: "wedding_info",
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

  // ════════════════════════════════════════════════════════════
  // Phase e — 사용자 데이터·이력 확장 인텐트
  // ════════════════════════════════════════════════════════════

  // ── 주문·결제 ──────────────────────────────────
  { intent: "orders", patterns: [/주문\s*(내역|보여|뭐)/, /구매\s*(내역|이력)/, /내가.*산\s*거/], dbHandler: "orders" },
  { intent: "payments", patterns: [/결제\s*(내역|이력|기록)/, /최근\s*결제/, /결제한\s*거/], dbHandler: "payments" },

  // ── 커뮤니티 활동 ──────────────────────────────
  { intent: "my_posts", patterns: [/내가\s*쓴\s*(글|게시글|포스트)/, /내\s*글/, /내\s*게시글/], dbHandler: "my_posts" },
  { intent: "my_comments", patterns: [/내가\s*쓴\s*댓글/, /내\s*댓글/], dbHandler: "my_comments" },

  // ── AI 사용량 ──────────────────────────────────
  {
    intent: "ai_usage",
    patterns: [/AI.*몇\s*번/i, /챗봇.*몇\s*번/, /(AI|챗봇)\s*사용\s*(량|횟수|기록)/, /오늘.*몇\s*(번|회)/],
    dbHandler: "ai_usage",
  },

  // ── 받은 특가/쿠폰 ─────────────────────────────
  {
    intent: "deal_claims",
    patterns: [/받은\s*(특가|쿠폰|혜택|딜)/, /내\s*(쿠폰|특가|혜택)/, /클레임/],
    dbHandler: "deal_claims",
  },

  // ── 커플 연동 상태 ─────────────────────────────
  {
    intent: "couple_status",
    patterns: [/파트너.*(연결|연동|상태)/, /커플\s*연동/, /초대\s*코드/, /(애인|배우자|남편|아내).*연결/],
    dbHandler: "couple_status",
  },

  // ── 다이어리 ───────────────────────────────────
  {
    intent: "diary",
    patterns: [/다이어리/, /일기.*몇/, /(최근|오늘).*일기/],
    dbHandler: "diary",
  },

  // ── 투표 ───────────────────────────────────────
  {
    intent: "votes",
    patterns: [/투표.*(진행|상황|결과|미정|남)/, /결정.*못한.*거/, /커플\s*투표/, /진행.*중.*투표/],
    dbHandler: "votes",
  },

  // ── 구독 상태 ──────────────────────────────────
  {
    intent: "subscription_status",
    patterns: [/구독\s*(상태|확인|만료)/, /Premium\s*(상태|언제|만료)/i, /프리미엄\s*(상태|언제)/],
    dbHandler: "subscription_status",
  },

  // ── 드레스 피팅 기록 ───────────────────────────
  {
    intent: "dress_fitting_history",
    patterns: [/드레스\s*(피팅|갤러리)\s*(기록|이력|몇)/, /피팅\s*몇\s*장/, /내\s*드레스/, /드레스\s*투어\s*(기록|이력)/],
    dbHandler: "dress_fitting_history",
  },

  // ── 하트 거래 이력 ─────────────────────────────
  {
    intent: "heart_history",
    patterns: [/하트\s*(이력|거래|내역|어디|쓴)/, /하트\s*충전\s*(이력|기록)/],
    dbHandler: "heart_history",
  },

  // ── 활동 종합 요약 ─────────────────────────────
  {
    intent: "activity_summary",
    patterns: [/내\s*활동\s*(요약|보여|확인|전체|모두)/, /활동\s*요약/, /현황\s*(보여|알려)/, /지금\s*상태/, /대시보드/],
    dbHandler: "activity_summary",
  },

  // ── 이번 주 활동 ───────────────────────────────
  {
    intent: "this_week",
    patterns: [/이번\s*주.*활동/, /이번\s*주.*뭐/, /최근\s*7일/, /주간\s*요약/],
    dbHandler: "this_week",
  },
];

/**
 * 사용자 메시지에서 의도를 매칭한다.
 * 1) 정적 패턴 매칭
 * 2) 동적 매칭 (찜 검색·키워드 추출)
 * 매칭 실패 시 null 반환 → 기존 LLM 호출 흐름으로 fallback.
 */
export const matchIntent = (message: string): IntentMatch | null => {
  const trimmed = message.trim();
  if (!trimmed) return null;

  // 1) 정적 패턴 매칭
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

  // 2) 동적 매칭 — 찜 검색·종류별 찜
  const dynamic = matchDynamicIntents(trimmed);
  if (dynamic) return dynamic;

  return null;
};

// ════════════════════════════════════════════════════════════
// 동적 매칭 — 찜 + 키워드/종류
// ════════════════════════════════════════════════════════════

const FAVORITE_VERBS = /(찜|즐겨\s*찾기|북마크|좋아요)/;

/** 사용자 자연어에서 카테고리 키워드 → item_type 추론 */
const inferItemType = (text: string): string | "any" => {
  const lower = text.toLowerCase();
  if (/영상|비디오|video|유튜브|youtube|채널/.test(lower)) return "tip_video";
  if (/식장|웨딩홀|스튜디오|드레스샵|메이크업|한복|예복|신혼여행|예물|업체|샵/.test(lower)) return "place";
  if (/상품|제품|쇼핑/.test(lower)) return "product";
  if (/특가|할인|쿠폰|딜/.test(lower)) return "deal";
  if (/게시글|커뮤니티|후기/.test(lower)) return "community_post";
  return "any";
};

// 키워드 추출 시 제거할 stop-words (찜·동사·조사·종류)
const STOP_WORDS = new Set([
  "찜", "찜한", "찜에서", "즐겨찾기", "즐겨", "찾기", "북마크", "좋아요", "목록",
  "보여줘", "보여", "알려줘", "알려", "찾아줘", "찾아", "추천", "추천하던",
  "뭐", "뭐야", "뭐더라", "어떤", "있어", "있는", "있던", "있음",
  "는", "은", "이", "가", "을", "를", "에서", "에", "중에", "중에서", "한", "하던", "하는",
  "영상", "비디오", "유튜브", "채널",
  "식장", "웨딩홀", "스튜디오", "드레스샵", "메이크업샵", "한복샵", "예복샵",
  "메이크업", "한복", "예복", "신혼여행", "예물", "업체", "샵", "상품", "제품",
  "쇼핑", "특가", "할인", "쿠폰", "딜", "게시글", "커뮤니티", "후기",
]);

const extractKeyword = (text: string): string | null => {
  const tokens = text
    .replace(/[?!.,]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !STOP_WORDS.has(t));
  if (tokens.length === 0) return null;
  // 숫자만이면 의미 없음
  if (tokens.every((t) => /^\d+$/.test(t))) return null;
  return tokens.join(" ").trim();
};

const matchDynamicIntents = (text: string): IntentMatch | null => {
  // 찜 관련 동사가 포함된 경우만 동적 매칭
  if (!FAVORITE_VERBS.test(text)) return null;

  const itemType = inferItemType(text);
  const keyword = extractKeyword(text);

  // 키워드 + 종류 또는 키워드만 → 검색
  if (keyword) {
    return {
      intent: "favorites_search",
      dbHandler: "favorites_search",
      matchedKeyword: "favorites_search:dynamic",
      args: {
        keyword,
        itemType: itemType !== "any" ? itemType : undefined,
      },
    };
  }

  // 종류만 명시 (예: "찜한 영상", "찜한 식장")
  if (itemType !== "any") {
    return {
      intent: "favorites_by_type",
      dbHandler: "favorites_by_type",
      matchedKeyword: "favorites_by_type:dynamic",
      args: { itemType },
    };
  }

  // "찜" 만 단독 — 정적 PATTERNS의 favorites가 안 매칭된 경우 (드물지만 안전망)
  return null;
};
