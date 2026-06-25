# 백엔드 도메인 소유권 맵 (260625) — 분리된 프론트에 맞춘 백엔드 정리

> **목적**: 프론트가 `features/{consumer,partners,console}` 로 물리 분리(Phase 1 완료)됐지만 백엔드
> (edge functions · `_shared` · 테이블 · RPC)는 **도메인 경계가 전혀 없는 평면 구조**였다. 이 문서는
> 백엔드의 각 자산을 도메인으로 **매핑**해, 감사(`audit-surface-map.md §E` — 그간 한 줄이던 사각지대)와
> Phase 3 앱별 감사 자동화의 단일 소스를 만든다.
>
> **이 문서가 백엔드 도메인 매핑의 단일 소스다**(드리프트 방지 — 사본 금지). `supabase/functions/README.md`·
> `audit-surface-map.md §E`·`src/types/domains/*` 는 모두 이 문서를 가리킨다.

## 0. 핵심 결정 — 백엔드는 "물리 분리"가 아니라 "도메인 소유권 명시"다

로드맵(`260624_app_separation_roadmap.md §3`)·실행계획서가 확정한 원칙: **Supabase(DB·Auth·Edge
Functions)는 단일 1개 유지.** 마켓플레이스라 소비자↔사업자가 같은 테이블을 주고받고(견적·업체·리뷰),
단일 신원(한 사람이 소비자이자 사업자)이라 Auth 를 쪼개면 SSO·역할전환이 깨진다. 인가는 끝까지 **RLS**가 책임.

따라서 "백엔드 정리 = 분리"가 아니라 **"어느 자산이 어느 도메인 소유인지 명시 + 도메인별 접근 뷰 제공"**이다.

### edge functions 물리 폴더 그룹화는 불가 (Supabase 제약 — 실측 확인)

`supabase/functions/<도메인>/<함수>/` 처럼 도메인 하위폴더로 중첩하면 **배포가 깨진다**:
- `supabase functions deploy`(인자 없음, `deploy-functions.yml`)는 `supabase/functions/` **직속 자식
  디렉터리**를 각각 함수 slug 로 배포한다. `config.toml` 도 평면 `[functions.<name>]` 키.
- Supabase 공식 권장 구조도 함수를 직속 자식으로 두고, 공유 코드만 `_`(underscore) 폴더(`_shared`)에
  둔다("fat functions + `_shared`"). 도메인 중첩은 지원하지 않는다.

→ **대안(채택): 논리 그룹화** — 디렉터리는 평면 유지(배포 안전), 도메인 소유는 **이 문서 + 함수별
헤더 주석 규약**으로 명시. `supabase/functions/README.md` 가 도메인별 함수 인덱스를 제공한다.

---

## 1. Edge Functions × 도메인 (60개)

분류 근거 = **실제 클라이언트 호출처**(`supabase.functions.invoke('fn')` / `/functions/v1/fn` 를
`src/**` 에서 grep). 호출처가 `features/consumer`→consumer, `features/partners`→partners,
`features/console`→console, 공유 hook/lib→shared, 직접 호출처 없음(cron·webhook·함수간 호출)→
**용도·테이블로 분류**(표의 "근거" 열에 `cron`/`webhook`/`internal` 표기).

> ⚠️ **검증 교훈**: 1차 분류(서브에이전트)가 `kakao-pay-order`·`design-purchase`·`gmail-list`·`cal-sync`
> 를 함수명만 보고 "기업용=partners"로 **추측**했으나, 실제 호출처는 전부 `features/consumer` 였다.
> 아래는 호출처 grep 으로 **교정한 실측** 결과다. (AGENTS.md "추측 금지·실제 확인")

### consumer (36) — AI 도구 · 청첩장 · 결제 · 동기화

