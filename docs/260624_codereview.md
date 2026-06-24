# 260624 전체감사 (코드리뷰·보안감사) — 레포 전체 × 전 surface × 14차원

> 방식: surface별 7개 병렬 서브에이전트 fan-out(A1~A3·A4~A5·A6~A7·B·C·D·E) → 각 14차원 + dead-end UI 차원
> 감사 → 본 문서로 종합. 모든 발견은 **실제 코드·마이그레이션·types.ts 교차확인** 기반(서브에이전트 오탐은
> 검증으로 기각). **한계: sandbox 라 실DB(information_schema)·런타임 e2e 미수행** — RPC 정합/RLS는 소스
> 레벨 검증, 결제는 코드 경로 검증(실기기 e2e 권장). 본 세션은 **발견·기록**이며 수정은 후속 PR.

## TL;DR (핵심 성과)
- **P0 9건 · P1 ~16건 · P2 다수**. 결제 코어·RPC 정합·admin RPC 인가·큐레이션 게이트는 **견고**(서브에이전트
  P0 주장 다수가 오탐으로 기각됨 — 결제 race/이중발급/금액변조 없음).
- **진짜 위험은 ① 데이터 생명주기(AI 사진·탈퇴 콘텐츠 미파기) ② 모더레이션 무동작(조용한 실패) ③ 기업
  cross-tenant write RLS 구멍 ④ iOS 미패키징 ⑤ 커머스 법적·배송 누락**.
- "동작하는 척" 회귀(조용한 실패)가 **2건**(AdminContentReview RLS, admin_review_product/event RPC) —
  AGENTS.md 검증 규칙의 핵심 함정에 정확히 해당.

## 커버리지 표 (audit-surface-map.md 기준)

| Surface | 커버리지 | 주요 발견 |
|---|---|---|
| A1 탐색·추천 | ✅본 | P1 Favorites jewelry 매핑, aria-label |
| A2 꿀팁 | ✅본 | Tips persona boost 정상(③). Magazine 라우트 부재→맵 갱신 |
| A3 준비도구 | ✅본 | raw localStorage 다수(P1), 예산 클램프(P2) |
| A4 AI | ✅본(페이지19+edge8 전수) | **P0 사진 미파기·비용게이트·verify_jwt** |
| A5 청첩장 | ✅본(진입점 위주) | P0 guest-photos 미파기, ⚠️ InvitationStudio 136KB 표층 |
| A6 커머스·결제·견적 | ✅본 | **P0 Checkout 배송·법적 누락·OrderComplete 인가** |
| A7 커뮤니티·계정·CS | ✅본 | **P0 탈퇴 콘텐츠 고아화**, P1 차단목록 부재 |
| B 기업(관리 전수) | ✅본(18관리항목) | **P0 cross-tenant write RLS** |
| C 운영자(C1~C5) | ✅본 | **P0 ContentReview 무동작·RPC 불일치**. ⬜ InvitationTemplates 62KB deferred |
| D 네이티브·출시적합성 | ✅본 | **P0 iOS 미패키징**. Android P0 없음 |
| E 백엔드·데이터 | ✅본(RPC 65콜 전수)·⚠️일부 | P1 gmail-send 인젝션. RLS 매트릭스 전수 ⬜ |

---

## 1. 보안·인가 (차원 2)

### P0
- **[P0][B] 기업 cross-tenant write — INSERT RLS 가 `place_id` 소유 미검증.** `business_products`·
  `business_coupons`·`business_events`·`place_media`·`place_media_albums`·`vendor_deliveries` 의 INSERT 정책이
  `WITH CHECK (owner_user_id = auth.uid())` 뿐. 직접 API 호출로 `owner_user_id`=본인 + `place_id`=**타 업체**
  위조 시 통과 → 경쟁사 상세페이지에 상품/이벤트/사진 부착. **쿠폰이 최악**(SELECT `USING(true)`+모더레이션 없음
  → 위조 즉시 공개). 수정: 각 INSERT/UPDATE 에 `AND EXISTS(SELECT 1 FROM places p WHERE p.place_id=…place_id
  AND p.owner_user_id=auth.uid())`. (`places.owner_user_id` 확인 — 마이그 `20260521050000`.)
