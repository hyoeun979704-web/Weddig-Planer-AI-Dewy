# 260626 전체 코드리뷰·보안 감사 (14차원 × 전 surface)

방식: `docs/audit-surface-map.md` 기준 surface 별 병렬 서브에이전트 8개(A1·A2+A3·A4+A5·A6·A7·B·C·D+E)가
각자 14차원(AGENTS.md)으로 정독. 각 발견은 file:line 근거. **검증 한계: 전부 정적 코드·마이그
파일 기준이며 실 DB RLS 적용·런타임 e2e·실기기(IAP/ATT)는 미실행** — P0/P1 은 실환경 확인 권장.

## TL;DR — 핵심 성과

- **P0 7건**(즉시 위험): SDM 얼굴사진 30일 미파기(개인정보) · 구독결제 이중승인 가드 누락 · 청첩장
  마켓 디지털재화 IAP 미적용(스토어 반려) · iOS 권한문구/SKAdNetwork 부재(광고 켜진 채, 반려/크래시) ·
  청첩장 일러스트 무과금 생성루프(비용폭주) · 쿠폰 admin 검토 dead-end(RLS 부재) · CommunityEdit 카테고리
  불일치로 페르소나글 수정불가.
- **공통 강점 확인**(회귀 방지): 결제 서버검증·멱등·anti-steering·JWT 인가·service_role 미유출·
  업체 권한상승/cross-tenant 차단(20260624/25 마이그)·탈퇴 파기 흐름·하트 환불 경로 — **견고**.
- **dead-end CTA**: 신규 사용자-가시 고장 2건(Influencers 필터 no-op · 쿠폰 admin 검토). 나머지
  주요 CTA(문의·견적·신고·차단·탈퇴·답글)는 전부 실제 write 연결 — placeholder 토스트 없음.
- **초개인화**: 방어차원은 양호하나 **개인화 깊이 불균형** — Tips/Budget=④⑤(우수), 메이크업·헤어·SDM·
  마켓·커뮤니티 트렌딩=①(전원 동일). 교차 surface 신호 사일로(taste 가 VendorList 만 소비).

## 커버리지 표 (audit-surface-map 기준)

| Surface | 점검 | 본 14차원(요지) | 발견/이월 |
|---|---|---|---|
| A1 탐색·추천·상세·비교·찜 | ✅ | 1·2·3·5·6·7·9·12·14·큐레이션·dead-end | deleted_at 게이트 누락·moderation RLS 의존·추천 개인화 사일로 |
| A2 콘텐츠·꿀팁 / A3 준비도구 | ✅ | 1·dead-end·큐레이션·11·7·12·13·14 | Influencers 필터 no-op·CoupleVote 인가/LLM쿼터·예산 오도카피 |
| A4 AI / A5 청첩장 | ✅ | 1·2·9·11·13·14·dead-end·RPC정합 | **P0 SDM 미파기**·하트단가 드리프트·폴링 deps·뷰어 null가드 |
| A6 커머스·결제 | ✅(Deals/Coupons상세 ⬜) | 2·8·9·10·11·dead-end·정확성 | **P0 구독 이중승인·마켓 IAP**·Premium FAQ 오인·금액 미대조 |
| A7 커뮤니티·계정·CS | ✅(알림/메일 ⬜) | 1·2·8·9·12·13·dead-end | CommunityEdit 카테고리·탈퇴 문서/RPC 불일치·좋아요 race |
| B 기업(관리 전수) | ✅ | 2·1·9·7·3·14 | 보안 회귀 차단 확인(양호)·대시보드 favorites item_type·designer place_id(플래그off) |
| C 운영자(28개 전수) | ✅(wedding-photo-refs ⚠️스텁) | 2·1·11·dead-end·RPC정합·13 | **P1 쿠폰 admin RLS 부재 dead-end**·pending 카운트 오염 |
| D 네이티브 / E 백엔드 | ✅ native config·edge 표본22/57 | 8·2·9·11·RPC정합 | **P0 iOS plist 부재·일러스트 무과금**·이미지함수 시간쿼터 부재 |

