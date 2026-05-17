// Per-category seed queries for YouTube wedding tip search.
// The collector pools the top N results per query and merges hits across
// queries, so more seeds → wider coverage. Each category aims for 6–8
// seeds spanning the natural search variations couples use.
//
// Pool order in this file = tie-breaker order in
// orderCategoriesByMatchCount when a video matches multiple categories
// with the same hit count. List narrower / lower-volume categories
// first so they win ties against broad buckets like "general".

export const TIP_QUERIES: Record<string, string[]> = {
  // ── Narrow / topical categories first (win tiebreakers) ─────────
  family_meeting: [
    "상견례 식당 추천",
    "양가 상견례 팁",
    "상견례 복장",
    "상견례 인사말",
    "상견례 코스 메뉴",
    "상견례 예절",
  ],
  newlywed_home: [
    "신혼집 인테리어",
    "신혼집 평수",
    "혼수 리스트",
    "신혼집 위치 추천",
    "혼수 비용 정리",
    "신혼집 전세 자금",
    "신혼집 가구 추천",
  ],
  wedding_gifts: [
    "예단 예물 추천",
    "예물 시계 추천",
    "예물 반지 추천",
    "예단 비용",
    "예물 가성비",
    "예단 함 보내기",
  ],
  legal_paperwork: [
    "혼인신고 서류",
    "혼인신고 절차",
    "혼인신고 후 변경",
    "혼인신고 시기",
    "혼인신고 혜택",
  ],
  bridal_care: [
    "웨딩 다이어트",
    "신부 피부관리",
    "웨딩 바디관리",
    "결혼식 다이어트 식단",
    "예비신부 관리",
    "웨딩 헬스",
  ],
  ceremony: [
    "결혼식 식순",
    "주례 사회자 멘트",
    "본식 당일 체크리스트",
    "축의금 계좌",
    "결혼식 답례품 추천",
    "하객 예절",
    "결혼식 진행 순서",
    "본식 당일 준비물",
  ],
  // ── Vendor / spend categories ────────────────────────────────────
  wedding_hall: [
    "웨딩홀 고르는 법",
    "예식장 비교",
    "스몰웨딩 후기",
    "호텔웨딩 팁",
    "웨딩홀 계약 주의사항",
    "음식 시연 후기",
    "결혼식장 가성비",
  ],
  studio: [
    "웨딩 스튜디오 추천",
    "본식 스냅 팁",
    "셀프 웨딩 촬영",
    "리허설 촬영 추천",
    "본식 DVD 후기",
    "스튜디오 가성비",
  ],
  dress_shop: [
    "웨딩 드레스 가봉 후기",
    "드레스샵 추천",
    "체형별 드레스",
    "드레스 투어 후기",
    "본식 드레스 추천",
    "2부 드레스",
    "웨딩드레스 트렌드",
  ],
  makeup_shop: [
    "신부 메이크업 후기",
    "웨딩 헤어 추천",
    "메이크업 리허설",
    "본식 메이크업 꿀팁",
    "신부 헤어 트렌드",
    "헤어메이크업 가성비",
  ],
  hanbok: [
    "혼주 한복 추천",
    "신부 한복 트렌드",
    "한복 맞춤 후기",
    "한복 대여",
    "혼주 한복 색상",
  ],
  tailor_shop: [
    "신랑 예복 추천",
    "턱시도 vs 정장",
    "맞춤 정장 후기",
    "신랑 정장 가격",
    "예복 가봉 후기",
  ],
  honeymoon: [
    "허니문 추천 여행지",
    "신혼여행 패키지",
    "유럽 허니문 후기",
    "신혼여행 비용",
    "허니문 호텔 추천",
    "동남아 허니문",
    "신혼여행 일정",
  ],
  appliance: [
    "혼수 가전 추천",
    "신혼 가전 세트",
    "혼수 침대 매트리스",
    "혼수 냉장고 추천",
    "신혼 가구 추천",
  ],
  invitation_venue: [
    "모바일 청첩장 추천",
    "청첩장 디자인",
    "청첩장 문구",
    "청첩장 발송 시기",
    "청첩장 모임 장소",
  ],
  // ── Broad fallback (loses tiebreakers via tip-normalize rule) ───
  general: [
    "결혼 준비 꿀팁",
    "예비부부 체크리스트",
    "웨딩 준비 순서",
    "결혼 비용",
    "결혼 준비 기간",
    "결혼 준비 후회",
    "결혼 비용 절약",
  ],
};

export type TipCategory = keyof typeof TIP_QUERIES;
export const TIP_CATEGORIES = Object.keys(TIP_QUERIES) as TipCategory[];