- **[P0(code)/P2(runtime)][A6] `src/pages/OrderComplete.tsx:27-31`** — 주문을 `id`만으로 조회(user_id 필터·
  로그인 게이트 없음). orders RLS(`auth.uid()=user_id`)가 막아 실노출은 P2지만 코드 fragile. 수정: `.eq("user_id")` + 게이트.

### P1
- **[P1][E] `supabase/functions/gmail-send/index.ts:84-85`** — 첨부 `filename`이 MIME 헤더에 무살균 보간 →
  인증 사용자가 `\r\nBcc:` 포함 파일명으로 **헤더 인젝션(BCC 등)** 가능. (`to`는 정규식·`subject`는 base64라 안전 —
  실제 벡터는 filename.) 수정: filename `[\r\n"]` 제거/거부.
- **[P1][A6] `vendor_deliveries` UPDATE 컬럼잠금 트리거 없음**(`20260616020000:43-46`) — 수령자가
  status/received_at 외 title·message·file_paths·owner_user_id 변조 가능(inquiries 는 잠금 트리거 보유). 클라
  (`useVendorDeliveries.ts:55-63`)도 `.eq("recipient_user_id")` 누락. 수정: `guard_inquiry_user_update` 미러 트리거 + 클라 필터.

### 검증 PASS (견고 — 오탐 기각)
- RPC 인자↔시그니처: 클라 65콜 × ~64함수 전수, 불일치 0 / PGRST202 0(E). admin RPC 전수 SECURITY DEFINER
  `has_role(admin)` 게이트 내장. AI edge 8종 JWT+소유권(`path.startsWith(userId/)`) 게이트. delete-account 는
  `getUser(token)` 본인만. vendor-web-search 무인증 401 선반환. 결제 멱등(`UNIQUE(payment_key)`·spend_hearts 원자적).

---

## 2. P0 버그 (정확성·백엔드)

- **[P0][C] `AdminContentReview.tsx:116-150` 모더레이션 무동작(조용한 실패).** approve/reject 가
  `business_events`/`business_coupons` 에 **raw `.update({moderation_status})`** — 그러나 두 테이블엔
  **admin UPDATE 정책이 없음**(owner UPDATE + admin SELECT 만, `20260527123753`). 어드민 update 0행 매칭 →
  에러 없이 성공 → "승인됨" 토스트 뜨고 항목은 그대로 pending. **기업 콘텐츠 모더레이션 전량 무동작.**
  수정: `AdminBusinessReview` 의 SECURITY DEFINER RPC 재사용 또는 admin moderation RPC 신설. raw update 금지.
- **[P0-의심·실DB확인필요][C↔E 상반] `admin_review_product`/`admin_review_event` 인자 정합.** C 에이전트:
  클라(`AdminBusinessReview.tsx:127,138`) 3인자(`p_id,p_approved,p_note`) vs `types.ts:6195-6214` 2인자 →
  PGRST202 로 이벤트/상품 승인 전량 실패 주장. **E 에이전트: 65콜 전수 정합, 불일치 0 주장(상반).** → 둘 중 하나가
  부정확. **실DB `\df admin_review_product` 직접 조회로 확정 필요**(sandbox 미수행). 결론 보류, 배포 전 1회 확인.
- **[P0][A4] `wedding-consulting` verify_jwt 모순.** 코드는 `verify_jwt=false` 전제(x-internal-secret 게이트)인데
  `config.toml` 에 스탠자 없음 → 기본 true. 보드 self-invoke 가 Bearer 없이 호출 → 401 → 컨설팅 보드 영영 미생성
  (reaper 환불까지 processing). 수정: `[functions.wedding-consulting] verify_jwt=false` 추가. (런타임 e2e ⬜.)

