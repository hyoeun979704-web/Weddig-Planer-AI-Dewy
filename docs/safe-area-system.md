# 안전영역(상태바·하단바) 시스템 — 단일 소스 + 업계 전수조사

> "상단 표시줄·하단 액션줄이 항상 오류가 많았다"의 근본 원인과 해결 표준. 새 화면에서
> 상단/하단 바를 다룰 땐 **이 문서의 패턴만** 쓴다. CSS 정의 단일 소스는 `src/index.css`.

## TL;DR (왜 자꾸 깨졌나 → 표준)
- **근본 원인**: 안드로이드 WebView 는 CSS `env(safe-area-inset-*)` 가 **0/유령값**이라
  믿을 수 없다(특히 WebView<140, viewport-fit=cover 결합 시 기기별 과여백 — 우리 #286).
  그래서 어떤 화면이 `env()` 를 **직접** 쓰면, 안드로이드에서 그 값이 0 → 하단 CTA 가
  하단탭/홈인디케이터에 **가려진다**(반복된 회귀의 정체).
- **표준(이미 구축됨)**: 네이티브에서 실측한 인셋을 CSS 변수로 주입하고, 화면은 항상
  그 변수를 거친다. `env()` 직접 사용 **금지**(가드 테스트가 차단).

## 우리 아키텍처 (env() 우회 — 업계 best-practice 와 동일)
```
iOS / 웹   →  env(safe-area-inset-*)            (Capacitor 기본 edge-to-edge + viewport-fit=cover, 정확)
안드로이드  →  MainActivity 가 WindowInsets 실측  →  --android-safe-area-top/bottom 주입
            (systemBars() | displayCutout(), px→dp 밀도 변환)
                         ↓ 공통 indirection
   --safe-top / --safe-bottom   (html.platform-android 가 안드로이드값으로 오버라이드)
                         ↓
   화면은 var(--safe-top/--safe-bottom) 와 .safe-* 유틸만 사용
```
- 플랫폼 클래스(`platform-android`)는 `main.tsx` 가 부팅 시 부여 → **첫 페인트부터** 적용(깜빡임 0).
- 상태바 색은 `body::before` 스크림(브랜드 핑크) + Android `styles.xml` `statusBarColor`.
- Android `targetSdk 35`(Android 15) → edge-to-edge **강제**라 시스템바 배경이 없어, 웹 레이어가
  안전영역만큼 안쪽으로 들어가는 이 구조가 **필수**.

## 표준 패턴 (이것만 쓴다 — `src/index.css @layer utilities`)
| 용도 | 클래스 | 효과 |
|---|---|---|
| 상단 스티키 헤더 | `.safe-sticky-header` | `top:0; padding-top: var(--safe-top)` |
| 헤더 아래 탭/필터바 | `.safe-sticky-below-header` / `.safe-category-tabs` | `top: var(--app-header-total-height)` |
| 하단 고정 내비 | `.safe-bottom-nav` | `padding-bottom: var(--safe-bottom)` |
| **하단 고정/스티키 CTA 바** | **`.safe-bottom-cta`** | `padding-bottom: calc(1rem + var(--safe-bottom))` |
| 본문 스크롤 하단 여백(내비 가림 방지) | `.safe-bottom-scroll` | `calc(nav-total + 16px)` |
| AI 입력바/스크롤 | `.safe-ai-input-offset` / `.safe-ai-scroll` | 내비 높이 기준 |

**규칙**
1. `.tsx` 에서 `env(safe-area-*)` **직접 사용 금지** — 항상 `var(--safe-*)` 또는 위 유틸.
2. 화면 하단에 붙는 예약·구매·문의 등 CTA 바 = **`.safe-bottom-cta`** (예전 `pb-[max(1rem,env(...))]` 금지).
3. 새 토큰이 필요하면 `index.css` 에만 추가(복붙 인라인 금지 — 드리프트=회귀).
4. **가드**: `src/lib/native/safeArea.guard.test.ts` 가 `.tsx` 의 raw `env(safe-area-*)` 를
   CI 에서 차단(주석 언급은 오탐 안 함).

## 이번 적용 (260620)
- raw `env(safe-area-inset-bottom)` 직접 사용 3곳 → `.safe-bottom-cta` 로 교체(안드로이드 하단 가림 수정):
  `ProductDetailPage.tsx`, `EventDetailPage.tsx`, `business/BusinessGuideView.tsx`.
- `.safe-bottom-cta` 유틸 신설 + 회귀 가드 테스트 추가.

## 업계 전수조사 (참고 — 외부 표준과의 비교)
- **CSS `env(safe-area-inset-*)`**: iOS 정확, 안드로이드 WebView 불안정(<140 은 0). → 우리는 안드로이드만 네이티브 실측으로 대체.
- **`@capacitor-community/safe-area` 플러그인**: 위 문제를 패키지로 해결(네이티브 인셋 주입,
  구버전 Chromium 은 webview 패딩). 단 **Capacitor 7/8 필요** — 우리는 **Capacitor 6** 이라
  현재는 `MainActivity` 자체 구현이 사실상 동일 역할(불필요한 메이저 업그레이드 회피).
- **Capacitor 7 신규 config**: `adjustMarginsForEdgeToEdge`("auto"/"force"/"disable"),
  `SystemBars.insetsHandling` — edge-to-edge 마진을 네이티브가 처리. → **Cap7 업그레이드 시
  채택 검토**(자체 MainActivity 코드를 플러그인으로 대체 가능).
- **viewport meta**: `viewport-fit=cover` 필수 — `index.html` 에 이미 적용됨. ✅
- 출처: Capawesome "Capacitor Edge-to-Edge & Safe Areas" 가이드, `@capacitor-community/safe-area`,
  Capacitor System Bars/Status Bar 문서, ionic-team/capacitor #2840·#6823·#7648·#7951.

## 남은 점검(낮은 위험 — deferred)
- 데스크톱(≥lg) `BottomNav`→사이드바 전환 시 `safe-top` 미적용(현재 데스크톱은 `--safe-top=0`이라 무영향).
- `body::before` z-index `2147483647` — 다이얼로그가 더 큰 z-index 쓰면 상태바 아이콘 클릭 막힘(현재 모달 z-50~70, 안전).
- `MainActivity` px→dp 밀도 변환 반올림(실기기 <1px, 무시 가능).
- **실기기 검증 권장**: Android 15(SDK35) 단말에서 상단/하단 바 직접 확인(코드는 표준 충족, e2e 실측은 별도).
