/**
 * Intent별 후속 질문 칩 매핑.
 *
 * ⚠️ 모든 칩 텍스트는 intentRouter.ts의 정적 패턴에 매칭되도록 작성한다.
 * 칩이 LLM 폴백되면 일일 무료 한도가 소진되고 응답도 부정확해서 사용자
 * 경험이 크게 나빠진다. 새 칩을 추가할 때 followUpChips.test.ts에서
 * matchIntent로 매칭 검증 필수.
 *
 * 매핑 없는 intent거나 null/undefined면 안전한 폴백 4개 사용.
 */

const DEFAULT_CHIPS = [
  "오늘 일정 알려줘",
  "예산 얼마 썼어?",
  "디데이 알려줘",
  "도움말 보여줘",
];

const CHIP_MAP: Record<string, string[]> = {
  // ── 가이드 응답 후 ─────────────────────────────────
  guide_etiquette: [
    "축의금 봉투 어떻게 써?",          // → guide_gift
    "답례품 추천",                      // → guide_gift
    "신혼집 준비 체크",                 // → guide_new_home
    "본식 식순 보여줘",                 // → guide_ceremony_progress
  ],
  guide_gift: [
    "예단 매너 알려줘",                 // → guide_etiquette
    "축의금 얼마가 적당해?",            // → guide_gift (재진입)
    "신혼집 준비 체크",                 // → guide_new_home
    "본식 식순 보여줘",                 // → guide_ceremony_progress
  ],
  guide_sdme_timing: [
    "메이크업 시연 언제 해?",           // → guide_makeup_trial
    "강남 스튜디오 추천",               // → free_search
    "스튜디오 시세 어때",               // → average_price
    "인기 스튜디오 보여줘",             // → popular_places
  ],
  guide_invitation_timing: [
    "청첩장 언제 보내",                 // → guide_invitation_timing (재진입)
    "오늘 일정 알려줘",                 // → schedule_today
    "디데이 알려줘",                    // → dday
    "체크리스트 진척률",                // → checklist_progress
  ],
  guide_makeup_trial: [
    "메이크업 시연 언제",               // → guide_makeup_trial (재진입)
    "강남 메이크업 추천",               // → free_search
    "스드메 언제 예약",                 // → guide_sdme_timing
    "인기 스튜디오 보여줘",             // → popular_places
  ],
  guide_honeymoon_timing: [
    "신혼여행 언제 예약",               // → guide_honeymoon_timing (재진입)
    "신혼집 준비 체크",                 // → guide_new_home
    "예산 분석해줘",                    // → budget_diagnosis
    "디데이 알려줘",                    // → dday
  ],
  guide_contract: [
    "예단 매너 알려줘",                 // → guide_etiquette
    "스드메 언제 예약",                 // → guide_sdme_timing
    "예산 분석해줘",                    // → budget_diagnosis
    "체크리스트 진척률",                // → checklist_progress
  ],
  guide_new_home: [
    "신혼여행 언제 예약",               // → guide_honeymoon_timing
    "예단 매너 알려줘",                 // → guide_etiquette
    "예산 얼마 썼어?",                  // → budget_summary
    "체크리스트 진척률",                // → checklist_progress
  ],
  guide_ceremony_progress: [
    "예단 매너 알려줘",                 // → guide_etiquette
    "메이크업 시연 언제",               // → guide_makeup_trial
    "디데이 알려줘",                    // → dday
    "이번 주 일정",                     // → schedule_upcoming
  ],

  // ── 신규 가이드 5종 follow-up ──────────────────────
  // 모든 칩은 followUpChips.test.ts 회귀 테스트로 라우팅 보장.
  guide_fitting: [
    "드레스 시세 어때",                 // → average_price
    "강남 드레스샵 추천",               // → free_search
    "스드메 언제 예약",                 // → guide_sdme_timing
    "디데이 알려줘",                    // → dday
  ],
  guide_snap: [
    "스튜디오 시세 어때",               // → average_price
    "강남 스튜디오 추천",               // → free_search
    "인기 스튜디오 보여줘",             // → popular_places
    "계약 체크포인트",                  // → guide_contract
  ],
  guide_invitation_design: [
    "청첩장 언제 보내",                 // → guide_invitation_timing
    "체크리스트 진척률",                // → checklist_progress
    "디데이 알려줘",                    // → dday
    "예단 매너 알려줘",                 // → guide_etiquette
  ],
  guide_ceremony_rehearsal: [
    "본식 식순 보여줘",                 // → guide_ceremony_progress
    "메이크업 시연 언제",               // → guide_makeup_trial
    "혼주 복장 가이드",                 // → guide_parents_attire
    "디데이 알려줘",                    // → dday
  ],
  guide_parents_attire: [
    "예단 매너 알려줘",                 // → guide_etiquette
    "본식 식순 보여줘",                 // → guide_ceremony_progress
    "축의금 봉투 어떻게 써?",          // → guide_gift
    "디데이 알려줘",                    // → dday
  ],

  // ── DB 조회 응답 후 ────────────────────────────────
  dday: [
    "오늘 일정 알려줘",                 // → schedule_today
    "이번 주 일정",                     // → schedule_upcoming
    "체크리스트 진척률",                // → checklist_progress
    "예산 얼마 썼어?",                  // → budget_summary
  ],
  budget_summary: [
    "예산 분석해줘",                    // → budget_diagnosis
    "웨딩홀 시세 어때",                 // → average_price
    "찜 목록 보여줘",                   // → favorites
    "오늘 일정 알려줘",                 // → schedule_today
  ],
  budget_diagnosis: [
    "예산 얼마 썼어?",                  // → budget_summary
    "웨딩홀 시세 어때",                 // → average_price
    "체크리스트 진척률",                // → checklist_progress
    "디데이 알려줘",                    // → dday
  ],
  schedule_today: [
    "이번 주 일정",                     // → schedule_upcoming
    "일정 점검해줘",                    // → schedule_diagnosis
    "체크리스트 진척률",                // → checklist_progress
    "디데이 알려줘",                    // → dday
  ],
  schedule_upcoming: [
    "오늘 일정 알려줘",                 // → schedule_today
    "일정 점검해줘",                    // → schedule_diagnosis
    "체크리스트 진척률",                // → checklist_progress
    "예산 얼마 썼어?",                  // → budget_summary
  ],
  schedule_diagnosis: [
    "오늘 일정 알려줘",                 // → schedule_today
    "이번 주 일정",                     // → schedule_upcoming
    "체크리스트 진척률",                // → checklist_progress
    "디데이 알려줘",                    // → dday
  ],
  checklist_progress: [
    "오늘 일정 알려줘",                 // → schedule_today
    "이번 주 일정",                     // → schedule_upcoming
    "예산 얼마 썼어?",                  // → budget_summary
    "계약 진행 상황",                   // → contract_progress
  ],
  favorites: [
    "장바구니",                         // → cart
    "받은 특가 보여줘",                 // → deal_claims
    "인기 식장 보여줘",                 // → popular_places
    "강남 웨딩홀 추천",                 // → free_search
  ],
  cart: [
    "찜 목록 보여줘",                   // → favorites
    "주문 내역 보여줘",                 // → orders
    "결제 내역 보여줘",                 // → payments
    "받은 특가 보여줘",                 // → deal_claims
  ],
  free_search: [
    "웨딩홀 시세 어때",                 // → average_price
    "인기 식장 보여줘",                 // → popular_places
    "웹에서 더 찾아줘",                 // → web_search (실시간 폴백)
    "예산 얼마 썼어?",                  // → budget_summary
  ],
  average_price: [
    "인기 식장 보여줘",                 // → popular_places
    "강남 웨딩홀 추천",                 // → free_search
    "웹에서 최신 시세 검색",            // → web_search
    "찜 목록 보여줘",                   // → favorites
  ],
  popular_places: [
    "웨딩홀 시세 어때",                 // → average_price
    "강남 웨딩홀 추천",                 // → free_search
    "웹에서 더 찾아줘",                 // → web_search
    "예산 얼마 썼어?",                  // → budget_summary
  ],
  web_search: [
    "예산 얼마 썼어?",                  // → budget_summary
    "찜 목록 보여줘",                   // → favorites
    "계약 체크포인트",                  // → guide_contract
    "디데이 알려줘",                    // → dday
  ],

  // ── 모달 응답 후 (sendStructured) ──────────────────
  venue_recommendation: [
    "스드메 언제 예약",                 // → guide_sdme_timing
    "예산 분석해줘",                    // → budget_diagnosis
    "웨딩홀 시세 어때",                 // → average_price
    "찜 목록 보여줘",                   // → favorites
  ],
  sdme_guide: [
    "강남 웨딩홀 추천",                 // → free_search
    "메이크업 시연 언제",               // → guide_makeup_trial
    "인기 스튜디오 보여줘",             // → popular_places
    "예산 분석해줘",                    // → budget_diagnosis
  ],
  timeline_planning: [
    "본식 식순 보여줘",                 // → guide_ceremony_progress
    "체크리스트 진척률",                // → checklist_progress
    "디데이 알려줘",                    // → dday
    "오늘 일정 알려줘",                 // → schedule_today
  ],
  budget_planning: [
    "예산 분석해줘",                    // → budget_diagnosis
    "웨딩홀 시세 어때",                 // → average_price
    "체크리스트 진척률",                // → checklist_progress
    "예산 점검해줘",                    // → budget_diagnosis
  ],
};

export const getFollowUpChips = (intent: string | null | undefined): string[] => {
  if (intent && CHIP_MAP[intent]) return CHIP_MAP[intent];
  return DEFAULT_CHIPS;
};
