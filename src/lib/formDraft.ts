// 폼 입력 자동 임시저장(draft) — 페이지 이탈/iOS Safari 탭 폐기 후 복귀 시 미저장 입력 복원.
//
// 배경(버그): 사업자 업체정보 폼이 입력을 React state 에만 들고 있어, iOS 웹에서 앱 전환·
// 탭 폐기로 SPA 가 재로드되면 미저장 입력이 전부 사라졌다("나갔다 들어오면 내역이 사라져요").
// 서버에는 '저장' 눌러야만 남으므로 복원도 안 됨. → 변경 때마다 localStorage 에 draft 를
// 자동 저장하고 복귀 시 복원, 저장 성공하면 draft 제거.
//
// 저장은 best-effort: iOS 프라이빗 모드/용량 초과 시 setItem 이 throw 하므로 전부 try/catch.

const PREFIX = "dewy:draft:";

/** scope(폼 식별자) + userId 로 네임스페이스한 draft 키. 공유기기 cross-account 격리. */
export function draftKey(scope: string, userId: string | null | undefined): string {
  return `${PREFIX}${scope}:${userId ?? "anon"}`;
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — best effort */
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* best effort */
  }
}

/** 평면 폼 객체 동등 비교 — draft 가 서버 스냅샷과 같으면(미편집) 저장 안 하기 위함. */
export function shallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a[k] === b[k]);
}

/** 중첩(배열 포함) 폼 값 비교용 — 직렬화 동등. 비교 실패 시 false(보수적: draft 보존). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
