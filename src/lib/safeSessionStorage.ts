import { createSafeStorage, type SimpleStorage } from "@/integrations/supabase/safeLocalStorage";

/**
 * 예외를 던지지 않는 sessionStorage 어댑터.
 *
 * 배경: iOS Safari 는 프라이빗 브라우징·추적방지·용량초과 시 `sessionStorage` 접근에서
 * **예외를 던진다**. 결제 플로우는 리다이렉트 전에 TID 등 승인 정보를 sessionStorage 에
 * 저장하는데, raw 접근이 throw 하면 핸들러가 깨져 **결제 준비/승인이 실패**한다(다른 브라우저는
 * 멀쩡, iOS 만 터지는 전형적 패턴 — `safeLocalStorage` 와 동일한 회귀 클래스).
 * → `createSafeStorage` 로 감싸 어떤 호출도 throw 하지 않게 하고, 불가 시 인메모리로 폴백한다.
 */
export const safeSessionStorage: SimpleStorage = createSafeStorage(
  typeof window !== "undefined" ? window.sessionStorage : null,
);
