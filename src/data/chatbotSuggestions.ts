/**
 * 챗봇 추천 질문
 *
 * 사용자가 입력창에 타이핑 시 인텐트 게이트에 매칭되는 질문을
 * 자동완성처럼 추천. 클릭하면 LLM 호출 없이 즉답으로 이어진다.
 *
 * 빈 입력 시엔 인기 질문 노출.
 */

export interface SuggestedQuestion {
  /** 화면 표시 + 실제 전송 텍스트 */
  text: string;
  /** 카테고리별 이모지 */
  emoji: string;
  /** 매칭 트리거 키워드 (사용자 입력 토큰과 부분 매칭) */
  keywords: string[];
  /** 분류 (그룹 라벨링·정렬용) */
  category: "personal" | "planning" | "couple" | "shopping" | "ai_studio" | "info" | "summary";
  /** 빈 입력 시 노출 우선순위 (낮을수록 먼저). undefined면 빈 입력 시 노출 X */
  popularity?: number;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  // ── 개인 정보 (personal) ─────────────────────────
  {
    text: "디데이 알려줘",
    emoji: "📅",
    keywords: ["디데이", "dday", "며칠", "남았", "결혼식까지"],
    category: "personal",
    popularity: 1,
  },
  {
    text: "내 결혼 정보 보여줘",
    emoji: "💍",
    keywords: ["내", "결혼", "정보", "프로필"],
    category: "personal",
    popularity: 2,
  },
  {
    text: "내 지역 정보",
    emoji: "📍",
    keywords: ["지역", "동네", "근처"],
    category: "personal",
  },

  // ── 플래닝 (planning) ────────────────────────────
  {
    text: "오늘 일정 알려줘",
    emoji: "📆",
    keywords: ["오늘", "일정", "할일"],
    category: "planning",
    popularity: 3,
  },
  {
    text: "이번 주 일정",
    emoji: "🗓️",
    keywords: ["이번주", "이번 주", "다가오는", "곧"],
    category: "planning",
  },
  {
    text: "예산 얼마 썼어?",
    emoji: "💰",
    keywords: ["예산", "지출", "썼", "얼마"],
    category: "planning",
    popularity: 4,
  },
  {
    text: "지금 뭐 해야 해?",
    emoji: "✅",
    keywords: ["체크리스트", "뭐해야", "지금", "할일", "할 일"],
    category: "planning",
  },
  {
    text: "6개월 전 체크리스트",
    emoji: "📋",
    keywords: ["6개월", "체크리스트", "전"],
    category: "planning",
  },
  {
    text: "1개월 전 체크리스트",
    emoji: "📋",
    keywords: ["1개월", "한달", "한 달"],
    category: "planning",
  },

  // ── 찜·장바구니 (shopping) ──────────────────────
  {
    text: "내 찜 목록 보여줘",
    emoji: "💗",
    keywords: ["찜", "즐겨찾기", "북마크", "좋아요"],
    category: "shopping",
    popularity: 5,
  },
  {
    text: "찜한 영상 보여줘",
    emoji: "🎬",
    keywords: ["찜", "영상", "비디오", "유튜브"],
    category: "shopping",
  },
  {
    text: "찜한 식장 보여줘",
    emoji: "🏛️",
    keywords: ["찜", "식장", "웨딩홀"],
    category: "shopping",
  },
  {
    text: "찜한 드레스 보여줘",
    emoji: "👗",
    keywords: ["찜", "드레스"],
    category: "shopping",
  },
  {
    text: "장바구니 확인",
    emoji: "🛒",
    keywords: ["장바구니", "카트", "담은"],
    category: "shopping",
  },
  {
    text: "내 주문 내역",
    emoji: "🛍️",
    keywords: ["주문", "구매", "내역", "산"],
    category: "shopping",
  },
  {
    text: "결제 내역",
    emoji: "💳",
    keywords: ["결제", "내역", "이력"],
    category: "shopping",
  },
  {
    text: "받은 쿠폰",
    emoji: "🎁",
    keywords: ["쿠폰", "특가", "할인", "받은"],
    category: "shopping",
  },

  // ── 커플 (couple) ──────────────────────────────
  {
    text: "파트너 연결됐어?",
    emoji: "💑",
    keywords: ["파트너", "커플", "연결", "연동"],
    category: "couple",
  },
  {
    text: "최근 다이어리",
    emoji: "📔",
    keywords: ["다이어리", "일기"],
    category: "couple",
  },
  {
    text: "진행 중인 투표",
    emoji: "🗳️",
    keywords: ["투표", "결정", "미정"],
    category: "couple",
  },

