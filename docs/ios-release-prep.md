# iOS / Apple App Store 출시 준비 체크리스트 (Dewy)

> 작성 기준일: 2026-06-05. Android(Capacitor) 출시는 준비 완료 상태이고, iOS 는
> **아직 플랫폼 자체가 없다**(`ios/` 디렉터리 부재). 이 문서는 macOS + Xcode 가
> 확보됐을 때 순서대로 실행할 수 있도록 Apple 고유 요구사항을 정리한 것이다.
>
> ⚠️ 일부 항목은 **대표자 결정/계정/자격증명**이 선행돼야 한다(결제 정책,
> Apple Developer 등록, Sign in with Apple 서비스 ID 등). 해당 항목은 🔴 로 표시.

---

## 0. 전제 — macOS 빌드 환경 (선행 필수)

iOS 빌드는 macOS + Xcode 가 반드시 필요하다. 현재 클라우드(Linux) 환경에서는
`npx cap add ios` 자체가 불가능하다. 아래 중 하나를 확보할 것:

- 🔴 물리 Mac (Mac mini/MacBook) + Xcode 최신
- 🔴 Xcode Cloud / Ionic Appflow / GitHub Actions(macOS 러너) 등 클라우드 Mac
- 🔴 Apple Developer Program 등록 (연 $99) — 심사 제출 전 필수

---

## 1. iOS 플랫폼 추가 (Mac 확보 후)

```bash
# Capacitor 6 기준 (현 프로젝트). iOS 14+ 지원.
npm install @capacitor/ios@^6
npm run build:vite -- --mode capacitor   # dist/ 생성 (capacitor 모드: PWA SW off, base './')
npx cap add ios
npx cap sync ios
npx cap open ios                          # Xcode 에서 서명·실행
```

- `capacitor.config.ts` 의 `appId: app.dewy`, `webDir: dist` 가 그대로 iOS 에 적용된다.
- 커스텀 스킴 `app.dewy://auth/callback` 딥링크는 iOS 에서도 동작해야 한다 →
  Xcode > Target > Info > URL Types 에 `app.dewy` 스킴 등록(Capacitor 가 자동
  추가하지만 확인).

> 참고: 출시 직후 Capacitor 7/8 업그레이드 검토 가치 있음(7 = minSdk23·iOS14·
> JDK21). 단 iOS 첫 출시는 현 6 그대로가 안전.

---

## 2. 🔴 인앱결제(IAP) — App Store 심사 최대 쟁점 (Guideline 3.1.1)

**결정이 필요한 핵심 항목.** 현재 Dewy 의 디지털 재화/서비스는 전부 외부 결제다:

| 항목 | 성격 | 현재 결제 | iOS 문제 |
|---|---|---|---|
| Premium 구독 (월 4,900 / 연 39,000) | 디지털 구독 | TossPayments | 3.1.1 위반 → 리젝 |
| 하트 충전 | 앱 내 소비 재화 | KakaoPay | 3.1.1 위반 → 리젝 |
| 포인트 | 앱 내 재화 | — | IAP 대상 가능성 |

Apple 은 "앱 기능을 잠금 해제하는 디지털 콘텐츠/구독"에 **StoreKit 인앱결제를
강제**한다. 외부(Toss/Kakao) 결제는 거부된다(실물 상품·예약 서비스는 예외).

**선택지 (대표자 결정 필요):**
1. **iOS 전용 StoreKit IAP 구현** — `@capacitor-community/in-app-purchases` 등으로
   구독·하트를 Apple IAP 상품으로 등록. Apple 수수료 15~30%. 가장 정석.
2. **한국 외부결제(대체결제) 신청** — Apple 의 한국 전기통신사업법 대응 외부결제
   엔타이틀먼트(StoreKit External Purchase) 신청. 절차 복잡·승인 변수 큼.
3. **iOS 1차 출시에서 결제 기능 제외** — iOS 는 무료 기능만, 결제는 웹/Android.
   단 "웹에서 결제하라"는 안내(외부 구매 유도)도 3.1.1/3.1.3 에 저촉될 수 있어
   문구 설계 주의(가격·외부 링크 노출 금지).

> ⚠️ 플랫폼 분기 코드 필요: `HeartCharge.tsx`, `Premium.tsx`,
> `SubscriptionCheckout.tsx` 등은 현재 네이티브 분기가 없다. 위 결정 후
> `isNativeApp() && getPlatform()==='ios'` 분기로 IAP/숨김 처리.

---

## 3. 🔴 Sign in with Apple (Guideline 4.8)

Google·Kakao 소셜 로그인을 제공하므로 **Apple 로그인도 동등하게 제공**해야 한다
(미제공 시 리젝). Supabase 가 Apple provider 를 지원하므로 코드는 작다.

**선행 (Apple Developer 콘솔):**
- 🔴 App ID 에 "Sign In with Apple" capability 활성화
- 🔴 Services ID 생성 + Return URL 에 Supabase 콜백
  (`https://<project>.supabase.co/auth/v1/callback`) 등록
- 🔴 Key 생성(.p8) → Supabase Authentication > Providers > Apple 에 Team ID /
  Key ID / Services ID / Private Key 입력

**코드 (AuthContext 에 추가 — Google/Kakao 와 동일 패턴):**
```ts
const signInWithApple = () =>
  supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: isNativeApp() ? "app.dewy://auth/callback" : `${window.location.origin}/`,
    },
  });
```
- 로그인 화면(`Auth.tsx`)에 **iOS 에서만** Apple 버튼 노출(`getPlatform()==='ios'`).
- Apple HIG: Apple 버튼은 다른 소셜 버튼과 동등하거나 더 위에 배치 권장.

---

