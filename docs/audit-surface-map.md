# 전체감사 Surface 커버리지 맵 (단일 소스)

> **전체감사는 이 문서의 모든 surface 를 14차원(AGENTS.md)으로 점검한다.** 감사 문서
> (`docs/YYMMDD_codereview.md`)에 이 맵 기준 **커버리지 표**(✅본 / ⚠️일부 / ⬜미점검)를
> 반드시 넣어 빠진 곳을 가시화한다. ⬜는 다음 감사로 **명시적 이월(deferred)**.
> 기준 = `src/App.tsx` 라우트 전수. **새 라우트/관리 항목 추가 시 이 맵도 같이 갱신**(드리프트 방지).
> "몇 개만 점검"은 전체감사가 아니다 — 관리 항목이 수십 개인 surface(기업·운영자)는 **하위 항목까지** 본다.

## A. 소비자 (Consumer)

### A1. 탐색·추천·발견
- 홈 / 페르소나 대시보드 (`/`)
- 검색·태그 (`/search/tag/:tag`)
- 카테고리 목록 (`/venues /studios /suit /hanbok /jewelry /appliances /honeymoon /invitation-venues /store /coupons /deals /events /influencers`)
- 업체 상세 (`/vendor/:id /venue/:id /studio/:id /store/:id /hanbok/:id /suit/:id /jewelry/:id /appliances/:id /honeymoon/:id /invitation-venues/:id /product/:id`) — 기본정보·연락처·운영시간·주차/교통·리뷰·갤러리 노출
- **비교** (`/compare`)
- 찜/즐겨찾기 (`/favorites`) · 취향 스와이프 (`/taste`)

### A2. 콘텐츠·꿀팁 (개인화 핵심)
- **꿀팁 영상** (`/tips`) — 페르소나/단계별 큐레이션 게이트
- 매거진 (`/magazine`) · 갤러리 (`/gallery`) · 인플루언서 (`/influencers/:id`)

### A3. 준비 도구 (개인화 핵심)
- 일정/타임라인 (`/schedule /my-schedule`) — 추천 할일 퀴즈카드
- **보드/체크리스트** (`/board`)
- 예산 (`/budget /budget/history /budget/category/:c /budget/split-simulator`) — 환불 포함
- 커플 다이어리·투표 (`/couple-diary /couple-vote`) · Wrapped/마일스톤 (`/wrapped`) · 머지게임 (`/merge-game`) · 리퍼럴 (`/referral`)

### A4. AI
- AI 플래너 (`/ai-planner`)
- AI 스튜디오 (`/ai-studio` + 드레스투어/메이크업/헤어룸/컨설팅/sdm-preview + 각 result/gallery/recommend)

### A5. 청첩장
- 모바일 청첩장 (`/i/:slug /i2/:slug /invitation/new /invitation/my /invitation/:id/edit`)
- RSVP (`/invitation/:id/rsvp`) · 사진수집 (`/i/:slug/photos /invitation/:id/photos`) · 마켓 (`/invitation/market`)

### A6. 커머스·결제 (개인화 + 법적 + 비용 교차)
- **쇼핑** (`/store /product/:id /cart /checkout /orders /order-complete/:id /deals /honeymoon-gifts`)
- **견적/문의 플로우** (`/quote /quote/new /quote/:id /quote/:req/thread/:place /contact /my-inquiries /my-deliveries`) — 미입점 CTA→견적매칭 전환 포함
- 하트·포인트 (`/points /points/charge` +success/fail)
- 구독/프리미엄 (`/premium /premium/subscribe /premium/content /premium/payment/*`)
- 쿠폰 (`/coupons`) · 결제 콜백 (`/payment/success /payment/fail`)

### A7. 커뮤니티·계정·CS
- 커뮤니티 (`/community` + `/write /:id /:id/edit /bookmarks /notifications`)
- 마이페이지·프로필 (`/mypage /profile`) · 알림 (`/notifications /notifications/inbox`) · 메일 (`/mail`)
- 설정 (`/settings`) · **회원탈퇴** (`/account-deletion`)
- 도움말·튜토리얼 (`/help /help/:id /faq /tutorial /support`)

## B. 기업 (Business) — 관리 항목 전수

- 입점/온보딩/클레임 (`/business /business/onboard /business/claim`)
- 대시보드 (`/business/dashboard`)
- **상세페이지 관리** (`/business/edit`) — ① 기본정보(이름·지역·대표가·태그·문의채널) ② **연락처/운영**(전화·운영시간·SNS·주차/교통) ③ **카테고리별 상세**(홀/스튜디오/드레스/메이크업/한복/예복/청첩장/허니문/주얼리/혼수)
- 갤러리/포트폴리오 (`/business/gallery`) — 앨범·미디어·메뉴
- 상품/패키지 (`/business/products`)
- **리뷰 관리** (`/business/reviews`) — 답글·평점필터·정렬·답글률
- 쿠폰 (`/business/coupons`) · 이벤트 (`/business/events`)
- 리드 (`/business/leads`) · 문의 (`/business/inquiries`) · 배송/전달 (`/business/deliveries`)
- 디자인(청첩장 디자이너) (`/business/designs`) · 가이드 (`/business/guide /business/guides`)

## C. 운영자 (Admin) — 관리 항목 전수