⬜(이월): A6 Deals/Honeymoon/Coupons 상세·MyDeliveries · A7 Notifications/MailInbox/FAQ/Tutorial(특히 Gmail OAuth 토큰 거버넌스) · C invitation-templates 좌표로직 · E `iap-verify-apple`·OAuth(cal/drive/mail)·instagram/product 파이프라인.

## 1. 보안·인가

- **양호(회귀 차단 확인)**: 업체 권한상승(`business_profiles` self-UPDATE → partner_tier/approval/commission)·
  cross-tenant write 는 `20260625120000`·`20260624130000` 트리거/RLS 로 차단. admin 권한작업은 전부
  SECURITY DEFINER + `has_role('admin')` RPC. 결제 승인 서버 금액검증·멱등·user 바인딩(kakao/iap). JWT 인가
  AI함수 12종 전부. service_role 클라 미유출. (근거: B·C·D+E 리포트)
- **⚠️ RLS 의존 표면**(클라 게이트 없음 — RLS 가 유일 방어, 실DB 검증 필요):
  - `CoupleVoteDetail.tsx:67-82,137-152` 비멤버가 vote id 로 직접 투표/결정 호출 가능(클라 멤버십 게이트 부재).
  - 소비자 place 쿼리 전반이 `moderation_status` 게이트 없이 RLS 의존(`usePlaceRecommendations`·상세).
- **P1 dead-end(인가 누락)**: `contentReview.ts:82-88` 쿠폰 admin 검토가 `business_coupons` UPDATE 하나
  admin UPDATE RLS 가 없어 **0행 매칭 → "성공" 토스트만**(코드도 P0 자인). → `admin_review_coupon` RPC 또는 admin RLS 추가.

## 2. P0 버그 (즉시)

| # | 영역 | 파일:라인 | 문제 | 수정 |
|---|---|---|---|---|
| P0-1 | 개인정보 | `migrations/20260624120000_expand_ai_cleanup_buckets.sql:8,19` | `sdm-uploads`·`sdm-results`(얼굴사진, `20260620000000`에서 실제 생성)가 `list_expired_ai_uploads` 누락 → 30일 자동삭제 안 됨(방침 위반) | 두 버킷을 cleanup 목록에 추가 |
| P0-2 | 안정성/결제 | `SubscriptionPaymentSuccess.tsx:22,80-81` | `approvedRef` 선언만·미사용 → effect 재실행/StrictMode 로 구독 승인 RPC 2회(이중활성·하트 이중지급) | 타 success 페이지처럼 `if(approvedRef.current)return;` 가드 |
| P0-3 | 출시적합성 | `invitation/InvitationMarket.tsx:62-77` | 디자인 템플릿(디지털재화) 웹 KakaoPay 판매, `getPaymentProvider` 게이트 없음 → native IAP 위반(3.1.1) | native 에서 IAP 분기 또는 결제 UI 숨김 |
| P0-4 | 출시적합성 | `ios/` 부재 + `adService.ts:78-90` | AdMob 활성인데 iOS Info.plist `NSUserTrackingUsageDescription`·`SKAdNetworkItems`·카메라/사진 문구 없음 → 5.1.2 반려/권한 크래시 | iOS 빌드 시 plist 4문자열+SKAdNetwork 강제 + CI 검사 |
| P0-5 | 비용 | `invitation-illustration/index.ts:188-190,215` | portrait 스타일이 하트 차감 없이 OpenAI 루프(최대 10회) 호출 → 무제한 무료생성 비용폭주 | 호출 전 `spend_hearts` 게이트(map 패턴) |
| P0-6 | dead-end/인가 | `contentReview.ts:82-88` | 위 §1 쿠폰 admin 검토 dead-end | RPC/RLS 추가 |
| P0-7 | 정확성/출시 | `CommunityEdit.tsx:19` | 수정 카테고리 5개 vs 작성 12개 → 페르소나 카테고리 글 수정 불가/강제변경 | 카테고리 단일 소스 공유 |

