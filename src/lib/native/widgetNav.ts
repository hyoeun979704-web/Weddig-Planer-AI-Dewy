// 위젯 탭/바로추가 딥링크(app.dewy://...) → 앱 라우터 경로 매핑 + 네비 펍/섭.
// deepLink.ts(앱 부팅, 라우터 밖)에서 URL 을 받아 경로로 변환·emit 하고, 라우터 안의
// WidgetBridgeHost 가 구독해 navigate 한다. 설계: docs/widget-system.md §4.

// app.dewy://<host>[/<sub>] → 앱 경로. 바로추가는 ?add=1 로 대상 페이지가 추가 시트를 연다.
const ROUTES: Record<string, string> = {
  "schedule": "/schedule",
  "schedule/new": "/schedule?add=1",
  "vendor-board": "/vendor-board",
  "budget": "/budget",
  "budget/new": "/budget?add=1",
};

/** app.dewy:// 위젯 URL 이면 앱 경로 반환, 아니면(auth 콜백 등) null. */
export function widgetUrlToPath(url: string): string | null {
  if (!url.startsWith("app.dewy://")) return null;
  // app.dewy://schedule/new → "schedule/new"
  const rest = url.slice("app.dewy://".length).replace(/[?#].*$/, "").replace(/\/+$/, "");
  if (rest === "auth/callback") return null; // OAuth 는 deepLink.ts 가 처리.
  return ROUTES[rest] ?? null;
}

type Listener = (path: string) => void;
const listeners = new Set<Listener>();
let pendingPath: string | null = null; // 라우터 mount 전에 들어온 콜드스타트 딥링크 보관.

/** 위젯 딥링크 경로 emit. 구독자가 없으면(앱 부팅 중) 보관 후 첫 구독자에게 전달. */
export function emitWidgetNav(path: string): void {
  if (listeners.size === 0) {
    pendingPath = path;
    return;
  }
  listeners.forEach((l) => l(path));
}

/** WidgetBridgeHost 가 구독. 등록 시 보관된 콜드스타트 경로가 있으면 즉시 전달. */
export function onWidgetNav(listener: Listener): () => void {
  listeners.add(listener);
  if (pendingPath) {
    const p = pendingPath;
    pendingPath = null;
    listener(p);
  }
  return () => listeners.delete(listener);
}