### P1
- **[P1][A4] `DressRecommend.tsx:162-165`/`MakeupRecommend.tsx:158-161`** — `fittingId` null 가드 없이
  `navigate(/result/${fittingId})` → `/result/undefined` dead page(하트 이미 소진). + 비동기 생성 직후 "생성 완료!"
  **허위 toast**(실제 pending). 수정: null 가드 throw + `addPendingJob`.
- **[P1][A7] `delete-account` 비원자성**·**[P1][C] `AdminReports.tsx:121-135`** 신고 콘텐츠 삭제 후 status
  업데이트 실패 시 orphan. 수정: 단일 RPC 트랜잭션.
- **[P1][A6] `earn_hearts`(`hearts_system.sql:168`) 멱등 아님** — `heart_transactions(ref_id)` UNIQUE 없음.
  현재 외부 `payment_key UNIQUE` 가 막지만 구독보너스·환불·IAP 재사용처는 재시도 시 이중발급. 수정: 부분 UNIQUE.
- **[P1][B] `BusinessGallery.tsx:99-132`** 앨범 insert 후 미디어 insert 실패 시 빈 앨범 고아. 수정: RPC 묶기.
- **[P1][C] admin 더블클릭 레이스**(`AdminUsers.tsx:127-146` tier 등) — in-flight 비활성 부재.

---

## 3. Dead-end UI / placeholder CTA (필수 차원)
- **[P0][A6] `Checkout.tsx`** — 배송지/받는분/연락처 **미수집** → 모든 물리배송 주문 shipping NULL(업체 배송 불가).
  Orders/OrderComplete 는 이 값을 **표시**하므로 실데이터 dead-end. (법적 누락은 §법적 참조.)
- **[P1][A7] 차단(Block) 영구 해제 불가** — `BlockUserDialog.tsx:41` 안내는 "설정→차단목록 해제"인데 **차단목록
  화면 없음 + `useUnblockUser` 호출처 0(dead code)** → App Store 1.2 갭. 수정: 차단목록 관리화면 신설·연결.
- **[P1][A7] `AccountDeletion.tsx:35-44` 탈퇴 안내 경로 오류** — "설정→계정관리→회원탈퇴"인데 실제는 /settings 직접
  버튼(서브메뉴 없음), `/account-deletion`은 어디서도 링크 안 됨(탈퇴 자체는 동작). 수정: 문구 정정.
- **검증 PASS**: 미입점 '문의하기' 토스트 회귀는 **수정됨**(`PlaceDetailLayout.tsx:301-371` claimed→인앱시트/미입점→
  견적매칭). 기업·운영자·AI surface 의 생성/저장/발행/공유 CTA 는 실제 end-to-end(placeholder 아님).
  WeddingPhotoRefs·AIStudio coming_soon 은 의도된 우아한 폴백(waitlist 시트).

---

## 4. iOS / 사파리(웹) (차원 7)
- **[P1][A1~A7 광범위] raw localStorage** — `MergeGame.tsx:42,190`, `tasteQuiz.ts:83,91`, `Notifications.tsx:38,69`,
  `Index.tsx:56`(try-catch는 있음), useSessionTimer/usePageTutorial 등. **`safeLocalStorage` 단일화** 필요(iOS 프라이빗·드리프트).
- **[P2][A4] HEIC 미변환(전 업로더 + GuestPhotoUpload)** — `accept=image/heic` 받지만 변환 안 함 →
  `InvitationPhotos.tsx:184` `<img>` Android/Chrome 깨짐, makeup-uploads mime allowlist(jpeg/png/webp)라 raw 에러.
  수정: heic2any 변환 + mime 정렬. + `MakeupFitting.tsx:168` 클라 20MB vs 버킷 5MB 한도 불일치.
- **[P2][B/A4] 긴 폼 draft 미적용** — `BusinessOnboard`(PII 폼), `AIPlanner.tsx:737`, 견적/문의 답변 — `useTextDraft`/
  `formDraft` 미사용(형제 DetailForm 은 씀 → 불일치). iOS 탭폐기 유실.