## 3. dead-end UI / placeholder CTA

- `Influencers.tsx:35,40-50,125` 필터 시트가 완전 no-op(저장만, 리스트 미적용) — 사용자 가시 "고장".
- `AdminWeddingPhotoRefs.tsx` ComingSoon 스텁 영구 잔존(nav 노출) — 숨기거나 map 에 deferred.
- (양호) 소비자 주요 CTA·기업 전 액션·커뮤니티 신고/차단/탈퇴는 실제 write 연결.

## 4. iOS/사파리(웹)

- `ios/` 디렉터리 자체가 레포에 없음 → plist 검증 불가(P0-4). localStorage 가드는 대체로 적용
  (`safeLocalStorage`·`useBranches createSafeStorage`·tasteQuiz try/catch). `useTextDraft` 일부 폼 미적용
  (`CoupleVoteDetail` 이유 입력). `InvitationViewer` RSVP 응답이 localStorage 무기한 보관·삭제 CTA 없음.

## 5. 출시 적합성(스토어)

- P0-3(마켓 IAP)·P0-4(plist/ATT/SKAdNetwork). `Premium.tsx:52` FAQ "자동결제 안 됨"이 native IAP 에서 거짓
  (오인고지 3.1.2) — provider 분기 필요. anti-steering 자체는 HeartCharge/Subscription 에서 양호.
  Android AdMob App ID·AD_ID 권한 활성 ↔ Play 데이터보안 폼 일치 확인 필요.

## 6. 안정성(복원력)

- AI result 폴링 deps 에 `id` 누락(stale closure, 단 MAX_POLLS 폴백은 정상 — "무한로딩" 아님).
- `InvitationViewer:140`·`InvitationRsvpDashboard:52` null(404/손상 row) 가드 부재 → 크래시/로딩 잔존.
- 이미지생성 더블탭 가드가 버튼 disabled 의존(상태 지연 시 중복 invoke·하트 이중차감) → 진입부 명시 가드.
- (양호) boot ErrorBoundary·네이티브 플러그인 동적 import·AdMob/ATT init try-catch graceful.

## 7. 법적/전자상거래

- `Checkout.tsx:160-178` 청약철회·미성년자·판매자정보 고지+동의 양호하나 **사업자 상호·등록번호 거래화면
  직접표시** 요구 충족 여부 확인(약관 링크만일 수 있음). `AccountDeletion.tsx:81` 안내("비식별 처리") ↔
  `delete_user_data` RPC(완전 DELETE) 불일치·보존 레코드 PII 익명화 미구현(13 중첩).

## 8. 비용/쿼터

- P0-5(일러스트 무과금). 이미지 AI(dress/fitting/makeup/hair/sdm) **시간 기반 rate-limit 없음**(하트가 유일
  게이트) → `increment_ai_usage_gated` 패턴 확대 권장. `dewy-hair-preview` Gemini Vision 무과금. consulting
  `reasoning_effort`·photo batch 동시호출 상한 부재. 하트 단가가 클라/서버 양쪽 하드코딩(드리프트) → 서버 단일소스.

## 9. 접근성

- 카드 안 하트가 중첩 인터랙티브(키보드 포커스 불가)·터치<44pt(`VendorMediaCard`). 아이콘 전용 FAB/토글
  `aria-label` 누락(CoupleVote·MergeGame·BudgetSplitSimulator). 결제 슬라이더(`HeartCharge` range) aria 부재.
  좋아요/댓글 수 스크린리더 라벨 부재.

## 10. 개인정보/데이터 거버넌스

- P0-1(SDM 미파기). 탈퇴 보존 레코드 PII 익명화 미구현(문서와 불일치). 견적 참고사진(`quote-uploads`) 종료 후
  파기 로직 없음. RSVP 응답 localStorage 무기한. CoupleVote 자유서술(관계 PII) LLM 전송에 처리 동의 고지 없음.