| 함수 | 설명 | 근거(호출처/트리거) |
|---|---|---|
| ai-planner | AI 웨딩 플래너 채팅(한도 게이트) | consumer + 공유 hook |
| dewy-dress-recommend | AI 드레스 추천 | consumer |
| dewy-fitting | AI 드레스 피팅 | consumer |
| dewy-hair-preview | AI 헤어 프리뷰 | consumer |
| dewy-makeup | AI 메이크업 시뮬 | consumer |
| dewy-makeup-recommend | AI 메이크업 추천 | consumer |
| dewy-sdm | AI 스드메 합본 미리보기 | consumer |
| dewy-studio | AI 스튜디오 | internal(직접 호출처 없음, AI 버킷) |
| invitation-address-search | 청첩장 식장 주소 검색 | consumer |
| invitation-cutout | 청첩장 사진 배경제거 | consumer |
| invitation-illustration | 청첩장 일러스트 변환 | consumer |
| invitation-map | 청첩장 약도 생성 | consumer |
| invitation-retouch | 청첩장 사진 보정 | internal(비동기, photo_retouch) |
| invitation-text-suggest | 청첩장 AI 텍스트 | consumer + 공유 |
| invitation-extract-layout | 🔴 **미완**(index.ts 없음, PROMPT.md 만) | — |
| kakao-pay-ready / -approve | 청첩장 발행 결제 준비/승인 | consumer |
| kakao-pay-order-ready / -approve | 스토어 주문 결제 준비/승인 | consumer(Checkout) |
| kakao-pay-charge-ready / -approve | 하트 충전 결제 준비/승인 | consumer |
| design-purchase-ready / -approve | 청첩장 디자인 구매 준비/승인 | consumer(InvitationMarket) |
| drive-oauth-start / -callback | 하객사진 드라이브 연결 | consumer / webhook(callback) |
| drive-photos | 하객사진 드라이브 관리 | 공유 hook(consumer 기능) |
| drive-sync-cron | 하객사진 자동 동기화 | cron |
| cal-oauth-start / -callback | 캘린더 연결 | 공유 hook / webhook |
| cal-sync | 캘린더 양방향 동기화 | 공유 hook(`useCalendarSync`) |
| mail-oauth-start / -callback | 인앱 메일 연결 | consumer / webhook |
| gmail-list | 인앱 메일 조회 | consumer(MailInbox) |
| photo-enhance-batch | 사진 체형 보정 배치 | consumer |
| wedding-consulting | AI 웨딩 컨설팅 보드 | consumer |
| cleanup-ai-uploads | AI 업로드 30일 정리 | cron(consumer 버킷) |

> 참고: 캘린더·드라이브·메일 동기화는 소비자 기능이지만 호출이 **공유 hook/lib**(`useCalendarSync`·
> `calendarAutoSync`)에 있어 코드상 shared 경유다. 도메인 소유는 consumer.

### partners (2) — 업체 입점 · 리드 알림

| 함수 | 설명 | 근거 |
|---|---|---|
| verify-business | 업체 입점 인증/검증(사업자번호) | partners |
| notify-inquiry | 신규 문의 알림 메일(사업자에게) | webhook(inquiries) — 사업자 수신 |

> partners 전용 edge function 은 **2개뿐**. 사업자 화면의 대부분(상품·쿠폰·리드·배송 관리)은 edge
> function 이 아니라 **PostgREST 직접 쿼리 + RLS**로 동작한다(`features/partners` 의 `.from()`).

### console (11) — 마케팅 파이프라인 · 상품수집 · place 운영

| 함수 | 설명 | 근거 |
|---|---|---|
| instagram-collect-reels | 인스타 릴스 수집 | console |
| instagram-draft-generator | 인스타 카드뉴스 카피 생성 | internal(파이프라인) |
| instagram-card-renderer | 카드뉴스 PNG 렌더 | internal(파이프라인) |
| instagram-publisher | 카드뉴스 발행 | internal(파이프라인) |
| product-search | 외부 상품 검색 | console |
| product-batch-collect | 외부 상품 수집 | console |
| product-resync | 상품 가격/링크 갱신 | console |
| mirror-image | 외부 이미지 Storage 미러링 | console |
| migrate-data | 외부 데이터 마이그레이션 | internal(운영) |
| place-geocode-backfill | places 좌표 백필 | cron/운영 |
| vendor-web-search | 벤더 웹검색(Gemini grounding) | 공유 lib(운영·AI) |

### shared (11) — 인프라 · 결제검증 · 웹훅 (여러 도메인/외부)

| 함수 | 설명 | 근거 |
|---|---|---|
| iap-verify-apple / -google | IAP 영수증 검증(하트·구독) | 공유 lib |
| apple-notifications-v2 | App Store 서버 알림 v2 | webhook |
| play-rtdn | Google Play 실시간 알림 | webhook |
| cancel-subscription | 구독 취소 | 공유 lib |
| delete-account | 계정 완전 삭제 | consumer 호출이나 전 도메인 데이터 파기 → shared |
| send-push | FCM 푸시 발송 | internal(여러 함수가 호출) |
| gmail-send | 메일 발송 | consumer 호출이나 범용 발송 유틸 |
| place-static-map | 공개 정적 지도 | public GET(소비자·청첩장 공용) |
| kakao-chatbot-skill | 카카오톡 챗봇 웹훅 | webhook(외부) |
| ask-gemini | 🔴 **deprecated**(410 응답) | — |

