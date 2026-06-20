# Dewy 출시 마무리 — 세션 인수인계 (R10 잔여 + 후속)

> 새 세션에서 남은 작업을 정확히 이어가기 위한 인수인계. 단일 소스 판정은
> `docs/260620_FINAL_execution_plan.md`. 작업 브랜치: **`claude/md-review-audit-at4qt5`** (PR #373).

## Context
장기 세션에서 출시 전 **법무·보안·정책 감사와 수정**을 대거 수행하고 전부 위 브랜치에 커밋·푸시했다.
**출시 판정**: 웹=지금 가능 / 앱 스토어=무료 기간엔 IAP 없이 제출 가능(네이티브 빌드에서 디지털 결제 UI를
숨기는 reader 모델 가드 적용 → Google 빌링·Apple 3.1.1 트리거 안 됨). 정식 유료 인앱결제 켤 때 IAP 전환.

## 이미 완료 (재작업 금지)
- **법/보안**: 수집항목 정확화(방침+`docs/260620_data_safety_mapping.md`) · AI 생성 라벨+인앱 신고
  (`AiDisclosureNotice`+community_reports `ai_content`) · 청약철회 동의(하트/구독 결제화면) · 사업자정보 약관
  기재 · 계정삭제 스토리지 파기(`delete-account`) · 에러로그 PII 마스킹(`errorLog.ts`) · 함수 search_path 마이그.
- **결제 정책**: 웹 AdSense 비활성+게임 보상 웹→앱 유도 · **네이티브 결제 UI 숨김 가드**(`isNativeApp()` —
  HeartCharge/SubscriptionCheckout, 문구 "준비 중") · AdMob 테스트토글(`VITE_ADMOB_TEST=1`)+`app-ads.txt`.
- **버그/어뷰징**: 결제 sessionStorage 안전화(`safeSessionStorage`) · ilike escape · 견적 메시지 버스트 제한.
- **R10 일부**: 원탭 공유 통일(`shareResultImage`/`shareResultWithToast` + Hair·Consulting 공유버튼) ·
  **확대(zoom)**=`ZoomableImage`로 Dress·Makeup·SDM·Hair·Consulting 결과 적용.
- 전부 `npm run build`·`npm run test`(524) 통과.

## 남은 작업

### A. 전후 비교 (before/after) — Dress·Makeup 우선
"원본 사진 ↔ 생성 결과" 토글. 단일 결과 페이지(Dress/Makeup)에 먼저.
- `src/pages/DressFittingResult.tsx`: 로드 쿼리(약 line 44-59) `.from("dress_fittings").select(...)`에
  **`source_image_path` 추가** → 소스 signed URL 생성(결과와 동일 패턴: `supabase.storage.from(<업로드버킷>)
  .createSignedUrl(source_image_path, 60*60*24)`). **⚠️ 소스 버킷명은 `DressFitting.tsx` 업로드 코드에서 확인**
  (결과는 `dress-results`). types.ts:1261 `source_image_path: string`.
- `src/pages/MakeupFittingResult.tsx`: 동일(types.ts:2240).
- UI: **기본 = 생성결과 먼저 노출**(지시) → `const [showSource, setShowSource] = useState(false)`. 토글
  "원본 보기 ↔ 결과 보기". `<ZoomableImage src={showSource ? sourceUrl : resultUrl} ... />`. 소스 URL 없으면 토글 숨김.
- 확장(후속): 다중이미지(Hair `source_path`, Photo `source_paths[]`)는 per-image라 후순위.
- **SDM 주의**: `sdm_previews`가 types.ts에 없음(드리프트) → 실 DB 확인 전 source 추가 금지.

### B. 추천인 attribution — ⚠️ 거의 완성, 갭 1개
referral은 이미 구현됨(재구현 금지): `/referral`(`src/pages/Referral.tsx`)+`src/hooks/useReferral.ts`,
RPC `get_or_create_referral_code()`·**`redeem_referral_code(p_code)`**(양쪽 보상, `referrals` unique 1회)·
`check_referral_milestones()`, 마이그 `supabase/migrations/20260613040000_referral_event.sql`. 공유 URL
`https://dewy-wedding.com/auth?ref=${code}`.
- **유일한 갭**: 가입자의 **`?ref=code` 자동 적용 없음**(`Auth.tsx`는 `?type`/`?redirect`만 추출).
- **할 일**: ① `Auth.tsx`(약 line 41-44)에서 `searchParams.get("ref")` 추출 → localStorage 보관 ②
  세션 확립(로그인) 후 **`redeem_referral_code(ref)` 1회 호출**, 성공 시 제거(OAuth·이메일 공용). 자기추천/중복은
  RPC가 막음. ★ 보상 하트는 earned → IAP 비대상(정책 OK). (`growth_improvements_plan`의 "스캐폴드만" 서술은 정정.)

### C. PhotoFix 공유 (후속, 작음)
`PhotoFixResult.tsx`는 이미지=다운로드버튼 구조(line 176-186) → 이미지/액션 분리 리팩터 후 `shareResultWithToast` 적용.

### D. 더 큰 후속 (외부·머니패스 — 별도 집중)
- **R1 IAP 전환**(`docs/260620_payment_compliance_plan.md`): Apple 승인+KakaoPay 정기결제+샌드박스 e2e 필요.
  현 네이티브 결제숨김 가드를 IAP 분기로 교체.
- **자동갱신(a)**(`docs/260620_subscription_autorenew_plan.md`, 스키마 토대 마이그 적용됨).
- **푸시·마케팅/야간 동의·payments.raw_response strip·AdMob SSV**: `docs/260620_codereview_2.md §I`,
  `docs/260620_launch_handoff.md`.

## 재사용 자산 (새로 만들지 말 것)
`shareResultImage.ts` · `ZoomableImage.tsx` · `AiDisclosureNotice.tsx` · `isNativeApp()`(`src/lib/platform.ts`) ·
`safeSessionStorage.ts`/`createSafeStorage` · RPC `earn_hearts(p_user_id,p_amount,p_reason,p_ref_id?)`
(마이그 `20260429120000_hearts_system.sql`) · `useReferral` · `companyInfo/consentDefinitions/dataRetention` ·
`priceFormat/relativeTime/postgrestEscape`.

## 규칙 / 검증
- 브랜치 `claude/md-review-audit-at4qt5` 유지. 커밋 푸터:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` + `Claude-Session: ...`.
- 검증: `npm run build` + `npm run test`(524) + 엣지함수 esbuild
  (`npx esbuild supabase/functions/<fn>/index.ts --bundle --platform=neutral --external:https://* --external:npm:* --outfile=/dev/null`).
  ⚠️ raw `tsc --noEmit`는 기존 에러 다수(노이즈) — 게이트는 build/test.
- DB: 마이그 파일만 추가(배포 영향 0, main 머지 시 적용). 실 DB 직접변경 금지(읽기 조회만). 스키마 의심 시
  `src/integrations/supabase/types.ts` 먼저 → 마이그/실DB 교차확인(특히 `sdm_previews` 드리프트).
- 머니패스(정기결제·IAP)는 sandbox/실기기 e2e 없이 "완료" 보고 금지. 변경은 최소·표적화.

## end-to-end 검증
- 전후비교: 토글 시 원본↔결과 + 확대 동작, 소스 signed URL 200(실데이터 필요 — 차단 시 "정적까지" 명시).
- 추천인: `/auth?ref=<code>` 가입 → 로그인 후 redeem 1회 양쪽 적립, 재호출/자기추천 차단 확인.
- build·test 통과 + 변경 파일 eslint 0 error.

## 문서 맵
`260620_FINAL_execution_plan`(단일 소스) · `260620_codereview`(법/보안) · `260620_codereview_2`(코드·라이브DB) ·
`260620_gatekeeper_review` · `260620_data_safety_mapping` · `260620_launch_handoff` ·
`260620_payment_compliance_plan` · `260620_subscription_autorenew_plan` · `260620_growth_improvements_plan`(추천인 서술 정정) · `ios-packaging`.
