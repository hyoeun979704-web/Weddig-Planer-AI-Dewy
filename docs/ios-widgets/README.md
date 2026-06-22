# iOS 홈 위젯(WidgetKit) — Xcode 적용 런북 (초안 코드 동봉)

> 이 폴더의 `.swift`/`.m` 는 **Mac+Xcode 에서 ios/ 프로젝트에 복사해 넣는 초안**이다(리눅스 CI 에서
> iOS 빌드 불가 — 코드만 준비). Android 와 **같은 스냅샷 푸시 구조**(App Group UserDefaults).
> 데이터 흐름·위젯 스펙은 `docs/widget-system.md` 참조. 사전: `docs/ios-packaging.md`(ios/ 생성).

## 0. 위젯 ↔ 앱 데이터 공유 = App Group (필수)
1. Apple Developer → Identifiers → App Group **`group.app.dewy.widget`** 생성.
2. Xcode 에서 **앱 타깃(App)** 과 **위젯 타깃(DewyWidgets)** 둘 다 Signing & Capabilities →
   **+ App Groups** → `group.app.dewy.widget` 체크. (둘이 같은 그룹이어야 UserDefaults 공유됨.)

## 1. 위젯 익스텐션 타깃 추가
1. Xcode → File → New → Target → **Widget Extension** (이름 `DewyWidgets`, "Include Live Activity" 끔).
2. 생성된 템플릿 파일을 지우고 이 폴더의 다음을 그 타깃에 추가:
   - `Snapshot.swift` (App Group 읽기 + D-Day 계산 모델)
   - `Provider.swift` (TimelineProvider — 자정 갱신)
   - `DewyWidgets.swift` (@main WidgetBundle + 4개 위젯 + 뷰)
3. 위젯 타깃 Deployment Target ≥ iOS 14 (iOS 17 인터랙티브/`containerBackground` 분기 포함).

## 2. Capacitor 브리지 플러그인(앱 타깃)
앱이 스냅샷을 써주고 위젯을 갱신하는 플러그인. **앱 타깃(App)** 에 추가:
- `WidgetBridge.swift` (`CAPPlugin` 서브클래스, name="WidgetBridge", method `update`)
- `WidgetBridge.m` (`CAP_PLUGIN` 매크로로 Capacitor 에 등록 — ObjC 브리지)

웹 인터페이스는 이미 있음: `src/lib/native/widgetBridge.ts`(`registerPlugin("WidgetBridge")`).
Capacitor 가 `CAP_PLUGIN` 매크로로 자동 등록하므로 별도 코드 등록 불필요.

## 3. URL 스킴(딥링크)
탭/바로추가는 `app.dewy://...` 로 앱을 연다(Android 와 동일). `ios/App/App/Info.plist` 의
`CFBundleURLTypes` 에 스킴 `app.dewy` 가 있어야 한다(`docs/ios-packaging.md §3` 에서 이미 등록).
앱 복귀 후 라우팅은 웹 `deepLink.ts`→`widgetNav` 가 처리(플랫폼 공용).

## 4. 검증(Mac)
- 위젯 갤러리에 4종(콤보/D-Day/체크리스트/예산) 노출, 데이터 채워짐(앱 1회 실행해 스냅샷 푸시 후).
- 탭 → 해당 화면 이동, D-Day/예산 '추가' → 빠른추가 시트.
- D-Day 가 자정에 갱신(Provider 의 `.after(자정)` 정책).

## 5. 한계
- 본 코드는 이 리눅스 환경에서 **컴파일 불가**(Xcode 전용) — 구조·API 검증까지. 실빌드는 Mac.
- 크기 매핑: Android 셀(2×1/2×2/4×2)을 iOS 패밀리(systemSmall/systemMedium)로 단순화.
