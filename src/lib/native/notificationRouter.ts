// 알림/위젯 탭 → 앱 내 라우팅 브리지.
//
// Capacitor 리스너는 React 트리 밖(모듈 스코프)에서 발화하므로, Router 안의
// 컴포넌트(NativeSync)가 navigate 함수를 등록해 두고 그걸 통해 이동한다.
// 콜드스타트(앱이 꺼진 상태에서 알림 탭으로 부팅)면 navigator 가 아직 없을 수 있어
// pending 으로 버퍼링했다가 등록 시점에 흘려보낸다.

let navigateFn: ((route: string) => void) | null = null;
let pendingRoute: string | null = null;

/** Router 내부 컴포넌트가 마운트 시 navigate 함수를 등록. */
export function setNotificationNavigator(fn: (route: string) => void): void {
  navigateFn = fn;
  if (pendingRoute) {
    const route = pendingRoute;
    pendingRoute = null;
    fn(route);
  }
}

export function clearNotificationNavigator(fn: (route: string) => void): void {
  if (navigateFn === fn) navigateFn = null;
}

/** 알림 탭 시 호출 — 즉시 이동하거나, navigator 미등록이면 버퍼링. */
export function routeFromNotification(route: string | null | undefined): void {
  if (!route || typeof route !== "string" || !route.startsWith("/")) return;
  if (navigateFn) navigateFn(route);
  else pendingRoute = route;
}
