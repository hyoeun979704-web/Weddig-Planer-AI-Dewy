# 변경 이력 (Changelog)

앱 버전(`android/app/build.gradle` 의 `versionName`/`versionCode`) 기준.

## 2.1.0 (versionCode 6) — 2026-06-13

결제 카카오페이 전환 · 비주얼 리뉴얼(아이콘·시스템 바) · FE/BE 정합성 버그 수정 ·
백엔드 정리 릴리스. (이전 2.0.1 → 다수 변경으로 마이너 업)

### Play Store "이번 업데이트" 문구 (한국어, 복사용)
```
- 카카오페이 결제 안정화 (스토어 주문 결제)
- 새 앱 아이콘 적용
- 상태바·하단바 브랜드 색상 적용 및 상단 여백 정리
- 포인트 잔액 표시 정확도 개선
- AI 챗봇 지역·카테고리 추천 개선
- 여러 버그 수정 및 안정성 개선
```

### 사용자 영향 (상세)
- **결제**: 스토어 주문 결제를 카카오페이로 일원화(토스페이먼츠 제거). 서버에서 금액 재계산·검증, 불일치 시 자동 취소.
- **앱 아이콘**: 정식 하트 로고로 교체(이전 레거시 아이콘 → 신규), 적응형 아이콘 여백 보정.
- **시스템 바**: 상태바·하단 네비게이션 바를 브랜드 핑크로, 상단의 비정상 빈 여백 제거.
- **포인트**: 게임 화면·마이페이지·AI 챗봇 포인트가 실제 사용 가능 잔액과 어긋나던 문제 수정.
- **AI 챗봇/플래너**: "예복" 검색 0건, "내 지역 웨딩홀 수" 미표시 문제 수정.
- 가격 표기 일관성·여러 버그 수정.

### 개발/백엔드 (사용자 비노출)
- 카카오페이 스토어 결제 경로 신설(`kakao-pay-order-ready`/`approve`) + 토스 함수·SDK·env 제거.
- FE↔BE 값 정합성 버그 5건 수정: 포인트 `total_points`→`balance`, 어드민 데이터 신선도 카테고리(`suit`→`tailor_shop`, 누락 `invitation_venue`/`appliance` 추가), 챗봇/AI플래너 `suit`→`tailor_shop` 변환, 죽은 `venues` 참조→`places` 복구.
- 가격 표기 단일화(`formatWon`, 9곳 복붙 제거).
- 레거시 빈 테이블 6종 드롭(`appliances/hanbok/honeymoon/honeymoon_gifts/studios/suits`).
- Supabase 타입 재생성(실 DB 113테이블 동기화 — 스테일 제거, 누락 29개 보강).
- FE/BE 값 정합성 CI 가드 신설(`scripts/check-integrity.mjs`) — 회귀 자동 차단.
- 안드로이드 아이콘 재생성 스크립트(`scripts/gen-android-icons.mjs`).
- 상태바/네비바 색: 네이티브 테마 `statusBarColor`/`navigationBarColor`(`dewyPrimary` #F6909B) + 어두운 아이콘.
- 전 페이지 고도화 코드리뷰 문서(`docs/260613_codereview_2.md`).

## 2.0.1 (versionCode 4)
- (이전 릴리스 — 기록 없음)
