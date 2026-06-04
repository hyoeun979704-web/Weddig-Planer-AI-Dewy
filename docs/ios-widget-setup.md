# iOS 위젯 설정 (macOS + Xcode 필요)

리눅스/웹 환경에서는 iOS 네이티브를 생성·빌드할 수 없어, 위젯 코드는 `ios/` 아래
**스캐폴딩**으로만 커밋돼 있다. macOS 에서 아래 절차로 연결한다.

## 1. iOS 프로젝트 생성
```bash
npm install
npm run cap:build        # 또는: npm run build:vite && npx cap sync
npx cap add ios
npx cap sync ios
```

## 2. Widget Extension 타깃 추가
1. `ios/App/App.xcworkspace` 를 Xcode 로 연다.
2. File → New → Target → **Widget Extension**. 이름 `DewyWidgets`, "Include Configuration Intent" 체크 해제.
3. 자동 생성된 템플릿 Swift 파일을 지우고 **`ios/DewyWidgets/DewyWidgets.swift`** 를 타깃에 추가.
4. `ios/DewyWidgets/Info.plist`, `ios/DewyWidgets/DewyWidgets.entitlements` 를 타깃 설정에 연결.

## 3. App Group 활성화 (데이터 공유의 핵심)
- **앱 본체(App) 타깃**과 **DewyWidgets 타깃** 둘 다:
  Signing & Capabilities → **+ App Groups** → `group.app.dewy` 추가.
- 그룹 ID 를 바꾸면 `DewyWidgets.swift` 와 `WidgetBridgePlugin.swift` 의 `appGroupId`,
  그리고 entitlements 도 함께 바꿔야 한다.

## 4. WidgetBridge 플러그인 연결
- `ios/plugin-scaffold/WidgetBridgePlugin.swift` 와 `WidgetBridgePlugin.m` 을 **App 타깃**에 추가.
- 이 플러그인이 JS `syncWidgets()` 가 보낸 payload 를 App Group UserDefaults("payload")에
  쓰고 `WidgetCenter.reloadAllTimelines()` 로 위젯을 갱신한다.
- JS 쪽(`src/lib/native/widgetSync.ts`)은 이미 `registerPlugin('WidgetBridge')` 로 호출하므로
  플러그인만 추가되면 자동 동작한다(추가 전에는 안전하게 no-op).

## 5. 검증
- 빌드 후 홈 화면에 Dewy 위젯 3종(D-day/일정/예산) 추가.
- 앱에서 예식일·일정·예산을 변경 → 위젯이 갱신되는지 확인.
- payload 스키마는 Android 와 동일(`WidgetPayload` in widgetSync.ts).
