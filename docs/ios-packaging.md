# iOS 패키징 가이드 (Capacitor)

> 이 저장소는 Android 와 동일한 `dist/`(Vite SPA)를 감싸는 Capacitor 앱이다.
> iOS **코드/설정/문서**는 준비돼 있으나, 실제 `ios/` Xcode 프로젝트 생성·빌드·서명·
> 심사는 **macOS + Xcode + CocoaPods 가 필요해 Mac 에서만** 가능하다(리눅스 CI 불가).
> 아래 단계를 Mac 에서 그대로 따르면 된다. Android 쪽 설계는 `capacitor-migration-plan.md` 참조.

## 0. 이미 저장소에 반영된 것 (코드/설정)

- `package.json`: `@capacitor/ios`, `@capacitor/status-bar` 의존성 + `ios:open` 스크립트.
- `capacitor.config.ts`: `appId: app.dewy`, `appName: Dewy`, `webDir: dist` — iOS 도 동일 사용.
- `vite.config.ts`: `--mode capacitor` 빌드(상대경로 base, PWA SW off) — iOS/Android 공용.
- `src/lib/native/safeArea.ts`: 상태바 overlay(edge-to-edge) + 스타일(밝은 핑크 배경 → 어두운 아이콘).
  iOS 는 `env(safe-area-inset-*)` 가 노치/다이나믹아일랜드를 정확히 반영(`index.css :root` 기본값).
- `.gitignore`: `ios/App/Pods/`, `ios/App/build/`, `ios/App/output/` 제외.
- `src/main.tsx`: 부팅 시 `<html>` 에 `platform-ios` 클래스 부여 → 안전영역 CSS 분기.

## 1. Mac 에서 1회 실행 (ios/ 프로젝트 생성)

```bash
# 사전: Xcode(App Store) + Xcode Command Line Tools + CocoaPods 설치
#   sudo gem install cocoapods   (또는 brew install cocoapods)
npm install                       # @capacitor/ios 등 설치
npm run cap:build                 # vite build --mode capacitor && cap sync
npx cap add ios                   # ios/ Xcode 프로젝트 생성 + pod install
npx cap sync ios                  # 웹 자산/플러그인 동기화
npm run ios:open                  # Xcode 로 열기
```

> `npx cap add ios` 가 생성한 `ios/` 는 커밋한다(단, Pods/·build/ 는 .gitignore 로 제외됨).

## 2. Xcode 설정 (심사 통과에 필요)

1. **Signing & Capabilities**: Team 선택(Apple Developer 계정), Bundle Identifier = `app.dewy`.
2. **상태바 스타일**: 상태바 배경이 밝은 핑크라 아이콘은 어두워야 한다.
   `safeArea.ts` 가 `StatusBar.setStyle({ style: Style.Light })` 로 런타임 지정하지만,
   부팅 초기 깜빡임 방지를 위해 `ios/App/App/Info.plist` 에도 정적 지정 권장:
   - `UIStatusBarStyle` = `UIStatusBarStyleDarkContent`
   - `UIViewControllerBasedStatusBarAppearance` = `NO`
3. **앱 아이콘/스플래시**: `ios/App/App/Assets.xcassets` 에 하트 로고(Android 와 동일 소스) 추가.
4. **디스플레이 이름**: `CFBundleDisplayName` = `Dewy`.

## 3. OAuth 딥링크 (Google·Kakao 로그인)

Android 와 동일한 커스텀 스킴 `app.dewy://auth/callback` 을 iOS 에도 등록한다.
코드(`AuthContext` redirectTo 분기, `deepLink.ts` 의 `appUrlOpen` 핸들러)는 이미 플랫폼 공용이다.

- `ios/App/App/Info.plist` → `CFBundleURLTypes` 에 URL Scheme `app.dewy` 추가.
- Supabase 대시보드: Authentication → URL Configuration → Additional Redirect URLs 에
  `app.dewy://auth/callback` 이 이미 있으면 추가 작업 없음(Android 와 공유). Provider 콘솔은 손대지 않음.

