import { getPlatform } from "../platform";

// 안드로이드 네이티브에서 상태바 안전영역을 제대로 잡는다.
//
// 배경: index.css 는 헤더를 `.safe-sticky-header { padding-top: var(--safe-top) }`,
//   `--safe-top: max(env(safe-area-inset-top), var(--android-safe-area-top))` 로 잡아
//   상태바 아래에 고정되도록 설계돼 있다(= edge-to-edge 전제). 그런데 안드로이드
//   WebView 는 기본적으로 콘텐츠가 상태바 아래로 들어가지 않아 env(safe-area-inset-top)
//   이 0 이 되는 경우가 있고, 그러면 헤더가 상태바에 가려질 수 있다.
//
// 해결: StatusBar 를 overlay(콘텐츠를 상태바 뒤까지 그림) 모드로 전환하면 WebView 가
//   edge-to-edge 가 되어 env(safe-area-inset-*) 인셋이 실제 상태바/네비바 높이를
//   반영한다. 그 즉시 기존 --safe-top / --safe-bottom 계산이 동작해 헤더·하단탭이
//   안전영역 안으로 정확히 들어간다.
//
// - iOS 는 Capacitor 가 기본 edge-to-edge 라 env() 가 이미 동작 → 건드리지 않음.
// - 웹에서는 호출되지 않음(main.tsx 의 isNativeApp 가드) — 웹 동작에 영향 0.
// - @capacitor/status-bar 미설치(웹 빌드 등)에서도 깨지지 않도록 동적 import +
//   vite-ignore. 지정자를 string 타입 변수로 둬 번들 정적 분석을 피한다.

const STATUS_BAR_PKG: string = "@capacitor/status-bar";

export async function initAndroidSafeArea(): Promise<void> {
  if (getPlatform() !== "android") return;
  try {
    const mod = await import(/* @vite-ignore */ STATUS_BAR_PKG);
    // 콘텐츠를 상태바 뒤까지 그려 edge-to-edge → env(safe-area-inset-*) 유효화.
    await mod.StatusBar.setOverlaysWebView({ overlay: true });
  } catch (e) {
    console.warn("[safeArea] StatusBar overlay 설정 실패(@capacitor/status-bar 미설치?)", e);
  }
}
