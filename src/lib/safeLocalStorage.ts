import { createSafeStorage, type SimpleStorage } from "@/integrations/supabase/safeLocalStorage";

/**
 * 예외를 던지지 않는 localStorage 어댑터(앱 전역 공용 싱글톤).
 *
 * 배경: iOS Safari 는 프라이빗 브라우징·"크로스사이트 추적 방지"·저장공간 부족 시
 * `localStorage` 접근에서 **예외를 던진다**. raw `localStorage.getItem/setItem` 을 **렌더 경로**
 * (hook 본문·`useState` 초기화)에서 쓰면 그 예외가 렌더 중 전파돼 **화이트스크린**으로 죽는다
 * (다른 브라우저는 멀쩡, iOS 만 터지는 전형적 패턴 — `safeLocalStorage`/`safeSessionStorage` 와
 * 동일한 회귀 클래스. 가입 실패 회귀의 그 클래스다).
 * → `createSafeStorage` 로 감싸 어떤 호출도 throw 하지 않게 하고, 불가 시 인메모리로 폴백한다.
 * 정상 환경에서는 raw localStorage 와 동일하게 동작한다.
 */
export const safeLocalStorage: SimpleStorage = createSafeStorage(
  typeof window !== "undefined" ? window.localStorage : null,
);
