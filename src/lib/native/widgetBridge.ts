import { isNativeApp } from "@/lib/platform";

// 홈 위젯(Android AppWidget / iOS WidgetKit) 데이터 브리지 — 웹 인터페이스(단일 소스).
// 웹앱이 핵심 값만 공유 저장소에 써주고 위젯이 그걸 읽어 렌더한다(스냅샷 푸시). 위젯은 백엔드를
// 직접 호출하지 않으므로 토큰/PII 를 절대 넣지 않는다. 설계: docs/widget-system.md.
//
// 네이티브 플러그인 `WidgetBridge.update({ snapshot })` 구현:
//   Android = SharedPreferences("dewy.widget") 저장 + 4개 Provider 갱신,
//   iOS     = App Group UserDefaults 저장 + WidgetCenter.reloadAllTimelines().
// 웹/미지원 환경은 no-op(@capacitor/core 를 동적 import 해 웹 번들 오염 방지).

export interface WidgetSnapshot {
  weddingDate: string | null; // ISO date(yyyy-mm-dd) | null(미설정/TBD)
  checklist: { done: number; total: number };
  budget: { usedManwon: number; totalManwon: number }; // 만원 단위
  updatedAt: number; // epoch ms
}

interface WidgetBridgePlugin {
  update(options: { snapshot: string }): Promise<void>;
}

let cached: WidgetBridgePlugin | null = null;

async function getPlugin(): Promise<WidgetBridgePlugin | null> {
  if (!isNativeApp()) return null;
  if (cached) return cached;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    cached = registerPlugin<WidgetBridgePlugin>("WidgetBridge");
    return cached;
  } catch {
    return null; // 플러그인 미설치(구버전 네이티브) — 조용히 건너뜀.
  }
}

/** 위젯 스냅샷을 네이티브 공유 저장소에 밀어넣고 위젯을 갱신. 웹/미지원은 no-op. */
export async function updateWidgets(snapshot: WidgetSnapshot): Promise<void> {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.update({ snapshot: JSON.stringify(snapshot) });
  } catch (e) {
    // 위젯 갱신 실패는 앱 흐름에 영향 주지 않게 삼킨다(관측만).
    console.warn("[widgetBridge] update failed", e);
  }
}
