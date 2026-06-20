# 출시 핸드오프 — 당신이 직접 할 일 안내 + 보류분 상세 보고 (260620)

> "내가 직접 해야 할 부분" 응답에 따른 **실행 안내(③⑤⑥⑦⑧) + 자세한 보고(⑯)**.
> 코드/설계는 PR(브랜치 `claude/md-review-audit-at4qt5`)에 반영됨. 아래는 외부 콘솔·계정·시크릿 등
> 사람이 하는 단계.

## 상태 요약(당신 회신)
①Apple 등록·승인대기 ②KakaoPay 정기결제 서류·승인대기 ③푸시=안내필요 ④Play 비공개테스트 가동
⑤env=안내 ⑥IAP등록=안내 ⑦AdMob iOS=안내 ⑧Info.plist=안내 ⑨정기결제 sandbox=승인후 ⑩⑪실기기=배포후
⑫데모계정 생성완료 ⑬푸터값 정확(✅ companyInfo 검증) ⑭법무=아래 ⑮수집=이름·이메일+α(아래) ⑯상세보고=여기

---
## ③ 푸시 알림 (Android 이미 4차 업데이트 운영 중)
**역할 분담**: `@capacitor/push-notifications` 연동·`send-push` 함수는 **내가 코드 작성**. 아래 키·콘솔은 **당신**.
### Android (FCM)
1. Firebase 콘솔 → 프로젝트 생성(또는 기존) → **Android 앱 추가**(패키지 `app.dewy`).
2. `google-services.json` 다운로드 → `android/app/`에 배치(커밋).
3. Firebase → 프로젝트설정 → 클라우드 메시징 → **서버키/서비스계정** 확보 → Supabase Secret(`FCM_*`).
4. (코드) Android 13+ `POST_NOTIFICATIONS` 권한 — 내가 매니페스트·런타임 요청 추가.
### iOS (APNs)
1. Apple Developer → Certificates/Identifiers/Profiles → **Keys → APNs 키(.p8) 생성** → keyId·teamId 보관.
2. Firebase iOS 앱 추가(FCM 경유 시) 또는 직접 APNs → Supabase Secret 등록.
3. Xcode: **Push Notifications** capability 추가.

## ⑤ Supabase Secrets (env)
**위치**: Supabase 대시보드 → Project Settings → **Edge Functions → Secrets** (또는 `supabase secrets set KEY=…`).
설정할 키:
- `KAKAO_SUBSCRIPTION_CID` — KakaoPay 정기결제 CID(승인 후). **미설정이면 기존 단건 경로 유지**(안전).
- IAP 검증: `APP_STORE_CONNECT_API_KEY`(+ issuer_id·key_id), `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
- 푸시: `FCM_*` / APNs.
- (기존 유지: `KAKAO_ADMIN_KEY`·`OPENAI_API_KEY`·`GEMINI_API_KEY`·`SUPABASE_SERVICE_ROLE_KEY`.)

## ⑥ IAP 상품 등록 (스토어 콘솔)
상품 ID는 **코드 상수와 일치**해야 함(내가 상수 정의 → 그 ID로 등록).
### App Store Connect
- My Apps → 앱 → **In-App Purchases**: 하트 패키지 = **소모성(Consumable)**, 가격 = +10%표(`iapPriceForKrw`).
- **Subscriptions**: 구독그룹 생성 → 월간/연간 → **인트로 오퍼 "1개월 무료"** 설정.
- App Store Server Notifications V2 엔드포인트 URL 등록(내가 `apple-notifications-v2` 함수 제공).
### Google Play Console
- Monetize → Products → **In-app products**(하트, 소모성) + **Subscriptions**(프리미엄, base plan + **무료체험 offer**).
- **RTDN**(실시간 개발자 알림) Pub/Sub 주제 연결(내가 `play-rtdn` 함수 제공).

## ⑦ AdMob iOS
1. AdMob 콘솔 → 앱 → **iOS 앱 추가** → **앱 ID**(`ca-app-pub-…~…`, Android와 별개) + **광고단위**(배너·보상형) 생성.
2. `Info.plist`에 `GADApplicationIdentifier` = iOS 앱 ID(⑧).
3. env(`VITE_ADMOB_*`)에 iOS 광고단위 ID 분기값 설정.

## ⑧ Info.plist (Mac/Xcode — `ios/App/App/Info.plist`)
추가할 키(상세 `ios-packaging.md`):
- `UIStatusBarStyle=UIStatusBarStyleDarkContent`, `UIViewControllerBasedStatusBarAppearance=NO`.
- `CFBundleURLTypes` → URL Scheme `app.dewy`(OAuth 딥링크).
- `NSUserTrackingUsageDescription` = ATT 문구(광고 추적 사유).
- `SKAdNetworkItems` = AdMob 제공 SKAdNetwork ID 목록.
- `GADApplicationIdentifier` = iOS AdMob 앱 ID.
- `ITSAppUsesNonExemptEncryption=false`(표준 HTTPS만 사용 시 — 수출신고 면제).
- Capabilities: **Sign in with Apple**, **Push Notifications**.
- 별도 파일: **PrivacyInfo.xcprivacy**(앱+AdMob SDK 프라이버시 매니페스트).

---
## ⑯ 보류분 상세 보고
### (가) 보류한 DB 마이그 3건 — 왜 안 켰나, 어떻게 안전 적용
| 항목 | 위험 | 안전 적용법 |
|---|---|---|
| `security_definer_view`(community_author_cards) | invoker 전환 시 **anon이 작가카드 못 읽어 커뮤니티 깨질 수 있음** | 스테이징에서 anon으로 커뮤니티 목록 렌더 e2e 후 적용. 또는 노출 컬럼만 가진 안전뷰 재작성 |
| `public_bucket_allows_listing`(community-images·vendor-images) | 리스팅 차단 시 **갤러리/목록 로딩 깨질 수 있음** | 해당 화면이 list() 의존하는지 확인 후 정책 조정 |
| `rls_policy_always_true`(client_error_logs·product_clicks·service_waitlist) | 텔레메트리 INSERT 막으면 **로깅/대기열 끊김** | INSERT는 유지하되 rate-limit/크기제한만 추가 |
→ 셋 다 **피처 e2e 후** 적용. 지금 적용 안 한 건 회귀 방지를 위해 의도적.

### (나) 의존성 6취약
- high: `form-data`·`ws`(주로 전이) / moderate: `dompurify`(HTML 살균 — 청첩장 등 XSS 직결, **우선 업데이트**)·`react-router(-dom)` / low: esbuild.
- 적용: `npm update dompurify react-router-dom` 등 + **빌드·테스트 회귀** 확인(네트워크 필요). 전이 패키지는 상위 의존 핀.

### (다) 정기결제 엔진(자동갱신 a)
- 설계·스키마 토대 완료(`260620_subscription_autorenew_plan.md`). **엔진 코드(ready/approve SID·charge 잡·cancel PG해지)는 머니패스 → KakaoPay 정기결제 승인+sandbox e2e 후 활성**. 내가 게이트(비활성) 형태로 작성 가능.

### (라) 우선순위 (출시까지)
1. **승인 대기분**(Apple·KakaoPay) — 외부.
2. **정합성 P0 잔여**: 방침/Data Safety **수집항목 정확화**(⑮), IAP 등록.
3. **푸시**(코드 내가 + 키 당신).
4. **정기결제 엔진**(승인 후 sandbox).
5. **보류 DB·의존성**(스테이징 검증 후).
