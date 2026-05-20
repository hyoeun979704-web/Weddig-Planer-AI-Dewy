// Capacitor 빌드(`vite build --mode capacitor`)에서는 vite-plugin-pwa 가 꺼져 있어
// `virtual:pwa-register/react` 모듈이 존재하지 않는다.
// vite.config.ts 에서 capacitor 모드일 때만 이 파일을 해당 가상 모듈로 alias 해,
// 컴포넌트 코드 변경 없이 안전한 no-op을 제공한다.
export function useRegisterSW(_opts?: {
  onRegistered?: () => void;
  onRegisterError?: (err: unknown) => void;
}) {
  return {
    needRefresh: [false, (_v: boolean) => {}] as const,
    offlineReady: [false, (_v: boolean) => {}] as const,
    updateServiceWorker: async (_reload?: boolean) => {},
  };
}