**요약**: consumer 36 · partners 2 · console 11 · shared 11 = **60**. (미완 `invitation-extract-layout`
은 consumer 에, 폐기 `ask-gemini` 는 shared 에 포함 — 별도 버킷 아님.) → **edge function 무게중심은
consumer(AI·청첩장·결제·동기화)와 console(마케팅·수집)**이고, partners 는 거의 PostgREST+RLS 로 동작
(edge 2개)함이 드러난다.

---

## 2. `_shared` × 도메인 (16개)

근거 = `supabase/functions/*/index.ts` 의 `from "../_shared/<file>"` import grep.

| 파일 | 용도 | 사용 함수 | 도메인 |
|---|---|---|---|
| cors.ts | CORS 헤더 단일 소스 | 54 | **shared-infra** |
| supabase.ts | service_role admin 클라이언트 | 24 | **shared-infra** |
| jwt.ts | JWT role 추출(인가) | 4 | **shared-infra** |
| allowedOrigins.ts | 결제 redirect 화이트리스트 | 7 | consumer(결제) |
| iapProducts.ts | IAP 상품 매핑 진실원천 | 2 | consumer(결제) |
| appStore.ts | Apple App Store API 헬퍼 | 2 | consumer(결제) |
| googlePlay.ts | Google Play API 헬퍼 | 2 | consumer(결제) |
| llm.ts | LLM 모델 식별자 단일 소스 | 13 | consumer(AI)·console(AI) |
| prompts.ts | AI 프롬프트 DB 런타임 조회 | 2 | consumer·console(AI) |
| calendarRegistry.ts | provider 레지스트리 | 3 | consumer(일정) |
| calendarSync.ts | 캘린더 정합화 코어 | 1 | consumer(일정) |
| googleCalendar.ts | Google Calendar 어댑터 | 간접 | consumer(일정) |
| kakaoCalendar.ts | Kakao 톡캘린더 어댑터 | 간접 | consumer(일정) |
| googleDrive.ts | Google Drive 헬퍼 | 2 | consumer(하객사진) |
| googleMail.ts | Gmail/Drive 헬퍼 | 4 | consumer(메일) |
| driveSyncCore.ts | 하객사진 동기 코어 | 2 | consumer(하객사진) |

**관찰**: `_shared` 는 사실상 **인프라 3개 + consumer 13개**다(partners·console 전용 공유모듈 0).
llm/prompts 만 console(AI) 과 공유. → `_shared` 는 도메인 분리보다 "인프라 vs consumer-기능" 축이 강하다.
무리한 폴더 분리보다 **현 평면 유지 + 이 표로 소유 명시**가 적절(파일 16개 규모).

---

## 3. 테이블 × 도메인 (123개, types.ts 기준)

근거 = `src/features/<d>/**` 의 `.from('table')` grep 교집합. 2+ feature 사용 → **shared**.
직접 클라 참조 없는 테이블(edge/RPC/RLS 전용) → 용도·이름으로 분류(표의 "비고").

### shared / 마켓플레이스 (양방향·공용) — 도메인 분리 금지

- **마켓플레이스 핵심**: `places`, `place_*`(상세·갤러리·홀·스튜디오·드레스·메이크업·한복·주얼리·
  honeymoon·tailor·appliance·invitation_venues·media·sources — 16종), `place_reviews`, `place_inquiries`,
  `inquiries`, `products`, `favorites`
- **견적(consumer 작성 → partners 수신)**: `quote_requests`, `quote_request_targets`, `quote_responses`, `quote_messages`
- **결제/커머스**: `payments`, `subscriptions`, `billing_attempts`, `orders`, `order_items`, `cart_items`,
  `point_transactions`, `heart_transactions`, `user_hearts`, `user_points`
- **계정/인프라**: `profiles`, `user_roles`, `user_consents`, `app_config`, `app_notifications`, `client_error_logs`
- **AI 시뮬 공유(consumer 생성 ↔ console 큐레이션)**: `dress_fittings`, `dress_samples`, `hair_samples`,
  `makeup_samples`, `invitation_assets`, `invitation_templates`, `business_products`, `business_coupons`, `business_events`

### partners 전용 (사업자만 read/write)

- `business_profiles`, `partnership_applications`, `place_claims`, `deal_claims`, `partner_deals`
- (대부분 마켓플레이스 공유 테이블에 RLS `auth.uid()=owner` 로 자기 행만 — 별도 전용 테이블은 소수)

### console 전용 (운영자·service_role)

- **모더레이션/운영**: `agent_outputs`, `community_reports`, `product_blocklist`, `place_exclusions`,
  `geocode_admin`, `geocode_backfill_log`, `collection_logs`, `vendor_board_items`, `service_waitlist`
