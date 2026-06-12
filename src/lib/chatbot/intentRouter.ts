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
  /** 정적 가이드 핸들러 키 (staticGuideHandlers의 GuideKey) */
  guideKey?:
    | "sdme_timing"
    | "invitation_timing"
    | "makeup_trial"
    | "honeymoon_timing"
    | "contract_check"
    | "etiquette"
    | "gift_etiquette"
    | "new_home"
    | "ceremony_progress"
    | "fitting"
    | "snap"
    | "invitation_design"
    | "ceremony_rehearsal"
    | "parents_attire";
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
    | "this_week"
    | "budget_diagnosis"
    | "schedule_diagnosis"
    | "contract_progress"
    | "checklist_progress"
    | "free_search"
    | "average_price"
    | "popular_places"
    | "venue_compare"
    | "web_search";
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
  /** 정적 가이드 핸들러 키 */
  guideKey?: IntentMatch["guideKey"];
}

const PATTERNS: IntentPattern[] = [
  // ── 인사 ────────────────────────────────────────
  {
    intent: "greeting",
    patterns: [/^(안녕|하이|반가|hi|hello|반갑)/i, "안녕하세요", "처음", "안뇽"],
    staticReply:
      "안녕하세요, 신부님 \n저는 AI 웨딩플래너 듀이(Dewy)예요.\n\n결혼 준비의 막막함을 함께 풀어드릴게요.\n아래 빠른 질문 카드를 누르거나, 무엇이든 직접 물어봐 주세요 ",
  },

  // ── 감사 ────────────────────────────────────────
  {
    intent: "thanks",
    patterns: [/^(고마|감사|thanks|thx|땡큐)/i, "고마워", "고맙습니다", "감사합니다"],
    staticReply:
      "도움이 되어 다행이에요 \n결혼 준비하시면서 또 막히는 부분 있으면 언제든 물어봐 주세요. 신부님의 든든한 친구가 되어 드릴게요 ",
  },

  // ── 도움말 ──────────────────────────────────────
  {
    intent: "help",
    patterns: [/도움|사용법|어떻게 (써|사용)|뭐 (할|돼)|기능/, "도와줘", "헬프", "help"],
    staticReply:
      "이런 것들을 도와드릴 수 있어요:\n\n **웨딩홀 추천** — 지역·예산·하객수에 맞는 식장\n **스드메 가이드** — 촬영 순서·견적·체크포인트\n **준비 타임라인** — 시기별 해야 할 일\n **예산 플래너** — 항목별 비율·추가금 방어\n **갈등 조율** — 양가 의견 차이 해결 화법\n\n예산은 얼마나 잡으셨어요? 예식일은 정해지셨나요?",
  },

  // ── D-Day 조회 ──────────────────────────────────
  // "얼마.*남" 단독은 너무 광범위 ("예산 얼마 남았어", "포인트 얼마 남았어"가
  // 모두 dday로 잘못 라우팅되던 버그). 결혼/예식 컨텍스트가 있을 때만 매칭.
  {
    intent: "dday",
    patterns: [
      /d-?day/i,
      /디데이|디 데이/,
      /(결혼|결혼식|예식)\s*(까지)?\s*(며칠|얼마)\s*(나|남)/,
      /(며칠|얼마)\s*(나)?\s*남았.*(결혼|예식)/,
      /결혼식.*까지|예식.*까지/,
    ],
    dbHandler: "dday",
  },

  // ── 예산 요약 ───────────────────────────────────
  // 자연어 변형 확대(DB 즉답 디테일화): "남은 예산", "예산 얼마 더", "예산 부족"
  // 등도 LLM 폴백 대신 실데이터 즉답으로. 단, "평균/시세"는 average_price 로 가야
  // 하므로 여기서 잡지 않는다(아래 average_price 가 먼저 매칭되도록 순서 유지).
  {
    intent: "budget_summary",
    patterns: [
      /예산.*얼마|예산.*확인|예산.*보여|예산.*어때|예산.*괜찮/,
      /얼마.*썼|지출.*얼마|얼마.*남았.*예산|예산.*남았/,
      /예산 (조회|상태|현황)|남은 예산|예산 부족|예산 초과/,
    ],
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
  // /체크리스트/ 단독은 너무 광범위 — "체크리스트 진척률"이 checklist_progress
  // 대신 여기로 빠지던 버그. 시기·생성 의도가 있을 때만 매칭.
  {
    intent: "checklist_time",
    patterns: [
      /(\d+)\s*개월.*전/,
      /(\d+)\s*주.*전/,
      /체크리스트.*(만들|짜|언제|시기|시점|줘|보여|알려)/,
      /지금.*해야|뭐.*해야/,
    ],
    dbHandler: "checklist",
  },

  // ── 찜 목록 (전체 카테고리 분포) ────────────────
  // 자연 표현("찜 보여줘", "찜한 거 알려줘")도 잡히도록 패턴 완화.
  // 카테고리 키워드가 함께 있으면 아래 동적 매칭에서 favorites_by_type/search로
  // 더 구체적으로 라우팅됨.
  {
    intent: "favorites",
    patterns: [
      /^찜\s*(목록|한)?\s*[?!]?$/,
      /^즐겨\s*찾기\s*[?!]?$/,
      /북마크\s*(목록)?\s*[?!]?$/,
      /찜\s*(목록|보여|알려|확인|뭐|어떤)/,
      /찜한\s*(거|것|업체|곳)\s*(보여|알려|뭐|확인|어떤)/,
      /즐겨\s*찾기\s*(보여|알려|확인|뭐|어떤)/,
      /북마크\s*(보여|알려|확인|어떤)/,
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
  // 의도적으로 broad — "듀이", "무료" 같은 단어가 들어가면 LLM 호출 없이
  // 가이드성 정적 응답으로 빠르게 응대. false positive(예: "듀이야 도와줘")가
  // 발생해도 가이드 응답이 사용자에게 다음 질문을 더 구체적으로 하도록 유도.
  {
    intent: "service_intro",
    patterns: [/듀이|dewy/i, /이 (앱|서비스).*뭐|이 (앱|서비스).*소개/, /무료/],
    staticReply:
      "듀이(Dewy)는 한국 결혼 문화에 특화된 통합 웨딩 플랫폼이에요.\n\n AI 플래너 (저예요!) — 일 5회 무료, Premium 무제한\n AI 드레스 피팅 — 사진으로 어울리는 스타일 미리보기\n 모바일·종이 청첩장 — 곧 출시\n 웨딩촬영 시안 — 곧 출시\n 식전영상 외주 — 곧 출시\n\n자세한 내용은 마이페이지나 [Premium](/premium) 페이지에서 확인하실 수 있어요.",
  },

  // ── 가격 문의 ──────────────────────────────────
  // 단어 "얼마" 단독은 결혼 도메인 핵심 어휘("식대 얼마", "예물 얼마" 등)라
  // 오트리거 시 핵심 질문을 막아버려서 의도적으로 좁힘. 구독·결제·요금제
  // 맥락에서만 정적 응답.
  {
    intent: "pricing",
    patterns: [
      /(구독|premium|프리미엄).*(가격|요금|얼마|비용|결제|업그레이드)/i,
      /(요금제|월정액|월 ?구독료|연간\s*구독)/,
      /(premium|프리미엄)\s*(가격|얼마|비용)/i,
      /(결제\s*방식|결제\s*수단|환불|구독\s*취소)/,
    ],
    staticReply:
      "**무료 사용**\n• AI 플래너 일 5회 질문\n• 기본 정보·플래닝·커뮤니티 무제한\n• 가입 시 1,000P 적립 (≈ 200원 상당)\n\n**Premium 구독**\n• AI 플래너 무제한\n• 견적서 PDF 자동 생성\n• 예산 분석 리포트 PDF\n• 월간 10하트 / 연간 180하트 보너스 (초기 이용자 한정)\n\n**AI Studio (드레스 피팅 등)**\n• 충전식 하트(토큰) 결제\n• 1,900원부터\n\n자세한 가격은 [Premium 페이지](/premium)에서 확인하실 수 있어요.",
  },

  // ── 문의·연락 ──────────────────────────────────
  {
    intent: "contact",
    patterns: [/문의|연락|이메일|메일|고객.*센터|cs/i],
    staticReply:
      "고객 문의는 다음 채널로 받고 있어요 \n\n• 이메일: kheceo@dewy-wedding.com\n• 1:1 문의: [고객센터](/contact)\n• FAQ: [자주 묻는 질문](/faq)\n\n결혼 준비 관련 질문은 저(듀이)에게 바로 물어봐 주셔도 돼요 ",
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
  // 의도적으로 broad — false positive("AI 추천 몇 번 정도?")가 발생해도
  // 사용량 응답이 무해하고, LLM 호출 절감 효과가 있어서.
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
    // 자연어 변형("어때?"·"어떤가"·"진행됐어") 추가. 기존 /내\s*활동\s*요약/
    // 은 "내 활동 어때?" 같은 일상 어투를 못 잡아 시뮬레이션에서 LLM 폴백
    // 되던 갭(M1·N1·P1·P10). 단독 "진행 상황"은 contract_progress·
    // checklist_progress와 충돌하므로 제외.
    patterns: [
      /내\s*활동/,                           // "내 활동 어때", "내 활동 보여"
      /활동\s*(요약|어때|어떤가)/,
      /현황\s*(보여|알려|어때)/,
      /지금\s*(상태|어디|어떻게)/,
      /대시보드/,
      /(어디까지|얼마나).*진행/,             // "어디까지 진행됐어"
    ],
    dbHandler: "activity_summary",
  },

  // ── 이번 주 활동 ───────────────────────────────
  {
    intent: "this_week",
    patterns: [/이번\s*주.*활동/, /이번\s*주.*뭐/, /최근\s*7일/, /주간\s*요약/],
    dbHandler: "this_week",
  },

  // ════════════════════════════════════════════════════════════
  // Phase h — 진단·통계·검색·정적 가이드
  // ════════════════════════════════════════════════════════════

  // 진단 (사용자 데이터 분석)
  {
    intent: "budget_diagnosis" as ChatIntent,
    patterns: [/예산.*(분석|진단|비율|점검)/, /예산\s*잘.*(짜|쓰)/, /예산\s*괜찮/],
    dbHandler: "budget_diagnosis",
  },
  {
    intent: "schedule_diagnosis" as ChatIntent,
    patterns: [/일정.*(진단|점검|확인|체크)/, /놓친\s*(일정|골든)/, /지금.*잘/, /일정.*잘.*가/],
    dbHandler: "schedule_diagnosis",
  },
  {
    intent: "contract_progress" as ChatIntent,
    patterns: [/계약.*(진척|진행|상황|얼마나)/, /진행\s*(상황|률|상태)/, /어디까지/],
    dbHandler: "contract_progress",
  },
  {
    intent: "checklist_progress" as ChatIntent,
    // DB 즉답 디테일화: 자연어 "남은/안 끝난/안 한/미완료" + "체크리스트/할 일" 과
    // "체크리스트에서 중요한 거" 류를 실데이터 즉답으로(LLM 환각 차단).
    patterns: [
      /체크리스트.*(완료|진행|진척|얼마|남았|남은|안\s*(끝|한|된)|미완료|중요)/,
      /(남은|안\s*(끝난|한)|미완료).*(체크리스트|할\s*일|태스크)/,
      /몇\s*(%|퍼센트).*했/, /진척률/,
      /(할\s*일|태스크).*(남았|얼마나|몇\s*개)/,
    ],
    dbHandler: "checklist_progress",
  },

  // ── 명시 웹 검색 (사용자가 "웹에서 찾아줘") ────────────
  // free_search·popular_places보다 먼저 매칭되어야 함 — "웹에서 강남
  // 웨딩홀 찾아줘"가 free_search 패턴에 먼저 잡히는 회귀 방지.
  // "더 찾아줘" 단독은 너무 광범위 → 컨텍스트(웹/실시간/최신) 동반 필요.
  {
    intent: "web_search" as ChatIntent,
    patterns: [
      /웹에서.*(검색|찾|알려)/,
      /실시간.*(검색|찾|정보)/,
      /최신.*(검색|찾|정보).*(업체|식장|스튜디오|드레스)/,
      /구글에서.*(검색|찾)/,
      /직접.*(웹|구글|인터넷).*(검색|찾)/,
    ],
    dbHandler: "web_search",
  },

  // 통계·검색 (자유 텍스트)
  {
    intent: "free_search" as ChatIntent,
    // 스몰웨딩("베뉴 추천")·셀프웨딩("로케이션 추천") 등 STYLE_OVERRIDES 칩
    // 프롬프트도 잡히도록 보강. 기존 keyword(식장/웨딩홀/스튜디오/드레스/
    // 메이크업)에 베뉴/로케이션/촬영지/장소 추가.
    patterns: [
      /(강남|강북|서초|마포|용산|종로|부산|대구|인천|성남|수원|천안|청주|경기|제주).*(식장|웨딩홀|스튜디오|드레스|메이크업|베뉴|로케이션)/,
      /(식장|웨딩홀|스튜디오|드레스샵|메이크업|베뉴|로케이션|촬영지|촬영\s*장소).*추천/,
      /(찾|검색).*(웨딩홀|식장|스튜디오|베뉴|로케이션)/,
      /(스몰웨딩|셀프웨딩).*(베뉴|로케이션|장소|촬영).*추천/,
    ],
    dbHandler: "free_search",
  },
  {
    intent: "average_price" as ChatIntent,
    patterns: [/평균.*(가격|시세|얼마|비용)/, /시세.*(어때|얼마|얼만)/, /(웨딩홀|식장|스튜디오|드레스).*시세/],
    dbHandler: "average_price",
  },
  {
    intent: "popular_places" as ChatIntent,
    patterns: [/인기.*(업체|식장|스튜디오|드레스)/, /(평점|별점).*(높은|좋은)/, /TOP|랭킹/i],
    dbHandler: "popular_places",
  },
  {
    // 비교표 — P1/P2/P3/P7 페르소나 시간 효율 핵심. "강남 호텔 5곳 비교", "스튜디오
    // 비교해줘", "추천 5곳 비교" 같이 비교 의도 명시될 때 표 형태로 즉답.
    intent: "venue_compare" as ChatIntent,
    patterns: [
      /(웨딩홀|식장|호텔|스튜디오|드레스).*비교/,
      /비교.*(웨딩홀|식장|호텔|스튜디오|드레스)/,
      /(\d+)\s*곳.*(비교|추천)/,
      /(비교|매트릭스).*(표|시트|시각화)/,
    ],
    dbHandler: "venue_compare",
  },

  // 정적 가이드 (지식 기반)
  {
    intent: "guide_sdme_timing" as ChatIntent,
    patterns: [/스드메.*(언제|시기|예약)/, /스튜디오.*(언제|시기)/, /드레스.*(언제|예약)/],
    guideKey: "sdme_timing",
  },
  {
    intent: "guide_invitation_timing" as ChatIntent,
    patterns: [/청첩장.*(언제|발송|시기)/, /청첩장.*보내|돌리/],
    guideKey: "invitation_timing",
  },
  {
    intent: "guide_makeup_trial" as ChatIntent,
    patterns: [/메이크업.*(시연|리허설|트라이)/, /시연.*(언제|메이크업)/],
    guideKey: "makeup_trial",
  },
  {
    intent: "guide_honeymoon_timing" as ChatIntent,
    patterns: [/신혼여행.*(언제|예약|준비)/, /허니문.*(언제|예약)/, /항공권.*(언제|예약)/],
    guideKey: "honeymoon_timing",
  },
  {
    intent: "guide_contract" as ChatIntent,
    patterns: [/계약.*(체크|주의|확인|포인트)/, /계약.*(할\s*때|조심)/, /계약서/],
    guideKey: "contract_check",
  },
  {
    // AIPlanner 메인 칩 "양가 분담 비교" 프롬프트("양가 분담 평균과 분배 가이드
    // 알려줘")가 어떤 패턴에도 안 잡혀 LLM 폴백 (일 5회 소진 후 무응답)되던
    // 회귀. 핸들러(handleEtiquetteGuide)는 분담 내용을 이미 다루므로 패턴만 보강.
    intent: "guide_etiquette" as ChatIntent,
    patterns: [
      /(예단|예물).*(매너|얼마|준비)/,
      /상견례/,
      /양가\s*인사/,
      /시부모|장모|장인/,
      /양가\s*(분담|분배|지원금|보조)/,
      /(분담|분배).*(평균|가이드|비율|얼마)/,
      /지원금.*(평균|얼마|분배|비율)/,
      // 양가 갈등·의견 차이 조율 — 시뮬레이션 회귀(S2·N2):
      // "양가 의견 차이 조율" 같은 표현이 기존 패턴에 안 잡혀 LLM 폴백.
      // etiquette 가이드가 양가 매너·분담을 다루므로 동일 핸들러로.
      /양가.*(의견|갈등|차이|조율|싸움|마찰)/,
      /(시댁|친정|처가|시가).*(갈등|의견|차이|조율)/,
      /부모님.*(의견|갈등).*(조율|차이|다름)/,
      /강요/,                                  // "시부모님이 한복 색깔 강요"
    ],
    guideKey: "etiquette",
  },
  {
    intent: "guide_gift" as ChatIntent,
    // "스몰웨딩 답례품 아이디어 추천해줘"(STYLE_OVERRIDES) 칩도 잡히도록
    // "답례품 아이디어/추천" 변형 포함. "축의금 봉투" 패턴은 기존 유지.
    patterns: [/답례품/, /축의금.*(얼마|봉투|기준|정도)/, /부조/, /축의\s*금액/],
    guideKey: "gift_etiquette",
  },
  {
    intent: "guide_new_home" as ChatIntent,
    patterns: [/신혼집.*(준비|체크|구하|구함)/, /(가전|혼수).*(언제|준비|구매)/],
    guideKey: "new_home",
  },
  {
    intent: "guide_ceremony_progress" as ChatIntent,
    patterns: [/식순.*(어떻|보여|알려)/, /본식.*(진행|식순)/, /예식.*순서/],
    guideKey: "ceremony_progress",
  },

  // ── 가봉 (드레스 가봉 일정·횟수·준비물) ─────────────────
  // "드레스 언제 예약" 은 sdme_timing(예약 시기)으로 가야 함. 여기서는
  // "가봉/피팅"의 횟수·준비·일정을 다룸.
  {
    intent: "guide_fitting" as ChatIntent,
    patterns: [
      /가봉.*(언제|시기|횟수|준비|몇\s*번)/,
      /드레스.*가봉/,
      /피팅.*(횟수|시기|언제|준비)/,
      /가봉.*(뭐|무엇|챙겨)/,
    ],
    guideKey: "fitting",
  },

  // ── 본식 스냅 vs 웨딩 스냅 ─────────────────────────────
  // sdme_timing 패턴이 /스튜디오.*(언제|시기)/ 라 "스냅 작가" 같은
  // 비-시기 질문은 안 잡혀 LLM 폴백되던 갭. 본식 스냅·웨딩 스냅·작가
  // 차이·계약 포인트 모두 이 핸들러에서 다룸.
  {
    intent: "guide_snap" as ChatIntent,
    patterns: [
      /(본식|웨딩)\s*스냅/,
      /스냅.*(작가|컷|원본|보정|차이|뭐|구분)/,
      /본식\s*촬영.*작가/,
      /원본.*(주나|받|제공)/,
    ],
    guideKey: "snap",
  },

  // ── 청첩장 디자인 (모바일·종이·트렌드) ────────────────
  // invitation_timing은 "발송 시기"만 다루므로, 디자인·종류·모바일
  // vs 종이 비교는 별도 핸들러로 분리.
  {
    intent: "guide_invitation_design" as ChatIntent,
    patterns: [
      /청첩장.*(디자인|종류|샘플|컨셉|트렌드|예쁜)/,
      /모바일\s*청첩장/,
      /(종이|모바일).*청첩장/,
      /청첩장.*(만들|제작)/,
    ],
    guideKey: "invitation_design",
  },

  // ── 예식 리허설 (식장 동선·진행) ──────────────────────
  // makeup_trial은 메이크업 시연 한정. 본식 식장 리허설은 별도 가이드.
  {
    intent: "guide_ceremony_rehearsal" as ChatIntent,
    patterns: [
      /(예식|본식|식장)\s*리허설/,
      /리허설.*(동선|진행|언제|뭐|준비)/,
      /식장.*리허설/,
    ],
    guideKey: "ceremony_rehearsal",
  },

  // ── 혼주 복장 (어머님·아버님 한복·양장) ───────────────
  {
    intent: "guide_parents_attire" as ChatIntent,
    patterns: [
      /혼주.*(복장|옷|한복|양장)/,
      /(어머님|아버님|어머니|아버지).*(한복|양장|양복|복장|옷|정장)/,
      /부모님.*복장/,
      /양가\s*어머님.*(한복|색깔|색상)/,
    ],
    guideKey: "parents_attire",
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
  const lower = trimmed.toLowerCase();

  // 1) 정적 패턴 매칭
  for (const pattern of PATTERNS) {
    for (const p of pattern.patterns) {
      const matched =
        typeof p === "string"
          ? lower.includes(p.toLowerCase())
          : p.test(trimmed);

      if (matched) {
        return {
          intent: pattern.intent,
          staticReply: pattern.staticReply,
          dbHandler: pattern.dbHandler,
          guideKey: pattern.guideKey,
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