## 4. 🔴 App Tracking Transparency (ATT) — AdMob 광고 ID

iOS 14.5+ 에서 광고/추적 식별자(IDFA) 접근 전 **ATT 권한 프롬프트**가 필수다.
AdMob 을 iOS 에서도 켤 경우:

- `Info.plist` 에 `NSUserTrackingUsageDescription` (한국어 사유 문구) 추가.
- 앱 첫 실행(또는 광고 첫 노출 직전) ATT 요청 → 동의 시에만 개인화 광고.
- Capacitor 플러그인: `@capacitor-community/admob` 의 `requestTrackingAuthorization()`
  또는 별도 ATT 플러그인. `adService.ts` 의 `initAds()` iOS 분기에서 호출.

> iOS 에서 광고를 아예 빼고 출시하면 ATT/IDFA 요구는 사라진다(게임 광고는
> Android·웹만). 결정 필요.

---

## 5. Info.plist 권한 사용 설명 (한국어)

AI 스튜디오(드레스/메이크업 시연)가 사용자 사진을 업로드하므로 사진 권한 설명이
필수다. `ios/App/App/Info.plist` 에 추가(키 누락 시 권한 사용하는 순간 크래시):

| 키 | 한국어 문구(예시) | 필요 시점 |
|---|---|---|
| `NSPhotoLibraryUsageDescription` | "AI 드레스·메이크업 시연에 사용할 사진을 선택하기 위해 사진 보관함 접근이 필요합니다." | 사진 업로드 |
| `NSCameraUsageDescription` | "사진을 직접 촬영해 AI 시연에 사용하기 위해 카메라 접근이 필요합니다." | 카메라 촬영(사용 시) |
| `NSUserTrackingUsageDescription` | "관련성 높은 광고 제공을 위해 기기 식별자 사용 동의를 요청합니다." | AdMob 사용 시 |
| `NSPhotoLibraryAddUsageDescription` | "생성된 청첩장·시연 결과 이미지를 저장하기 위해 접근이 필요합니다." | 결과 저장 시 |

---

## 6. Privacy Manifest (`PrivacyInfo.xcprivacy`) — 2024+ 필수

App Store 는 앱 + 서드파티 SDK 의 데이터 수집·"required reason API" 선언 파일을
요구한다. 누락/불일치 시 업로드 거부 또는 리젝.

- `ios/App/App/PrivacyInfo.xcprivacy` 생성.
- 선언 대상: 수집 데이터 유형(이메일, 사용자 콘텐츠/사진, 식별자, 사용 데이터,
  결제 정보 등), 추적 여부, required-reason API(UserDefaults, 파일 타임스탬프 등).
- 서드파티 SDK 별 privacy manifest 확인: AdMob(Google Mobile Ads), Supabase,
  Capacitor 플러그인. 각 SDK 최신 버전이 자체 manifest 포함하는지 점검.
- App Store Connect 의 "앱 개인정보 보호(Privacy Nutrition Label)" 입력과 내용
  일치시킬 것. (Android 데이터보안 폼 `docs/data_safety_export_corrected.csv`
  내용을 Apple 양식으로 매핑하면 출발점이 된다.)

---

## 7. 딥링크 / Universal Links

- 1차: 커스텀 스킴 `app.dewy://auth/callback` 으로 충분(OAuth 콜백 동작).
- 권장(후속): Universal Links 승격 — 호스팅(`dewy-wedding.com`)에
  `/.well-known/apple-app-site-association` 추가 + Xcode Associated Domains.
  보안·UX(사파리에서 앱으로 매끄러운 전환) 개선.

---

## 8. App Store Connect 등록 자료 (Android 자료 재활용)

| 항목 | 출처/비고 |
|---|---|
| 앱 이름 / 부제 / 설명 | `docs/play-store-listing.md` 한국어 그대로 활용 |
| 스크린샷 | iPhone 6.7"/6.5"/5.5" + iPad(지원 시) 각 사이즈 필요(Android 캡처 재촬영) |
| 개인정보처리방침 URL | `https://dewy-wedding.com/privacy` (SSR 적용 완료 — 본 PR) |
| 지원 URL / 마케팅 URL | 준비 |
| 연령 등급 설문 | 커뮤니티/UGC·광고 반영 |
| 수출 규정(암호화) | HTTPS 표준 암호화만 사용 → 일반적으로 면제 신고 |
| App Review 메모 | 테스트 계정(소셜 로그인 우회용) + AI/결제 흐름 설명 첨부 권장 |

---

## 9. 실행 순서 요약

1. 🔴 Apple Developer Program 등록 + macOS/Xcode 확보
2. `@capacitor/ios` 설치 → `cap add ios` → `cap sync ios`
3. 🔴 결제 정책 결정(2장) → IAP 구현 또는 iOS 결제 분기/숨김
4. 🔴 Sign in with Apple — Apple 콘솔 설정 + Supabase provider + 코드/버튼(3장)
5. Info.plist 권한 문구(5장) + ATT(광고 유지 시, 4장)
6. PrivacyInfo.xcprivacy + App Store Connect Privacy Label(6장)
7. 실기기 테스트(딥링크 로그인·사진 업로드·결제 흐름) → TestFlight → 심사 제출

---

## 부록 — Android 출시 후속(별도)

- `targetSdk/compileSdk 36` 상향: **2026-08-31부터 Play 신규·업데이트 필수**.
  Android 15/16 edge-to-edge UI 회귀 점검 동반.
- AdMob 실제 앱 ID 교체: `android/app/src/main/res/values/strings.xml`
  의 `admob_app_id` (현재 Google 테스트 ID) → 실제 ID.
- 신규 개인 개발자 계정이면 프로덕션 전 비공개 테스트 20명·14일 요건 확인.
