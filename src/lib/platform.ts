import { Capacitor } from '@capacitor/core';

// 웹/네이티브 분기를 위한 단일 출처. 페이지·컴포넌트는 이 모듈만 import 한다.
// 직접 `Capacitor.*` 를 쓰면 SSR/테스트 환경에서 가드를 빼먹기 쉽다.

export type Platform = 'web' | 'ios' | 'android';

const hasWindow = typeof window !== 'undefined';

/** 'ios' | 'android' | 'web' — Capacitor 네이티브가 아니면 항상 'web'. */
export function getPlatform(): Platform {
  if (!hasWindow) return 'web';
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : 'web';
}

/** Capacitor 네이티브 컨테이너 내부인지 여부. PWA/모바일 브라우저는 false. */
export function isNativeApp(): boolean {
  if (!hasWindow) return false;
  return Capacitor.isNativePlatform();
}
