// 홈 화면 위젯 데이터 브리지 — D-day / 일정 / 예산.
//
// 커스텀 Capacitor 플러그인 `WidgetBridge`(Android: WidgetBridgePlugin.java)에
// JSON 을 넘기면 SharedPreferences 에 저장하고 AppWidget 갱신을 브로드캐스트한다.
// iOS 는 빌드(`npx cap add ios` + 위젯 익스텐션) 후 같은 플러그인 인터페이스를
// App Group UserDefaults 로 연결한다(docs/ios-widget-setup.md). 웹/미구현
// 플랫폼에서는 호출이 조용히 무시된다(플러그인 미등록).

import { registerPlugin } from "@capacitor/core";
import { isNativeApp } from "@/lib/platform";

export interface WidgetDdayData {
  /** 예: "D-100" / "D-DAY" */
  label: string;
  /** 사람이 읽는 예식일. 예: "2026년 6월 6일" */
  dateText: string;
}

export interface WidgetScheduleEntry {
  title: string;
  /** 예: "D-7" 또는 "오늘" */
  dateLabel: string;
}

export interface WidgetBudgetData {
  spent: number;
  total: number;
  remaining: number;
}

export interface WidgetPayload {
  dday: WidgetDdayData | null;
  schedule: WidgetScheduleEntry[];
  budget: WidgetBudgetData | null;
}

interface WidgetBridgePlugin {
  /** 위젯에 표시할 데이터를 네이티브 저장소에 기록하고 위젯을 갱신. */
  updateWidgets(options: { payload: string }): Promise<void>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge");

/**
 * 위젯 데이터를 네이티브로 전달. 네이티브가 아니거나 플러그인 미등록(iOS 빌드 전)
 * 이면 조용히 무시한다.
 */
export async function syncWidgets(payload: WidgetPayload): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await WidgetBridge.updateWidgets({ payload: JSON.stringify(payload) });
  } catch (e) {
    // 플러그인 미구현 플랫폼(예: iOS 빌드 전) — 무시.
    console.warn("[widget] sync skipped:", (e as Error)?.message);
  }
}
