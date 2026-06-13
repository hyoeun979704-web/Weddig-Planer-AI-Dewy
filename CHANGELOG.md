# 변경 이력 (Changelog)

앱 버전(`android/app/build.gradle` 의 `versionName`/`versionCode`) 기준.

## 2.0.2 (versionCode 5) — 2026-06-13

결제 안정화 · FE/BE 정합성 버그 수정 · 백엔드 정리 릴리스.

### 사용자 영향 (Play Store "이번 업데이트" 후보 문구)
- **카카오페이 결제 안정화** — 스토어 주문 결제를 카카오페이로 일원화(토스페이먼츠 제거). 서버에서 금액을 다시 계산·검증하고 불일치 시 자동 취소하도록 보강.
- **포인트 잔액 표시 정확도 개선** — 게임 화면·마이페이지·AI 챗봇의 포인트가 실제 사용 가능 잔액과 어긋나던 문제 수정(사용분 미반영 → 정상 반영).
- **AI 챗봇 추천 개선** — "예복" 검색이 결과 0건이던 문제, "내 지역 웨딩홀 수" 안내가 안 뜨던 문제 수정.
- 여러 버그 수정 및 표기 일관성 개선.

### 개발/백엔드 (사용자 비노출)
- 스토어 결제 경로 카카오페이 신설(`kakao-pay-order-ready`/`approve`) + 토스 함수·SDK·env 제거.
- FE↔BE 값 정합성 버그 5건 수정: 포인트 `total_points`→`balance`, 어드민 데이터 신선도 카테고리(`suit`→`tailor_shop`, 누락 `invitation_venue`/`appliance` 추가), 챗봇/AI플래너 `suit`→`tailor_shop` 변환, 죽은 `venues` 참조→`places` 복구.
- 가격 표기 단일화(`formatWon`, 9곳 복붙 제거).
- 레거시 빈 테이블 6종 드롭(`appliances/hanbok/honeymoon/honeymoon_gifts/studios/suits`).
- Supabase 타입 재생성(실 DB 113테이블 동기화 — 스테일 제거, 누락 29개 보강).
- FE/BE 값 정합성 CI 가드 신설(`scripts/check-integrity.mjs`) — 회귀 자동 차단.
- 전 페이지 고도화 코드리뷰 문서(`docs/260613_codereview_2.md`).

### Play Store 짧은 문구 (한국어, 복사용)
```
- 카카오페이 결제 안정화
- 포인트 잔액 표시 정확도 개선
- AI 챗봇 지역·카테고리 추천 개선
- 여러 버그 수정 및 성능 개선
```

## 2.0.1 (versionCode 4)
- (이전 릴리스 — 기록 없음)
