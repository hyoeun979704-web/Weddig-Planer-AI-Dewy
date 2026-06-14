import { getPlatform } from "../platform";

// 네이티브(안드로이드·iOS) 상태바 안전영역 + 스타일을 잡는다.
//
// 안전영역(헤더가 상태바 아래로 들어가는 패딩)의 실제 값 주입은 플랫폼별로 다르다:
//   - 안드로이드: MainActivity 가 WindowInsets 를 측정해 --android-safe-area-* 로 주입
//     (index.css 의 html.platform-android 가 --safe-top/bottom 에 연결).
//   - iOS: Capacitor 가 기본 edge-to-edge + viewport-fit=cover 라 env(safe-area-inset-*)
//     이 노치/다이나믹아일랜드를 정확히 반영(index.css :root 기본값).
//
// 여기서 하는 일은 두 가지(양 플랫폼 공통):
//   1) StatusBar overlay(edge-to-edge) 보장 → 콘텐츠가 상태바 뒤까지 그려져 인셋이 유효.
//   2) 상태바 콘텐츠(시계·배터리 아이콘) 스타일을 밝은 배경용으로 → 어두운 아이콘(가독성).
//      상태바 배경은 web 스크림(body::before, 프라이머리 #F6909B)이 칠한다.
//
// - 웹에서는 호출되지 않음(main.tsx 의 isNativeApp 가드) — 웹 동작 영향 0.
// - @capacitor/status-bar 미설치(웹 빌드 등)에서도 깨지지 않도록 동적 import + vite-ignore.
//   지정자를 string 타입 변수로 둬 번들 정적 분석을 피한다.

const STATUS_BAR_PKG: string = "@capacitor/status-bar";

export async function initNativeSafeArea(): Promise<void> {
  if (getPlatform() === "web") return;
  try {
    const mod = await import(/* @vite-ignore */ STATUS_BAR_PKG);
    const { StatusBar, Style } = mod;
    // 콘텐츠를 상태바 뒤까지 그려 edge-to-edge → env/네이티브 인셋이 실제 높이를 반영.
    // iOS 는 기본 edge-to-edge 라 사실상 no-op 이지만 명시적으로 맞춰 둔다.
    await StatusBar.setOverlaysWebView({ overlay: true });
    // 상태바 배경(프라이머리, 밝은 핑크)에 맞춰 아이콘은 어둡게.
    // @capacitor/status-bar 의 Style.Light = "밝은 배경용"(= 어두운 콘텐츠).
    await StatusBar.setStyle({ style: Style.Light });
  } catch (e) {
    console.warn("[safeArea] StatusBar 설정 실패(@capacitor/status-bar 미설치?)", e);
  }
}
