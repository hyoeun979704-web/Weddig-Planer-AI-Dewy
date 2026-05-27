# Capacitor 전환 작업 계획 (1인 유지보수 기준)

## 가정한 전제 (요청서 [ ] 항목 비어 있어 명시)

- **프론트엔드 빌드의 단일 소스**: `vercel.json`이 `npm run build:vite` → `dist/`를 배포 산출물로 지정하고 `index.html`이 `/src/main.tsx`를 가리키므로, **운영 중인 웹 = Vite + React SPA**로 간주한다. 저장소에 함께 들어 있는 `next.config.ts` / `src/app/*`는 부분 실험 코드로 보고 Capacitor 래핑 대상에서 제외한다. (만약 Next.js 쪽으로 운영을 옮길 계획이라면 이 가정만 갈아끼우면 됨)
- **타깃 OS / 첫 출시**: Android 우선 → iOS 후속 (1인 운영 + Mac 빌드 비용 고려)
- **네이티브 기능**: 푸시 알림 O, 인앱결제 X (현 Toss 결제는 외부 브라우저로 위임)
- **오프라인 모드**: 1차 출시 범위 외 (PWA SW만 유지)

---

## 1. 지금 바로 시작할 작업 우선순위 5개

| 순서 | 작업 | 선정 근거 (1줄) |
|---|---|---|
| **P1** | Capacitor 프로젝트 초기화 + Android 플랫폼 추가, `dist/`를 `webDir`로 연결 | 모든 후속 작업의 빌드 베이스 — 이게 없으면 앱 자체가 안 뜬다. |
| **P2** | 실행 환경 감지 유틸 + Supabase 클라이언트 storage 분기 (웹=`localStorage`, 앱=`@capacitor/preferences`) | 앱 콜드스타트 세션 유지의 단일 실패점. P3 OAuth 작업의 전제. |
| **P3** | Supabase OAuth 딥링크 처리 (`@capacitor/app` listener + 커스텀 스킴 등록 + Supabase Redirect URL 화이트리스트) | 현 코드가 `window.location.origin`을 redirectTo로 박아 둬, 앱에서 Google/Kakao 로그인이 그대로 깨진다. |
| **P4** | 빌드 모드 분리 (`vite build --mode capacitor`) + 환경 분기 디렉터리 규칙 + 외부 링크/결제 위임 어댑터 | 같은 코드베이스로 web/app 두 산출물을 안전하게 만들기 위한 규약. 한 번 정해 두지 않으면 분기 코드가 페이지마다 흩어진다. |
| **P5** | `@capacitor/push-notifications` + FCM 연동 및 `device_tokens` 테이블 추가 | **1차 출시에서는 보류** — 코드/마이그레이션/Edge Function 은 작성·커밋되어 있으나 의존성·호출은 제거된 상태. Firebase 콘솔 작업이 동반되므로 출시 후 별도 PR 로 재활성화. |

---

## 2. 각 작업의 목적 (전환 관점)

- **P1** — Vercel 웹 배포는 그대로 두면서 Capacitor가 같은 `dist/`를 감싸도록 한다. 별도 모바일 빌드 파이프라인 없이 "웹 빌드 + native shell"의 1빌드-2산출물 구조를 만든다.
- **P2** — Capacitor WebView의 `localStorage`는 OS 정리/저장소 압박 시 휘발 가능성이 있고 iOS WKWebView에서는 사이트데이터 정책상 비결정적이다. Preferences(네이티브 SharedPreferences/UserDefaults)로 옮겨 세션 영속성과 자동 갱신 토큰 유실을 막는다.
- **P3** — OAuth Provider는 정확히 등록된 redirect URI로만 돌아온다. 웹은 `https://dewy.app/`로, 앱은 커스텀 스킴(`app.dewy://auth/callback`)으로 받아 `app` 플러그인의 `appUrlOpen`에서 `supabase.auth.exchangeCodeForSession()`을 호출해야 한다. 이 과정을 빼면 "로그인 누르면 외부 브라우저만 뜨고 끝" 상태가 된다.
- **P4** — 분기점을 코드 전반에 흩뿌리지 않기 위해 빌드 모드와 디렉터리 규칙으로 표면을 좁힌다. 외부 결제·외부 링크(Toss, 카카오 챗봇 등)는 in-app WebView 대신 `@capacitor/browser`로 시스템 브라우저에 위임해 결제·OAuth 정책 위반 리스크와 세션 충돌을 줄인다.
- **P5** — Supabase Edge Function이 보낸 push를 받을 수 있게 디바이스 토큰을 사용자별로 저장한다. SQS/큐 도입 없이 함수에서 직접 FCM HTTP v1을 때리는 1인 유지 가능 수준으로 한정.

