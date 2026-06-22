# 홈 위젯 시스템 설계 (Android + iOS)

> 홈/잠금화면 위젯 기획·구현 단일 소스. Android(네이티브 AppWidget)·iOS(WidgetKit)를 공용
> **스냅샷 푸시** 구조로 묶는다. 데이터 출처 검증은 `src/integrations/supabase/types.ts` 기준.
> ⚠️ 네이티브 빌드(gradle/Xcode)는 이 저장소 CI(리눅스)에서 불가 — `dl.google.com`(SDK·Maven)
> 차단. 코드/설정/문서는 준비하고, **실빌드·실행은 Android Studio / Mac+Xcode 에서** 한다.

## 1. 위젯 목록 (확정)

| 위젯 | id | Android 크기(셀) | iOS 패밀리 | 표시 데이터 | 탭 → | 바로추가 |
|---|---|---|---|---|---|---|
| D-Day + 체크리스트 콤보 | `combo` | 3×1 ~ 4×2 | systemMedium | D-Day + 할일 완료/전체 | `/schedule` | — |
| D-Day | `dday` | 2×1 ~ 4×1 | systemSmall/Medium | D-Day | `/schedule` | ✅ 일정 추가 |
| 체크리스트 | `checklist` | 2×2 ~ 4×2 | systemSmall/Medium | 할일 완료/전체(+막대) | `/vendor-board` | — |
| 예산 | `budget` | 2×2 ~ 4×2 | systemSmall/Medium | 사용/전체(+막대) | `/budget` | ✅ 예산 추가 |

- **D-Day** = `user_wedding_settings.wedding_date` 로 오프라인 계산(`daysUntilWedding`, `src/lib/schedule.ts`).
  `wedding_date_tbd` 또는 미설정이면 "예식일을 정해보세요" 안내(탭→/schedule).
- **할일 완료/전체** = `user_schedule_items` 의 `completed=true` 개수 / 전체 개수.
- **예산 사용/전체** = `sum(budget_items.amount)` / `budget_settings.total_budget`(만원 단위 — 표시 시 "만원").

## 2. 아키텍처 — 스냅샷 푸시 (위젯은 백엔드 직접 호출 안 함)

웹앱이 핵심 값만 **공유 저장소**에 써주고 위젯은 그걸 읽어 렌더한다. v1 은 위젯에서 네트워크/토큰
없이 동작(토큰 노출 0, 위젯 갱신 예산 절약). "바로추가"는 딥링크로 앱 빠른추가 화면을 연다.

```
[웹앱]  useWidgetSync() ──(값 변경/로그인/resume 시)──▶  WidgetBridge.update(snapshot)
                                                            │
                         Android: SharedPreferences          │  iOS: App Group UserDefaults
                         "dewy.widget" key="snapshot"(JSON)   │  suite "group.app.dewy.widget"
                                                            ▼
[위젯]  AppWidgetProvider(Android) / TimelineProvider(iOS) ── 스냅샷 읽어 렌더 + 탭/추가 딥링크
```

### 스냅샷 스키마 (JSON, 단일 소스 `src/lib/native/widgetBridge.ts`)
```ts
interface WidgetSnapshot {
  weddingDate: string | null;   // ISO date (yyyy-mm-dd) | null(미설정/TBD)
  checklist: { done: number; total: number };
  budget:    { usedManwon: number; totalManwon: number };  // 만원 단위
  updatedAt: number;            // epoch ms (위젯 "n분 전 동기화" 표기용)
}
```
- 토큰/PII 미포함(보안). 값이 0/빈 상태면 위젯이 안내문으로 폴백(빈 위젯 금지).

## 3. Capacitor 브리지 플러그인 `WidgetBridge`

- **웹 인터페이스** `src/lib/native/widgetBridge.ts`: `update(snapshot)` — 네이티브에서만 실제 동작,
  웹/미지원은 no-op(빌드·웹 무영향). `registerPlugin<...>("WidgetBridge")`.
- **Android** `WidgetBridgePlugin.java`(`@CapacitorPlugin(name="WidgetBridge")`):
  SharedPreferences("dewy.widget")에 `snapshot` 저장 → 4개 Provider 에 `AppWidgetManager
  .updateAppWidget` 브로드캐스트(즉시 갱신). `MainActivity` 패키지(`app.dewy`)에 등록.
- **iOS** `WidgetBridge.swift`: App Group UserDefaults(suite `group.app.dewy.widget`)에 저장 →
  `WidgetCenter.shared.reloadAllTimelines()`.