  // ── AI Studio (ai_studio) ──────────────────────
  {
    text: "하트 잔액 확인",
    emoji: "💗",
    keywords: ["하트", "잔액", "토큰"],
    category: "ai_studio",
  },
  {
    text: "포인트 얼마야?",
    emoji: "✨",
    keywords: ["포인트", "적립"],
    category: "ai_studio",
  },
  {
    text: "내 드레스 피팅 기록",
    emoji: "👗",
    keywords: ["드레스", "피팅", "기록", "갤러리"],
    category: "ai_studio",
  },
  {
    text: "하트 거래 내역",
    emoji: "💗",
    keywords: ["하트", "거래", "이력"],
    category: "ai_studio",
  },
  {
    text: "구독 상태",
    emoji: "✨",
    keywords: ["구독", "premium", "프리미엄", "만료"],
    category: "ai_studio",
  },

  // ── 커뮤니티·AI (personal) ───────────────────────
  {
    text: "내가 쓴 글",
    emoji: "✏️",
    keywords: ["내가", "쓴", "글", "게시글", "포스트"],
    category: "personal",
  },
  {
    text: "내 댓글 보여줘",
    emoji: "💬",
    keywords: ["내", "댓글"],
    category: "personal",
  },
  {
    text: "AI 몇 번 썼어?",
    emoji: "🤖",
    keywords: ["AI", "챗봇", "사용", "몇번", "몇 번"],
    category: "personal",
  },

  // ── 종합 (summary) ─────────────────────────────
  {
    text: "내 활동 요약",
    emoji: "📊",
    keywords: ["활동", "요약", "전체", "현황", "대시보드"],
    category: "summary",
    popularity: 6,
  },
  {
    text: "이번 주 활동",
    emoji: "📈",
    keywords: ["이번주", "이번 주", "주간", "최근7일"],
    category: "summary",
  },

  // ── 정보 (info) ────────────────────────────────
  {
    text: "도움말 보여줘",
    emoji: "💡",
    keywords: ["도움", "사용법", "기능", "help"],
    category: "info",
    popularity: 7,
  },
  {
    text: "가격·요금 안내",
    emoji: "💵",
    keywords: ["가격", "요금", "premium", "프리미엄", "비용"],
    category: "info",
  },
  {
    text: "문의처 알려줘",
    emoji: "📬",
    keywords: ["문의", "연락", "이메일", "고객센터", "cs"],
    category: "info",
  },
  {
    text: "듀이가 뭐야?",
    emoji: "🌸",
    keywords: ["듀이", "dewy", "이앱", "이 앱", "소개"],
    category: "info",
  },
];

/**
 * 사용자 입력 키워드와 매칭되는 추천 질문 검색
 *
 * @param input 사용자가 타이핑 중인 텍스트
 * @param max 최대 반환 개수
 * @returns 매칭된 추천 (관련도 순)
 */
export const findSuggestions = (input: string, max = 5): SuggestedQuestion[] => {
  const trimmed = input.trim().toLowerCase();

  // 빈 입력 → 인기 질문 (popularity 정의된 것)
  if (trimmed.length === 0) {
    return SUGGESTED_QUESTIONS
      .filter((q) => q.popularity !== undefined)
      .sort((a, b) => (a.popularity ?? 99) - (b.popularity ?? 99))
      .slice(0, max);
  }

  // 키워드 매칭 (substring)
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  const scored = SUGGESTED_QUESTIONS.map((q) => {
    let score = 0;
    // 키워드 매칭 점수
    for (const kw of q.keywords) {
      const kwLower = kw.toLowerCase();
      // 사용자 입력에 키워드 포함
      if (trimmed.includes(kwLower)) score += 10;
      // 키워드에 사용자 입력 포함 (역방향)
      else if (kwLower.includes(trimmed)) score += 5;
      // 토큰 단위 부분 매칭
      else {
        for (const t of tokens) {
          if (t.length >= 2 && kwLower.includes(t)) score += 2;
          else if (t.length >= 2 && kwLower.startsWith(t)) score += 3;
        }
      }
    }
    // 텍스트 자체에 매칭
    if (q.text.toLowerCase().includes(trimmed)) score += 5;

    return { q, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.q);
};