## 4. Apple 심사 필수 — Sign in with Apple

App Store 가이드라인 4.8: **다른 소셜 로그인(Google/Kakao)을 제공하면 Sign in with Apple 도
제공**해야 reject 되지 않는다. iOS 출시 전 반드시 추가:

1. Xcode → Signing & Capabilities → **+ Sign In with Apple**.
2. Supabase: Authentication → Providers → **Apple** 활성화(Service ID·Key 등록).
3. 코드: `AuthContext` 에 `signInWithApple()`(`supabase.auth.signInWithOAuth({ provider: 'apple', ... })`)
   추가 + 로그인 화면에 Apple 버튼 노출(iOS 에서만, `getPlatform() === 'ios'`).

## 5. 결제 (인앱결제 정책 주의)

현재 스토어 결제는 카카오페이(외부 위임, `@capacitor/browser`)다. **디지털 콘텐츠/구독을
앱에서 판매하면 Apple 은 IAP(StoreKit) 를 요구**(가이드라인 3.1.1)할 수 있다. 실물/예약
서비스 위주면 외부 결제가 허용되는 경우가 있으나, 심사 전 결제 품목이 IAP 대상인지 확인 필요.

## 5-B. 광고 (AdMob) — iOS 설정 (Android과 별개)

AdMob은 iOS도 지원(`@capacitor-community/admob`, 미니게임 `MergeGame` 보상형 포함). 단 iOS는
별도 설정이 필요하다(Android의 `AndroidManifest` 앱ID·광고단위와 **별개**):

1. **AdMob 콘솔**: iOS 앱 추가 → iOS **앱 ID** + iOS **광고단위 ID**(배너/보상형 `VITE_ADMOB_*`의
   iOS용 값) 발급. Android `ca-app-pub-…~7146431266`은 iOS에 쓰면 안 됨.
2. **`ios/App/App/Info.plist`**:
   - `GADApplicationIdentifier` = iOS 앱 ID.
   - `SKAdNetworkItems` = AdMob 제공 SKAdNetwork ID 목록(Apple 광고 어트리뷰션).
   - `NSUserTrackingUsageDescription` = ATT 문구(추적 사유).
3. **ATT(가이드라인 5.1.2)**: IDFA 개인화 광고는 **App Tracking Transparency** 프롬프트 동의 필요.
   미동의 시 비개인화 광고로 노출(광고 자체는 동작). UMP 동의와 순서 정리(혼선 시 5.1.1 반려).
4. **프라이버시 매니페스트**: 앱 + AdMob SDK `PrivacyInfo.xcprivacy`(§ launch audit B).
5. **보상형으로 포인트/하트 지급**: Apple·Google 모두 허용(earned). (웹 AdSense 보상형이 incentivized
   정책상 더 민감 — 웹은 노출만, 네이티브는 AdMob 보상형이 정석.)

## 6. 검증 (Mac)

1. 시뮬레이터: `npx cap run ios` → 앱 부팅, SPA 라우팅 동일 동작.
2. **상태바**: 헤더가 노치/다이나믹아일랜드 아래로 내려오고(safe-area), 상태바가 핑크로 칠해지며
   아이콘이 어둡게 보이는지 — 노치 기종(iPhone 14+)·홈버튼 기종(SE) 둘 다 확인.
3. 로그인: Google/Kakao/Apple 각각 외부 → 앱 복귀(딥링크) 정상.
4. (회귀) `npm run build` 웹 배포 경로 무영향 확인.

## 7. 남은 작업 (deferred)

- 푸시 알림(APNs): `capacitor-migration-plan.md` P5 와 동일하게 1차 출시 보류. 활성화 시
  `@capacitor/push-notifications` + APNs 인증키(.p8) + Supabase `send-push` 함수 재연결.
- Universal Links(`https` 도메인 + `apple-app-site-association`)로 커스텀 스킴 승격(보안·UX) — 출시 후.