### C1. 업체·입점
- 업체 목록/상세 (`/admin/places /admin/places/:id`) · 입점 클레임 승인 (`/admin/place-claims`) · 기업 리뷰 심사 (`/admin/business-review`)
### C2. 콘텐츠 모더레이션
- 콘텐츠 심사 (`/admin/content-review`) · 신고 처리 (`/admin/reports`) · 상품 큐레이션 (`/admin/product-curation /admin/featured-products`)
### C3. 청첩장 에셋
- 템플릿/에셋/폰트 (`/admin/invitation-templates /admin/invitation-assets /admin/invitation-fonts`)
### C4. AI 운영
- AI 잡 (`/admin/ai-jobs`) · 프롬프트 (`/admin/ai-prompts /admin/ai-prompt-editor`) · 에이전트 산출물 (`/admin/agent-outputs`)
- AI 샘플 (`/admin/dress-samples /admin/hair-samples /admin/makeup-samples /admin/wedding-photo-refs`)
### C5. 마케팅·CS·운영
- 인스타 포스트 (`/admin/instagram-posts /admin/instagram-posts/:id /admin/tip-instagrams`)
- 프로모션·공지 (`/admin/promotions /admin/announcements`)
- 사용자 (`/admin/users`) · 문의 (`/admin/inquiries`) · 서비스 대기열 (`/admin/service-waitlist`)
- 에러로그 (`/admin/error-logs`)

## D. 네이티브 (iOS/Android)
- 빌드·**권한 사용설명 문자열** · **ATT/SKAdNetwork** · **IAP/anti-steering** · 홈 위젯 · 딥링크 · (푸시 보류)

## E. 백엔드·데이터
> **도메인 소유권 전수 맵 = `docs/260625_backend_domain_map.md`**(단일 소스). 아래는 감사 차원 체크리스트이고,
> "어느 함수·테이블이 어느 앱 소유인가"는 그 맵을 본다. Phase 3 앱별 감사는 그 맵으로 백엔드를 앱별로 쪼갠다.

- **E1 edge functions(57)** — 도메인: consumer 34(AI·청첩장·결제·동기화) · partners 2(`verify-business`·`notify-inquiry`) ·
  console 11(마케팅 `instagram-*`·상품수집 `product-*`) · shared 10(IAP검증·웹훅·계정). 인덱스 = `supabase/functions/README.md`. (260625 데드/스텁 3개 제거: dewy-studio·ask-gemini·invitation-extract-layout)
- **E2 테이블(123)** — shared/마켓플레이스(견적·`places`·`place_*`·리뷰·결제) ↔ consumer 전용 ↔ partners 전용(`business_*`) ↔ console 전용(모더레이션·콘텐츠). 도메인 타입 뷰 = `src/types/domains/*`.
- **E3 `_shared`(16)** — 인프라 3(`cors`·`supabase`·`jwt`) + consumer 13(결제·AI·동기화). partners/console 전용 0.
- **E4 차원**: **RPC↔클라 인자 정합**(PGRST202) · **RLS 인가**(partners 는 edge 거의 없고 RLS 의존 — 권한상승 회귀 주의) · **마이그 드리프트**(types.ts↔실DB — 260625 재생성 + 미적용 마이그 4건 적용으로 교정, 테이블 140; 맵 §4-1) · 페르소나 20모드 분류 · **큐레이션 게이트**(is_active·moderation·partner_rank) · 검색 인덱스
- **E5 deferred**(맵 §4): 데이터접근 레이어 부재(쿼리 pages 산재) · 마이그 정합 후속(ai_prompts 시드·migration repair·repo 258 vs 적용 150 재정렬). (데드/스텁 함수·types 재생성·드롭객체 4건 마이그 적용은 260625 완료)

---

## 커버리지 표 양식 (감사 문서에 복사해서 채움)

| Surface | 점검 | 14차원 중 본 것 | 발견/이월 |
|---|---|---|---|
| A1 탐색·추천 | ✅/⚠️/⬜ | 예: 보안·dead-end·큐레이션 | … |
| A2 꿀팁 | … | … | … |
| … (A1~E 전부 행으로) | | | |

> ⬜(미점검) 행이 있으면 그 감사는 "전체"가 아니다 — **남은 작업(deferred)**에 surface 명을 적어 다음 감사로 넘긴다.

---

## 개인화 기회 매트릭스 양식 (14차원 — 초개인화)

> 방어(1~13)와 별개로, 각 surface 가 **가용 신호를 충분히 써서 더 개인화할 여지**가 있는지 본다.
> 깊이 단계: ①없음 ②정렬/필터 ③콘텐츠 큐레이션 ④카피/CTA 변형 ⑤생성형 맞춤·추천이유.
> 신호: 페르소나(20모드)·D-day·예산·지역·취향(taste)·진행단계·역할(신랑/신부)·행동로그(찜·조회·검색).

| Surface | 쓰는 신호 | 현재 깊이 | 목표 깊이 | 고도화 포인트 |
|---|---|---|---|---|
| A1 추천/탐색 | 페르소나·지역 | ③ | ④ | 추천 이유 카피·CTA 페르소나화 |
| A2 꿀팁 | 페르소나·단계 | ③ | ④ | "왜 이 영상" 맞춤 헤드라인 |
| A3 일정/보드 | D-day·페르소나 | ③ | ⑤ | 생성형 다음액션 제안 |
| A6 쇼핑/견적 | 예산·지역 | ②~③ | ④ | 예산대별 패키지·맞춤 견적 카피 |
| … (surface 맵 전 행) | | | | |

> **목표>현재**인 행 = 초개인화 고도화 백로그. 감사 문서에 이 표를 채워 "덜 개인화된 곳"을 가시화하고,
> 상위 우선순위를 **남은 작업(deferred)**으로 이월한다. (예시 값은 양식 안내용 — 실제 감사 때 코드 기준 측정.)