## 11. 초개인화(개인화 기회 매트릭스 — 핵심 베팅)

방어(1~13) 양호. **개인화 깊이 불균형이 최대 제품 기회.** (①없음 ②정렬/필터 ③큐레이션 ④카피/CTA ⑤생성형)

| Surface | 쓰는 신호 | 현재 | 목표 | 고도화 포인트 |
|---|---|---|---|---|
| 꿀팁 `/tips` | persona·D-day·style·단계 | ④~⑤ | ⑤ | 모범. 추천이유 생성형만 여지 |
| 예산 `/budget`(+상세) | D-day·style·region평균·single | ③~④ | ⑤ | 정적 팁 → persona 생성형 코멘트, spent=0 오도카피 수정 |
| 일정/보드 `/schedule`·`/board` | D-day·persona(보드는 신호 0) | ①(보드)~④ | ④~⑤ | 보드 persona/단계 슬롯 우선·생성형 다음액션 |
| Wrapped `/wrapped` | D-day·진척·예산·persona | ④ | ⑤ | recap 사유 persona 생성형 |
| 커플투표 `/couple-vote` | couple-link만 | ② | ⑤ | **AI 절충안에 persona/예산/region 미주입 — 큰 기회** |
| 인플루언서 `/influencers` | follower만(필터 no-op) | ① | ③ | **필터 미적용 P1** + region/persona 정렬 0 |
| 탐색 상세추천 `usePlaceRecommendations` | 카테고리·지역·거리 | ② | ④ | taste/예산/persona 미반영(VendorList=④와 사일로) |
| TagResults | partner·조회수만 | ① | ② | region/taste 가산 |
| AI 메이크업·헤어·SDM | 없음(전원 동일) | ① | ③ | 스킨톤·taste·체형 프롬프트 주입(MakeupRecommend addendum 재사용) |
| 청첩장 템플릿·마켓 | style_tags(정렬 미반영) | ① | ③ | partner_rank 품질정렬 + taste 큐레이션 |
| 커머스 Store·구독·마켓 | featured_personas 띠만 | ①~③ | ④ | 예산/D-day/소진율 기반 패키지·플랜 추천·추천이유 카피 |
| 커뮤니티 피드·MyPage·CS | style(피드)·role | ①~③ | ④~⑤ | 지역/단계 큐레이션·트렌딩 전원동일·CS 답변 맥락화 |
| 기업 대시보드·리드 | tier·완성도·카운트 | ②~④ | ④~⑤ | 추세/벤치마크, 리드 적합도 우선표시 |

→ **목표>현재** 큰 격차 = couple-vote AI·상세추천·메이크업/헤어/SDM·마켓·커뮤니티 트렌딩. 백로그로 이월.

## 12. 적용/후속 (이 감사는 읽기 전용 — 코드 변경 없음)

빠른 안전 수정 후보(별도 PR): **P0-1 SDM cleanup 마이그**(추가형, 즉시 가능) · **P0-2 구독 가드**(타 페이지 미러) ·
**P0-7 카테고리 단일소스** · **Influencers 필터 연결/숨김**. 큰 건(P0-3 마켓 IAP·P0-4 iOS plist·P0-5 일러스트
과금·쿠폰 admin RLS)은 설계·검증 수반 → 우선순위 합의 후.

## 13. 남은 작업 (deferred)

- ⬜ surface: A6 Deals/Honeymoon/Coupons 상세·MyDeliveries · A7 Notifications/MailInbox(Gmail OAuth 토큰)/FAQ/Tutorial ·
  E `iap-verify-apple`·OAuth(cal/drive/mail)·instagram/product 파이프라인 · invitation-templates 좌표로직.
- 실 DB RLS 정책 적용·런타임 e2e·실기기 IAP/ATT 검증(컨테이너 한계로 미실행).
- 초개인화 백로그(§11 목표>현재 상위 항목).
