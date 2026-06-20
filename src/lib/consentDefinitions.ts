// 동의(consent) 타입·버전의 **단일 소스(SSOT)**.
//
// `user_consents` 에 기록하는 consent_type/version 문자열이 훅마다 흩어져 있으면 드리프트가 난다.
// 각 동의 훅(useDataCollectionConsent·useDataUsageConsent 등)은 여기서 import 해 사용한다.
// 버전을 올릴 때(약관·수집범위 변경)는 여기 한 곳만 바꾸면 된다.

export const CONSENT = {
  /** 데이터 수집(필수) — 웨딩 정보 입력 전 게이트 */
  dataCollection: { type: "data_collection_v1", version: 1 },
  /** 데이터 활용(선택, opt-in 기본 OFF) — 마케팅·서비스 개선 */
  dataUsage: { type: "data_usage_v1", version: 1 },
} as const;