---

## 3. 수정할 파일 / 새로 만들 파일

**P1**
- 신규: `capacitor.config.ts` — `appId: app.dewy`, `appName: Dewy`, `webDir: 'dist'`, (개발용) `server.url`은 환경변수로 토글.
- 신규(스캐폴드): `android/` (Capacitor CLI 생성, 커밋함)
- 수정: `package.json` — `cap:sync`, `android:dev`, `android:build` 스크립트 추가, `@capacitor/core` `@capacitor/cli` `@capacitor/android` 의존성 추가.
- 수정: `.gitignore` — Android 빌드 산출물 제외(`android/app/build/`, `android/.gradle/`, `*.keystore` 등).

**P2**
- 신규: `src/lib/platform.ts` — `isNativeApp()`, `getPlatform()` 헬퍼 (Capacitor 환경 감지, SSR 안전).
- 수정: `src/integrations/supabase/client.ts` — storage 어댑터를 platform 분기. 앱이면 Preferences 기반 `SupabaseAuthStorage` 사용.
- 신규: `src/integrations/supabase/preferencesStorage.ts` — Supabase `auth.storage` 인터페이스를 `@capacitor/preferences`로 래핑.
- 의존성 추가: `@capacitor/preferences`.

**P3**
- 수정: `src/contexts/AuthContext.tsx` — `signInWithGoogle/Kakao`의 `redirectTo`를 platform 분기 (`isNativeApp() ? 'app.dewy://auth/callback' : `${window.location.origin}/`).
- 신규: `src/lib/native/deepLink.ts` — `App.addListener('appUrlOpen', …)`에서 callback URL의 `code` 파라미터로 `supabase.auth.exchangeCodeForSession(url)` 호출.
- 수정: `src/main.tsx` — 앱일 때 한 번만 `registerDeepLinks()` 호출.
- 수정: `android/app/src/main/AndroidManifest.xml` — `intent-filter`에 `<data android:scheme="app.dewy" />` 추가, Custom Tabs 사용을 위해 `@capacitor/browser` 설치.
- Supabase 대시보드: Authentication → URL Configuration → Additional Redirect URLs에 `app.dewy://auth/callback` 추가 (코드 외 작업).

**P4**
- 수정: `vite.config.ts` — `mode === 'capacitor'`일 때 `base: './'`, PWA 플러그인 비활성(앱 안에서 SW 충돌 회피), 콘솔/소스맵 정책 조정.
- 신규: `src/lib/native/openExternal.ts` — Toss/카카오/외부 URL은 `Browser.open({ url })` 또는 웹 `window.open`으로 일원화.
- 수정: `package.json` — `cap:build` = `vite build --mode capacitor && npx cap sync`.
- 신규(컨벤션): `src/lib/native/` (앱 전용), `src/integrations/` (공용 어댑터), `src/pages/`·`src/components/`는 분기 호출만 한다. → 4번 항목에서 상술.

**P5** (1차 출시 보류 — 향후 재활성화 가이드)
- `supabase/migrations/20260519050000_device_tokens.sql` — 적용 시점에 `supabase db push` 또는 SQL 에디터로 한 번만 실행.
- `supabase/functions/send-push/index.ts` — `supabase functions deploy send-push`.
- 콘솔: Firebase 프로젝트 생성 → Android 앱(`app.dewy`) 추가 → `google-services.json` 다운로드 → `android/app/` 에 배치. Supabase Secrets 에 `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` 등록.
- 코드 재활성화:
  1) `npm i @capacitor/push-notifications`
  2) `src/lib/native/push.ts` 복원 (git log 에 P5 커밋 그대로 있음)
  3) `AuthContext` 의 SIGNED_IN 분기에 `void import('@/lib/native/push').then(({ registerPushNotifications }) => registerPushNotifications(session.user.id))` 한 줄 추가
  4) `android/app/src/main/AndroidManifest.xml` 에 `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` 추가
  5) Android `build.gradle` 에 Firebase `google-services` plugin 적용 (Capacitor 공식 가이드 참조)

---

## 4. 웹 공통 코드와 앱 전용 코드의 경계

**분기 전략은 "런타임 분기 + 디렉터리 분리"의 2단 구조로만 한다.** (Webpack alias 트릭, 두 엔트리 분리 등은 1인 운영에 과함.)

