// 예외를 던지지 않는 저장소 어댑터 — Supabase auth storage 용.
//
// 배경(iOS 회원가입 장애): iOS Safari 는 프라이빗 브라우징·"크로스사이트 추적 방지"·
// 저장공간 부족 시 localStorage.getItem/setItem 이 **예외를 던진다**. Supabase 클라이언트가
// raw localStorage 를 쓰면 세션 저장 중 예외가 그대로 전파돼 signUp/signIn 이 실패한다
// (다른 브라우저는 멀쩡, iOS Safari 만 터지는 전형적 패턴).
// → 모든 접근을 try/catch 로 감싸고, 사용 불가하면 인메모리로 폴백해 **인증이 절대 깨지지 않게** 한다.
// (폴백 시 새로고침 간 세션 유지는 안 되지만, 가입/로그인 동작 자체는 성공한다 — 올바른 트레이드오프.)

export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * backing(보통 window.localStorage)을 감싼 안전 저장소. backing 이 없거나 접근이 throw 하면
 * 인메모리 Map 으로 폴백한다. 어떤 호출도 예외를 던지지 않는다.
 */
export function createSafeStorage(backing?: SimpleStorage | null): SimpleStorage {
  const mem = new Map<string, string>();

  // 쓰기 가능 여부 1회 프로브(프라이빗 모드 등 즉시 throw 감지).
  let usable = false;
  if (backing) {
    try {
      const probe = "__dewy_ls_probe__";
      backing.setItem(probe, "1");
      backing.removeItem(probe);
      usable = true;
    } catch {
      usable = false;
    }
  }

  return {
    getItem(key) {
      if (usable && backing) {
        try {
          return backing.getItem(key);
        } catch {
          usable = false;
        }
      }
      return mem.has(key) ? mem.get(key)! : null;
    },
    setItem(key, value) {
      mem.set(key, value); // 항상 메모리에도 보관 → backing 이 나중에 실패해도 읽힘
      if (usable && backing) {
        try {
          backing.setItem(key, value);
        } catch {
          usable = false; // 용량초과 등 — 이후는 메모리만
        }
      }
    },
    removeItem(key) {
      mem.delete(key);
      if (usable && backing) {
        try {
          backing.removeItem(key);
        } catch {
          usable = false;
        }
      }
    },
  };
}