- **[P2][A4] `PhotoFix.tsx:263` 13px 입력 → iOS 줌**(≥16px 권장).

---

## 5. 출시 적합성 (스토어 컴플라이언스, 차원 8) — 네이티브 별도
- **[P0][D] iOS 네이티브 프로젝트 부재.** `ios/` 디렉토리·Info.plist 0개. 그런데 코드는 iOS 정식 타겟
  (`getPaymentProvider()` ios→"iap", Apple IAP 풀구현, `adService.ts:84` ATT 호출). 현 상태로 iOS 빌드 시
  `NSUserTrackingUsageDescription`·`SKAdNetworkItems`·`GADApplicationIdentifier`·`NSPhotoLibrary…` **전부 누락**
  → AdMob 켜진 채 ATT 문구 없으면 추적요청 **크래시·5.1.2 반려**(회귀 시나리오). 수정: `npx cap add ios` + Info.plist
  4종 키(`docs/260622_appstore_submission_runbook.md §11`). iOS 미출시면 `getPaymentProvider()` ios→`"unavailable"` 강등.
- **Android 검증 PASS**: 권한 선언 교차확인 통과(카메라/사진/위치 미사용 — web input 만), ATT 코드 정상(iOS Info.plist만
  미존재), AdMob App ID·IAP anti-steering(네이티브에서 웹결제 UI 숨김)·회원탈퇴·UGC 신고/차단·딥링크·graceful init 정상.

---

## 6. 안정성(복원력) (차원 9)
- **[P2][A1] 에러/빈상태 미구분** — `PersonaRecommendationRows.tsx:25-26`, `Tips.tsx:317-319`(실패도 "모으는 중"
  표기 → 영구 빈영역 오인). 수정: loading/error/empty 3상태.
- 부팅 안정성(ErrorBoundary+Suspense)·네이티브 graceful init 은 PASS(D).

---

## 7. 법적 / 전자상거래 (차원 10)
- **[P0][A6] `Checkout.tsx`** — 사업자정보·이용약관 동의·환불/청약철회 고지·미성년자 결제보호 **전무**(전자상거래법).
- **[P1][A6] 미성년자(만19세미만) 결제보호 고지 부재** — `HeartCharge.tsx`·`SubscriptionCheckout.tsx`(구독엔
  사업자정보/약관 링크 자체 없음). 환불·청약철회 고지는 있음.
- **[P1][B] `BusinessOnboard.tsx:177-291`** 사업자번호·대표자명(PII) 제출 전 **약관·개인정보 수집·이용 동의 없음**.
- **[P2][A6] Contact/QuoteNew/PlaceInquirySheet** 연락처 수집 시 개인정보 수집·이용 동의 고지 부재.

---

## 8. 비용 / 쿼터 (차원 11)
- **[P0][A4] `invitation-cutout`(remove.bg 유료, :83-171)·`invitation-illustration` portrait(:186-188)** — 호출당
  하트차감·레이트리밋·path cap 없음 → 인증유저 직접 invoke 로 크레딧 무한 소진. 과금이 publish 시점으로 미뤄짐.
  수정: 호출당 heart hold 또는 per-user 일일 quota + path cap.(대조: text-suggest/retouch 는 선차감+실패환불 정상.)
- **[P1][A4] `invitation-retouch:111-118`** 첫무료 read-then-write 레이스(동시 2요청 둘 다 무료). 수정: 원자적 claim.
- **[P1][A4] `ai-planner:170 vs 342-364`** usage 증가가 스트림 시도 **전** → 503 실패 시 무료질문 소진·환불 없음.
- **[P2][E] `dewy-studio`** 유료 API 호출 전 게이트 없음 — **단 호출처 0(데드)** 이라 latent. 배선 시 게이트 필수.
- **[P2][A4] `AIPlanner` 입력 길이 무제한**(maxLength·서버 clamp 없음) → 대용량 paste 풀토큰.

---