- `src/` 아래 디렉터리 규약
  - `src/lib/native/**` — Capacitor 플러그인을 import해도 되는 유일한 영역. 웹 빌드에서도 트리쉐이킹되도록 **모든 진입점은 비동기 동적 import 또는 `if (isNativeApp())` 내부에서만 호출**.
  - `src/integrations/**` — 양쪽 모두에서 쓰는 어댑터 (Supabase 클라이언트 등). 내부에서만 `isNativeApp()`으로 storage·redirect URI 차이를 흡수한다.
  - `src/pages/**`, `src/components/**` — Capacitor를 직접 import 금지. 외부 링크·딥링크·푸시 권한 같은 호출은 `src/lib/native` 어댑터를 거친다.
- 런타임 감지의 단일 출처: `src/lib/platform.ts`. `Capacitor.isNativePlatform()`을 SSR-safe하게 래핑하고 `import.meta.env.MODE === 'capacitor'`를 보조 신호로 둔다.
- 빌드 모드:
  - `vite build`(기본) → Vercel 웹 배포. PWA 플러그인 ON. base `/`.
  - `vite build --mode capacitor` → `npx cap sync`로 Android/iOS에 주입. PWA 플러그인 OFF, base `./`, console 보존.
- ESLint 가드(여유 생기면): `no-restricted-imports`로 `@capacitor/*`을 `src/lib/native/**`·`src/integrations/**` 밖에서 막는다.

---

## 5. Supabase 인증을 앱으로 가져올 때 주의점

- **딥링크 스킴 설계**: `app.dewy://auth/callback` 단일 경로로 통일. Universal Links/App Links(https 도메인)는 호스팅에 `assetlinks.json`/`apple-app-site-association`을 추가해야 하므로 1차 출시는 커스텀 스킴만으로 시작하고, iOS 출시 직전 Universal Link로 승격(보안·UX 개선) 검토.
- **OAuth redirect URI는 Supabase 화이트리스트만 추가하면 된다 (중요)**: provider 콘솔(Google/Kakao)은 손대지 않는다. Google OAuth client·Kakao Redirect URI 필드는 `http(s)://`만 허용해 `app.dewy://` 등록이 아예 거부된다. 실제 흐름은:
  1) provider 는 항상 Supabase 의 `https://<project>.supabase.co/auth/v1/callback`(이미 웹 로그인용으로 등록되어 있음) 으로 돌아온다.
  2) Supabase 가 `signInWithOAuth({ redirectTo: 'app.dewy://auth/callback' })` 의 `redirectTo` 값을 보고 그쪽으로 302 redirect.
  3) OS 가 커스텀 스킴을 잡아 앱을 깨우고 `appUrlOpen` 리스너가 `exchangeCodeForSession` 호출.
  → 그래서 등록 위치는 **Supabase → Authentication → URL Configuration → Additional Redirect URLs 한 곳**(`app.dewy://auth/callback`)으로 충분. Google/Kakao 콘솔은 변경 불필요.
- **세션 저장소**: WebView의 `localStorage`는 OS·사용자 정리 시 휘발 가능. `@capacitor/preferences` 기반 storage 어댑터(get/set/remove async)를 Supabase `auth.storage`에 주입. **주입 후에는 기존 사용자가 한 번 재로그인** 필요 — 1차 출시라 영향 없음, 사후 마이그레이션 시에는 명시 안내.
- **콜백 처리 위치**: 외부 브라우저(또는 Custom Tabs)에서 돌아오는 URL은 `App.addListener('appUrlOpen', …)`에서만 잡힌다. 앱이 종료 상태였다가 부팅된 케이스도 같은 listener가 deferred로 받으니, 등록을 `main.tsx` 부트스트랩 가장 앞쪽에 둔다.
- **토큰 자동 갱신**: Capacitor WebView는 백그라운드에서 JS 타이머가 throttle된다. `supabase.auth.autoRefreshToken: true`만 믿지 말고, 앱 resume(`App.addListener('resume', …)`)에서 `supabase.auth.refreshSession()` 한 번 명시 호출.
- **로그아웃 시 정리**: Supabase signOut 외에 push token 행 삭제, Preferences의 잔여 키(과거 localStorage migration 잔재 등) 정리.
- **결제·외부 OAuth 흐름**: Toss 결제 같은 외부 SDK는 in-app WebView 대신 `@capacitor/browser`(Custom Tabs/SFSafariViewController)로 띄우고 결과는 동일하게 딥링크 콜백으로 받는다. 자체 WebView로 띄우면 결제사 정책 위반·세션 미공유 문제 발생.
- **Apple 심사 대비(차후)**: Sign in with Apple 미제공이면 다른 소셜 로그인 사용 시 reject 사유가 된다. iOS 빌드 시점에 함께 추가.

