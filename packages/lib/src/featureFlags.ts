// 기능 노출 플래그(단일 소스). 구현은 유지하되 프론트 진입점만 가릴 때 사용.
//
// DESIGN_MARKET_ENABLED: 청첩장 디자인 마켓(구매·결제) + 작가 디자인 등록·판매.
//   세무/법무(통신판매중개 대금 예수금 처리·하트 과세시점 등) 국세청 확인 후 켠다.
//   false 동안 진입 메뉴를 숨김(라우트/백엔드/마이그레이션은 유지 — 직접 URL 내부 테스트 가능).
export const DESIGN_MARKET_ENABLED = false;

// TASTE_BOOST_ENABLED: 메인 추천("비슷한 업체")에 신부 취향(무드) 가산점(S3).
//   partner_rank 1차 정렬을 보존한 채 동순위에서만 취향 매칭을 위로 올리는 tie-breaker.
//   off 면 추천 동작이 완전히 동일(회귀 0). 캡처 시뮬·점진 롤아웃 후 켠다(R5 가드).
export const TASTE_BOOST_ENABLED = false;