## 9. 접근성 (차원 12)
- **[P1][A2] `Influencers.tsx:80,138,157`** 아이콘 버튼 `aria-label` 없음.
- **[P2][A2] `Gallery.tsx:60`** 이미지 버튼 aria-label 없음. **[P2][A2] `InfluencerDetail.tsx:152`** `<div onClick>`
  (button 아님·키보드 접근 없음).

---

## 10. 개인정보 / 데이터 거버넌스 (차원 13) — 이번 감사 최대 갭
- **[P0][A4] AI 얼굴/신체 사진 자동삭제 누락.** `cleanup-ai-uploads/index.ts:36` `TARGET_BUCKETS=["dress-uploads",
  "dress-results"]` + RPC(`20260604050355`) IN() 도 dress 만. **미커버**: `makeup-uploads/results`, `sdm-uploads/results`,
  `invitation-uploads/*/{hair,consulting,enhanced}`(PhotoFix 포함), **`guest-photos`(하객 얼굴)**. "30일 자동삭제"
  약속·개인정보 위반. 수정: TARGET_BUCKETS·RPC 에 makeup/sdm 추가 + invitation-uploads AI prefix·guest-photos sweep
  + delete-account 동반 purge.
  - **✅ 수정(260624, 마이그 적용 대기)**: `260624120000_expand_ai_cleanup_buckets.sql`(makeup 버킷 +
    invitation-uploads AI prefix consulting/hair/photofix/enhanced 추가, 경로 패턴 실DB 검증) +
    `cleanup-ai-uploads/index.ts` TARGET_BUCKETS 확장. guest-photos 는 청첩장 생명주기·탈퇴 시 파기로 분리.
- **[P0][A7] 회원탈퇴 콘텐츠 고아화 — 실DB 확정.** `pg_constraint` 직접 조회 결과 **auth.users 참조 FK 가
  0개**(CASCADE 전무) → `delete-account` 의 "CASCADE 로 삭제" 주석은 **거짓**, user_id 보유 **67개 테이블 전부**
  탈퇴 후 고아(커뮤니티·프로필·일정·예산·AI 기록 등).
  - **✅ 수정(260624, 마이그 적용 대기)**: `260624120100_delete_user_data_rpc.sql`(개인 콘텐츠 ~52테이블 명시
    DELETE, 금융·거래·동의 11테이블은 법적 보존) + `delete-account/index.ts` 가 RPC 선호출(실패 시 중단) +
    스토리지 버킷 완비(dress/makeup 결과·guest-photos). **⚠️ 금융기록 보존/삭제 분류는 정책 선택 — prod 적용
    전 법무 확인**.
- **[P1][A4] OpenAI 원시 에러 클라 노출** — `dewy-makeup-recommend:137`/`dewy-dress-recommend:149`
  `detail: errText.substring(0,200)`(요청ID·정책문구). 수정: 서버 로깅, 클라 제네릭.
- **[P1][C] `AdminErrorLogs`(~248,274,277)** message/url/stack raw 노출(토큰·이메일·PII 잔존 가능). 수정: 캡처 시점 마스킹.
- **[P2][C] `AdminUsers:272` 이메일 평문**, **[P2][B] `useVendorDeliveries` raw error 로깅**.

---

## 11. 초개인화 기회 매트릭스 (차원 14, surface × 신호 × 현재깊이→목표)