- **마케팅/콘텐츠**: `instagram_post_drafts`, `tip_instagram_accounts`, `tip_instagrams`, `tip_videos`,
  `tip_blogs`, `tip_channels`, `influencers`, `influencer_contents`, `blocked_blog_authors`,
  `promotional_events`, `product_seed_keywords`, `naver_search_cache`, `product_search_cache`
- **AI 운영**: `ai_prompts`, `invitation_fonts`

### consumer 전용 (소비자 본인 데이터)

- **AI/개인화**: `ai_chat_sessions`, `ai_chat_messages`, `ai_usage_daily`, `ai_usage_minute`, `user_ai_memory`,
  `hair_preview_jobs`, `hair_preview_usage`, `photo_retouch_jobs`, `photo_retouch_usage`,
  `makeup_fittings`, `wedding_consulting_reports`, `wedding_consulting_usage`
- **준비도구**: `budget_items`, `budget_settings`, `guest_list_items`, `user_schedule_items`,
  `user_wedding_settings`, `couple_links`, `couple_votes`, `couple_diary`, `couple_diary_photos`,
  `family_invites`, `invitations`, `invitation_rsvp`
- **커뮤니티**: `community_posts`, `community_comments`, `community_likes`, `community_comment_likes`,
  `community_post_places`, `community_announcements`, `community_notifications`, `user_blocks`
- **성장/리텐션**: `referrals`, `referral_codes`, `game_scores`, `user_attendance`, `user_streaks`,
  `user_events`, `view_events`, `product_clicks`, `coupon_downloads`, `tutorial_tours`, `tutorial_completions`

> **주의(분류는 "주 소유"일 뿐)**: 정확한 인가는 **RLS**가 결정한다. 이 표는 코드 소유·감사 네비게이션용
> 이지 RLS 정책 대체가 아니다. 도메인 타입 뷰(`src/types/domains/*`)도 이 분류를 따른다.

---

## 4. 발견 — 정리하며 드러난 것 (deferred / 후속)

1. **types.ts 드리프트(8)** — features 가 쓰는데 types.ts 에 없는 식별자: `admin_reports_overview`(뷰),
   `design_purchases`, `designer_designs`, `invitation_guest_photos`, `place_media_albums`, `sdm_previews`,
   `user_consents_canonical`, `user_mail_accounts`. → 일부는 뷰/신규 테이블. **types.ts 재생성 필요**
   (`mcp__Supabase__generate_typescript_types`). 검증 섹션 "마이그 드리프트" 회귀 위험.
2. **데이터 접근 레이어 부재** — 세 feature 모두 DB 호출(`.from()`/`rpc`/`invoke`)이 **pages 에 분산**.
   `data/` 폴더엔 가이드 정적데이터만. → 도메인별 `data/` 접근 레이어로 추상화하면 감사·재사용·테스트가
   쉬워짐(현재는 페이지마다 쿼리 산재). **표적 리팩터로 후속**(이번 범위 밖 — 광범위 변경).
3. **partners 는 edge 거의 없음** — 사업자 기능은 PostgREST+RLS 의존도가 압도적(edge 2개). → partners
   백엔드 감사는 **RLS 정책 중심**으로 봐야 함(`audit-surface-partners.md` 의 권한상승 회귀와 일치).
4. **미완/폐기 함수 2** — `invitation-extract-layout`(index.ts 없음), `ask-gemini`(410 deprecated). →
   정리(삭제 또는 완성) 후속 판단 필요.
5. **console edge 의 internal 파이프라인** — instagram-* 4종은 함수간 호출(draft→render→publish). 직접
   클라 호출처 없음 → 감사 시 "호출 그래프"로 추적해야(단순 grep 으론 누락).

---

## 5. 산출물 (이 정리에서 만든 것)

| 산출물 | 위치 | 역할 |
|---|---|---|
| 백엔드 도메인 맵(이 문서) | `docs/260625_backend_domain_map.md` | **단일 소스** — functions·_shared·테이블 소유 |
| 함수 도메인 인덱스 | `supabase/functions/README.md` | 평면 유지 이유 + 도메인별 함수 인덱스(이 문서 가리킴) |
| 도메인 타입 뷰 | `src/types/domains/{consumer,partners,console,shared}.ts` | 각 도메인 테이블 타입만 re-export(6,749줄 전체 X) |
| 감사맵 §E 확장 | `docs/audit-surface-map.md` | 한 줄 → 구조화 + 이 문서 가리킴 |

> 본 정리는 **문서·타입뷰(저위험 additive)** 까지다. 물리 이동(함수/_shared 폴더)·데이터레이어 리팩터·
> types.ts 재생성은 위험/광범위라 **deferred**(§4)로 이월하고 임의 착수하지 않는다.
