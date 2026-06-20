# Android 타깃 SDK · Capacitor 업그레이드 (최신 기준 전수조사 — Android 17/API 37)

> 작성 260620. "안드로이드 17 이상 기준으로 맞춰야 한다"에 따른 **현재 공식 기준 재조사**와
> 적용 계획. 과거엔 "Android 15/SDK35" 기준으로 코딩돼 있었음 → 이 문서가 최신 단일 소스.
> ⚠️ **이 컨테이너엔 Android SDK가 없어 빌드 검증 불가** — 실제 업그레이드는 로컬(Android
> Studio)에서 컴파일·실기기 검증 필수. 여기 수치/단계는 검증 전 계획이다.

## 1. Android 버전 ↔ API 레벨 (최신)
| Android | API | 상태(2026-06 기준) |
|---|---|---|
| 15 | 35 | 안정 (현재 우리 targetSdk) |
| 16 | 36 | 안정 (2025 출시) |
| **17** | **37** | **안정 ~2026-06** (Beta는 2026-02). Beta2 2026-02. |

## 2. Google Play 타깃 SDK 요건 (중요 — "17은 아직 *필수* 아님")
- **현재**: 신규 앱·업데이트는 **targetSdk 35(Android 15) 이상** 필수(2025-08-31~).
  기존 앱 유지에는 34 이상.
- **API 37(Android 17) 필수화 데드라인 = 2027-08.** 즉 지금 17로 올리는 건 **선제(future-proof)**
  이지 Play 정책상 강제는 아니다. (그래도 최신 단말 동작·정책 대비로 올리는 건 합당.)

## 3. 현재 우리 상태 (repo 실측)
| 항목 | 값 | 비고 |
|---|---|---|
| Capacitor | **6.2.1** (`@capacitor/core·android·cli`) | |
| compileSdk / targetSdk | **35 / 35** (`android/variables.gradle`) | Android 15 |
| minSdk | 22 | Cap8은 24 요구 |
| AGP | 8.13.2 (`android/build.gradle`) | |
| Gradle | 8.13 (wrapper) | |
| 시스템바 색 | `styles.xml` `statusBarColor`/`navigationBarColor` = `@color/dewyPrimary` | **API 35+ edge-to-edge에선 deprecated/무시**, ≤14 기기에서만 적용 |
| 안전영역 | `MainActivity` WindowInsets 실측 주입 → `--safe-*` | 최신 권장 방식 (상세 `safe-area-system.md`) |

## 4. Capacitor ↔ 지원 SDK 매핑 (핵심 제약)
Capacitor는 **메이저 버전마다 권장 compileSdk/targetSdk가 묶여** 있다(공식 표 기준):
| Capacitor | 권장 compile/target SDK | minSdk | 비고 |
|---|---|---|---|
| 6 | 34 (기본) — 35로 수동 상향 가능(현재 우리) | 22 | |
| 7 | 35 | 23 | |
| **8** | **36** (Android 16) | **24** | Android Studio Otter(2025.2.1+), 최신 AGP/Gradle 필요 |
| 37(Android 17) 지원 | **미확인 — Capacitor가 37 릴리스를 내야 GA** | — | 17이 막 안정화돼 Cap 지원이 따라오는 중일 수 있음. **출시 확인 필요** |

> 결론: **"17(API 37)"을 깔끔히 타깃하려면 Capacitor가 37을 공식 지원해야** 한다. 현 시점
> 현실적 "최신"은 **Capacitor 8 + API 36**. 37은 Capacitor가 지원하는 즉시 한 단계 더 올린다.
> compileSdk만 더 높게 두는 편법은 androidx/AGP 호환 깨질 수 있어 권장 안 함.

## 5. 17+ 타깃 시 적용해야 할 주요 변경
### 5-1. 업그레이드 체인 (Cap 6 → 8)
1. `package.json`: `@capacitor/*` 및 모든 `@capacitor/...`·커뮤니티 플러그인 **^8** 로.
   (admob·app·browser·camera 등 설치된 플러그인 전부 Cap8 호환 버전 확인.)
2. `npm install` → `npx cap sync android`.
3. `android/variables.gradle`: `compileSdkVersion=36, targetSdkVersion=36, minSdkVersion=24`
   (37 지원 확인되면 36→37). androidx 버전들 Cap8 기본값으로 상향.
4. `android/build.gradle`: AGP를 Cap8 요구치로(8.13 → Cap8 권장 버전), Gradle wrapper도 상향.
5. Android Studio **Otter(2025.2.1)+** 필요.
6. `cap doctor` 로 정합성 점검.

### 5-2. API 37(Android 17) 런타임 Breaking Change — 우리 영향
- **대형 화면 적응 강제**: API 37 타깃 시 `screenOrientation`·`resizeableActivity`·
  `minAspectRatio`·`maxAspectRatio`가 **sw>600dp(태블릿·폴더블 펼침)에서 무시**되고 앱이
  창 전체를 채운다. → 우리는 모바일 430px 칼럼 셸이라 **태블릿/폴더블에서 레이아웃 확인 필요**
  (이미 `≥lg` 반응형 셸·사이드바가 있으니 그 경로가 큰 화면에서 깨지지 않는지 점검).
- **프라이버시 강화**: 연락처·로컬 네트워크·SMS 접근 세분화 권한. → 우리가 해당 권한을 쓰면 점검
  (현재 큰 사용 없음으로 보이나 플러그인 권한 전수 확인).

### 5-3. 시스템바 색상(edge-to-edge) 정리
- Android 15+(edge-to-edge 강제, Android 16에서 opt-out 완전 제거)에서 `android:statusBarColor`/
  `navigationBarColor`는 **무시**된다. 색은 웹 레이어 스크림(`body::before`, 이미 구현)이 담당.
- `styles.xml`의 두 속성은 **≤Android 14 기기 호환**으로 남겨두되(=그 기기엔 여전히 유효),
  최신 기기에선 스크림이 정답임을 인지. (상세 `safe-area-system.md`.)

## 6. 검증 계획 (필수 — 추측 금지)
- 로컬 Android Studio에서 `./gradlew bundleRelease` 컴파일 성공.
- **실기기 e2e**: Android 17 단말(또는 에뮬레이터 API 37) + 폴더블/태블릿에서
  상단바·하단바·대형화면 레이아웃·핵심 플로우(로그인→견적→보드) 확인.
- 이 컨테이너에서는 SDK 부재로 **빌드/실기기 검증 불가** → 위 단계는 로컬에서.

## 7. 권장 결론
1. **Capacitor 8 + targetSdk 36(Android 16)** 로 먼저 올린다(현 시점 깔끔히 지원되는 최신).
2. **API 37(Android 17)**: Capacitor의 37 지원 릴리스 확인되는 즉시 36→37 한 단계 더 + 5-2 대형화면
   대응. Play 강제는 2027-08이라 시간 여유 있음.
3. 모든 단계는 로컬 빌드·실기기 검증 후 릴리스(`release-guide-android.md`).

## 출처
- Android 17/API 37: developer.android.com/about/versions/17, Android Developers Blog
  (2026-02 "First Beta of Android 17", "resizability and orientation changes in Android 17").
- Play 타깃 요건: support.google.com/googleplay/android-developer/answer/11926878,
  developer.android.com/google/play/requirements/target-sdk.
- Capacitor SDK 매핑: capacitorjs.com/docs/android/setting-target-sdk, Capawesome
  "Upgrade to Capacitor 8".