| Surface | 가용 신호 | 현재 | 목표 | 액션 |
|---|---|---|---|---|
| A1 카테고리목록 | 페르소나20·지역·taste | ② | ③ | 모드별 카테고리 prominence + taste 를 홈/유사업체 rerank 에 반영(현재 `/taste`에 갇힘) |
| A2 Gallery/Influencers | 페르소나·단계 | ① | ②~③ | "당신을 위한" persona 필터행·featured (Tips 는 이미 ③) |
| A3 Schedule/Board | phase·페르소나 | ② | ③ | phase별 must-do 큐레이션(임신모드→검진 상단), Board 슬롯 재정렬 |
| A4 Dress/Makeup Recommend | personaMode·taste | ② | ④~⑤ | `buildDressPromptAddendum` 가 personaMode/taste 미반영(신호 수집 후 폐기) → 주입 + 추천이유 |
| A5 청첩장(Flow/Market) | 20모드·톤·taste | ① | ③ | 템플릿 created_at 정렬뿐 → persona 큐레이션·정렬 |
| A6 쇼핑/하트충전 | 예산·지역·D-day·행동 | ①~② | ④ | 예산대 패키지 정렬·"D-30, 투어3회 남음" 추천이유 CTA |
| B 리드/대시보드 | D-day·예산·지역·실측지표 | ② | ③~④ | 리드 우선순위+"빠른답변 권장" 카피, 업체 실측 기반 맞춤 액션 |

---

## 12. 공통화 · 도메인 · 규칙
- **DRY**: `safeLocalStorage` 단일화(다수), 커뮤니티 카테고리 상수(`CommunityEdit` 5 vs Write 12), `(supabase as any)`
  캐스트 제거(타입 생성)로 RLS 의존을 코드로 검증.
- **모더레이션 중복 구현**: 이벤트/상품을 ContentReview(raw, 깨짐) + BusinessReview(RPC, 인자의심) **두 경로** —
  하나로 통합 권장.
- 외부 상품 링크 `safeUrl` 미경유(`Store.tsx:153`) — ProductDetail 패턴으로 통일.

## 13. 검증 인프라 · 한계 · deferred(이월)
- **한계(필수 명시)**: sandbox 라 ① 실DB `information_schema`/`\df` ② 런타임 e2e ③ 결제 실기기 미수행. RPC 정합·RLS·
  멱등은 **소스 레벨**(types.ts·마이그·코드 경로) 검증. 실환경 확인 권장 항목: admin_review_product/event 시그니처,
  community FK, business INSERT RLS 실적용, HEIC 실모델.
- **deferred(미점검·이월)**:
  - C: `AdminInvitationTemplates.tsx`(62KB)·`AdminTemplateEditor.tsx`(35KB) 깊은 감사.
  - A5: `InvitationStudio`(136KB) 진입점 위주 → 내부 로직.
  - E: 클라 직접 `.from()` 쿼리의 **테이블별 RLS 매트릭스 전수**, OAuth 콜백(drive/mail/cal) 토큰저장 RLS.
  - A4: `invitation-extract-layout` 미구현 stub(호출자 0 — 제거/구현 확인), `dewy-studio` 데드 함수 제거/게이트.
  - 문서: `audit-surface-map.md` 의 `/magazine` 라우트 부재 반영, `admin_ai_job_stats`·`claim_mission_bonus` repo .sql 백필.

## 14. 권장 조치 우선순위 (후속 PR 분리)
1. **P0 데이터 파기**: cleanup-ai-uploads 버킷 확장(makeup/sdm/hair/consulting/photofix/guest-photos) + delete-account
   커뮤니티 콘텐츠 purge/익명화. (개인정보·법적, 가장 시급)
2. **P0 모더레이션 복구**: ContentReview RLS/RPC 일원화 + admin_review_product/event 시그니처 실DB 확정.
3. **P0 기업 RLS**: business_* INSERT/UPDATE 에 place 소유 EXISTS 가드 + 쿠폰 모더레이션.
4. **P0 커머스**: Checkout 배송폼 + 전자상거래 법적 고지(사업자·약관·환불·미성년자).
5. **P0 비용 게이트**: invitation-cutout/illustration-portrait 하트·레이트리밋.
6. **P0 iOS**: cap add ios + Info.plist 4종(또는 payment provider 강등).
7. **P0 컨설팅**: wedding-consulting verify_jwt=false 스탠자.
8. P1 묶음: gmail-send 살균, vendor_deliveries 트리거, earn_hearts 멱등, Recommend null 가드+허위toast, 차단목록 화면,
   미성년자 고지, safeLocalStorage 통일, aria-label.