---

## 6. 1번 우선순위 작업의 코드 초안

> 목표: 이 패치 적용 + 아래 CLI 명령 두 줄이면 `dist/` 산출물을 그대로 감싼 Android 에뮬레이터/실기기 앱이 뜬다.

### 6-1. `package.json` (스크립트·의존성만 발췌; 기존 항목은 유지)

```jsonc
{
  "scripts": {
    // 기존 스크립트는 그대로 두고 아래 4개만 추가
    "cap:sync": "cap sync",
    "cap:build": "vite build --mode capacitor && cap sync",
    "android:dev": "npm run cap:build && cap run android",
    "android:open": "cap open android"
  },
  "dependencies": {
    "@capacitor/android": "^6.1.2",
    "@capacitor/app": "^6.0.1",
    "@capacitor/core": "^6.1.2",
    "@capacitor/preferences": "^6.0.2"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.1.2"
  }
}
```

설치 후 1회 실행:
```
npx cap init "Dewy" "app.dewy" --web-dir dist
npx cap add android
```

### 6-2. `capacitor.config.ts` (신규, 루트)

```ts
import type { CapacitorConfig } from '@capacitor/cli';

// 환경변수로 "라이브 리로드 모드"를 토글한다.
//   - 기본(production / npm run cap:build): 번들된 dist/를 그대로 띄움.
//   - CAP_DEV_SERVER_URL 지정 시: Vite dev 서버(또는 Vercel preview)를 그대로 띄워
//     실기기에서 핫리로드 개발 가능. OAuth 콜백은 dev 환경에서도
//     동일한 커스텀 스킴(app.dewy://...)으로 돌아오게 한다.
const devUrl = process.env.CAP_DEV_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.dewy',
  appName: 'Dewy',
  // Vite 빌드 산출물 경로. vercel.json 의 outputDirectory 와 동일하게 'dist'.
  webDir: 'dist',
  // HTTPS 스킴으로 서빙해야 Supabase 등에서 'secure context' 전제 API가 동작한다.
  android: { allowMixedContent: false },
  server: {
    androidScheme: 'https',
    // dev 모드에서만 외부 URL 로드. 운영 빌드에서는 undefined여야 함(=번들 자산 로드).
    ...(devUrl
      ? { url: devUrl, cleartext: devUrl.startsWith('http://') }
      : {}),
  },
};

export default config;
```

### 6-3. `vite.config.ts` (수정 — 핵심 두 줄만 추가)

```ts
// 기존 import / plugins 그대로 유지. 두 가지만 바뀐다:
//   1) Capacitor 모드에선 상대경로(base './')로 빌드해야 file:// 로딩에서 자산 경로가 깨지지 않는다.
//   2) Capacitor 모드에선 PWA 서비스 워커를 비활성화 — 앱 WebView 안에서 SW가 살아 있으면
//      네이티브 푸시·세션 갱신과 충돌하고, 캐시가 OS 업데이트와 따로 놀게 된다.
export default defineConfig(({ mode }) => {
  const isCapacitor = mode === 'capacitor';
  return {
    base: isCapacitor ? './' : '/',
    server: { host: '::', port: 8080 },
    plugins: [
      react(),
      !isCapacitor &&
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            /* 기존 manifest 그대로 */
          },
          workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg}'] },
        }),
    ].filter(Boolean),
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  };
});
```

### 6-4. `.gitignore` (추가분)

```
# Capacitor / Android
/android/app/build/
/android/build/
/android/.gradle/
/android/local.properties
/android/app/release/
*.keystore
*.jks
```

### 6-5. 검증 시나리오 (P1 완료 기준)

1. `npm install`
2. `npx cap init "Dewy" "app.dewy" --web-dir dist` (이미 capacitor.config.ts 있으면 skip 가능)
3. `npx cap add android`
4. `npm run cap:build`
5. `npm run android:open` → Android Studio에서 에뮬레이터 실행, 앱이 로딩되고 기존 SPA 라우팅이 동일하게 동작하면 OK.
6. (회귀) `npm run build:vite && vercel deploy` 가 그대로 성공해야 함 — 웹 배포 경로에는 영향이 없어야 함.

> 이 시점에서 로그인은 **아직 깨져 있는 것이 정상**(외부 OAuth 콜백이 web origin으로 돌아가서 앱으로 못 돌아옴). P2/P3 작업으로 이어진다.