### 동기화 시점 (`useWidgetSync`)
앱 최상단(로그인 사용자)에 1개 마운트. ① 마운트 ② `App` resume ③ 관련 mutation 후
(`addScheduleItem`·`toggleItemCompletion`·`addItem(budget)`·`saveWeddingDate`)에 `syncWidgets()` 호출.
값은 가볍게 직접 select(예식일/스케줄 카운트/예산 합계)로 계산 — 페이지 훅에 강결합하지 않음.

## 4. 딥링크 라우트 (`src/lib/native/deepLink.ts` 확장)

기존 `app.dewy://auth/callback` 외에 위젯용 추가(웹 라우터로 navigate):
| 딥링크 | 동작 |
|---|---|
| `app.dewy://schedule` | `/schedule` 이동 |
| `app.dewy://schedule/new` | `/schedule` + 일정 빠른추가 시트 자동 오픈(`?add=1`) |
| `app.dewy://vendor-board` | `/vendor-board` 이동 |
| `app.dewy://budget` | `/budget` 이동 |
| `app.dewy://budget/new` | `/budget` + 지출 빠른추가 시트 자동 오픈(`?add=1`) |

- 빠른추가: 대상 페이지가 `?add=1`(또는 라우터 state)일 때 기존 추가 시트(`BudgetAddSheet`/일정 추가 폼)를
  자동 오픈. 새 폼을 만들지 않고 **기존 추가 UI 재사용**(중복 금지).

## 5. Android 구현 맵
```
android/app/src/main/java/app/dewy/widget/
  WidgetSnapshot.java         # prefs 읽기 + JSON 파싱 + D-Day 계산(공용)
  ComboWidgetProvider.java    # 3×1~4×2  → app.dewy://schedule
  DdayWidgetProvider.java     # 2×1~4×1  → app.dewy://schedule, 추가=app.dewy://schedule/new
  ChecklistWidgetProvider.java# 2×2~4×2  → app.dewy://vendor-board
  BudgetWidgetProvider.java   # 2×2~4×2  → app.dewy://budget, 추가=app.dewy://budget/new
WidgetBridgePlugin.java       # @CapacitorPlugin — prefs 쓰기 + 위젯 갱신
res/layout/widget_*.xml       # RemoteViews 레이아웃(위젯별)
res/xml/widget_*_info.xml     # AppWidgetProviderInfo(크기·리사이즈·미리보기)
res/drawable/widget_bg.xml    # 둥근 카드 배경(브랜드 핑크)
AndroidManifest.xml           # <receiver> 4개 + 플러그인 자동 등록(BridgeActivity 패키지 스캔)
```
- 크기: `minWidth/minHeight`(dp = 70*n-30) + API31+ `targetCellWidth/Height` + `resizeMode`.
- 탭/추가: `PendingIntent`(VIEW, data=`app.dewy://...`) → MainActivity(singleTask) → `appUrlOpen`.

## 6. iOS 구현 맵 (Mac+Xcode 전용 — 초안 제공)
```
ios/App/DewyWidgets/            # Widget Extension 타깃(Xcode 에서 추가)
  DewyWidgetBundle.swift        # @main WidgetBundle — 4개 위젯 등록
  Snapshot.swift                # App Group UserDefaults 읽기 + 모델
  ComboWidget / DdayWidget / ChecklistWidget / BudgetWidget .swift
  Provider.swift                # TimelineProvider(스냅샷 → 1개 엔트리, D-Day 자정 갱신)
ios/App/App/ ... WidgetBridge.swift  # Capacitor 플러그인(공유 저장 + reloadAllTimelines)
```
- **App Group** `group.app.dewy.widget` 를 앱·위젯 타깃 양쪽 Capabilities 에 추가(필수).
- Link/탭: `widgetURL(URL("app.dewy://..."))`. iOS17 위젯은 `.containerBackground` 필요.
- 크기 매핑: 2×1/2×2→systemSmall, 3×1/4×2→systemMedium.

## 7. 검증 한계 (정직)
- **웹 코어**(브리지 IF·useWidgetSync·딥링크·빠른추가): `npm run build`·lint·test 로 검증.
- **네이티브**(Android Java/XML·iOS Swift): 이 환경에서 **빌드 불가**(SDK·Maven 차단) — 구조·관례
  검증까지. 실빌드/실기기 동작은 Android Studio/Xcode 에서. 빌드 런북: §5·§6 + `docs/ios-packaging.md`.
