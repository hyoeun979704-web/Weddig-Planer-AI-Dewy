// 행동 신호 누적 + 잊혀짐 정책 — v2 §1 L1 (Behavioral) + §4.3 (Behavioral + Soft Confirm)
// + §5.4 (Forgettable) 패턴의 공통 인프라.
//
// 같은 신호를 여러 페이지/액션에서 증분(bump)할 수 있고, 임계값 도달 시
// shouldPromptConfirm() === true 가 됨. 사용자가 확인 카드에서 응답(받기/거절)하면
// markConfirmed() / markDismissed() 호출 → 30일 cooldown.
//
// 저장: localStorage 만 (v1 단순화). 향후 cross-device 동기화 필요 시 user_signal_log
// 테이블 마이그레이션 추가 가능.
//
// 민감 정보(임신/재혼/부모 부재)는 본 모듈로 추론한 후보를 절대 자동 영속화하지
// 말고, 반드시 사용자 확인 후에만 user_wedding_settings 본 컬럼으로 승격.

const STORAGE_PREFIX = "dewy:signal:";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;     // 30일

export interface BehavioralSignalState {
  /** 누적 증분 횟수. */
  count: number;
  /** 마지막 증분 시각(ms). */
  lastBumpAt: number;
  /** 사용자가 확인 카드에서 "받기" 누른 시각. 한 번 받기로 가면 이후 카드 안 띄움. */
  confirmedAt: number | null;
  /** 사용자가 "지금은 괜찮아요" 또는 X dismiss 한 시각. cooldown 동안 카드 안 띄움. */
  dismissedAt: number | null;
}

const DEFAULT_STATE: BehavioralSignalState = {
  count: 0,
  lastBumpAt: 0,
  confirmedAt: null,
  dismissedAt: null,
};

function load(key: string): BehavioralSignalState {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      count: typeof parsed?.count === "number" ? parsed.count : 0,
      lastBumpAt: typeof parsed?.lastBumpAt === "number" ? parsed.lastBumpAt : 0,
      confirmedAt: typeof parsed?.confirmedAt === "number" ? parsed.confirmedAt : null,
      dismissedAt: typeof parsed?.dismissedAt === "number" ? parsed.dismissedAt : null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function save(key: string, state: BehavioralSignalState): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
  } catch {
    /* best effort */
  }
}

/**
 * 행동 신호 1회 증분. 페이지 진입·카드 조회·검색 등에서 호출.
 * 같은 일자에 같은 신호가 여러 번 증분되면 중복 카운트 — 사용자가 한 페이지에서
 * 새로고침 N회 해도 누적이 같아지지 않게 caller 에서 1세션 1회 호출 가드 필요.
 */
export function bumpSignal(key: string): BehavioralSignalState {
  const cur = load(key);
  const next: BehavioralSignalState = {
    ...cur,
    count: cur.count + 1,
    lastBumpAt: Date.now(),
  };
  save(key, next);
  return next;
}

/** 현재 신호 상태 조회. 증분 없이 읽기만. */
export function readSignal(key: string): BehavioralSignalState {
  return load(key);
}

/**
 * 확인 카드를 노출해도 되는지 판단.
 * 조건:
 *   1) 누적 횟수 ≥ threshold
 *   2) 아직 confirmed 되지 않음 (확정 후엔 다시 안 띄움)
 *   3) dismissed 후 cooldown(30일) 지남
 *   4) 가입 후 minAccountAgeDays 지남 (민감 정보는 §5.6 — 가입 후 3일)
 */
export function shouldPromptConfirm(
  key: string,
  options: {
    threshold: number;
    accountCreatedAt?: number | null;
    minAccountAgeDays?: number;
  }
): boolean {
  const s = load(key);
  if (s.confirmedAt != null) return false;
  if (s.count < options.threshold) return false;
  if (s.dismissedAt != null && Date.now() - s.dismissedAt < COOLDOWN_MS) return false;
  // F#2 — minAccountAgeDays 가 설정됐는데 accountCreatedAt 을 못 알아내면(NaN/null)
  // 가드 우회 대신 거부. "정보 없음 → 안 보임" 이 v2 §5.6 보수 기본값.
  if (options.minAccountAgeDays) {
    if (options.accountCreatedAt == null) return false;
    const ageMs = Date.now() - options.accountCreatedAt;
    if (ageMs < options.minAccountAgeDays * 24 * 60 * 60 * 1000) return false;
  }
  return true;
}

/** 사용자가 "받기" 누름 — 더 이상 카드 안 띄움. 신호는 보존 (분석용). */
export function markConfirmed(key: string): void {
  const cur = load(key);
  save(key, { ...cur, confirmedAt: Date.now() });
}

/** 사용자가 "지금은 괜찮아요" 또는 X — 30일 cooldown 시작. */
export function markDismissed(key: string): void {
  const cur = load(key);
  save(key, { ...cur, dismissedAt: Date.now() });
}

/** 신호 자체 폐기 — 사용자가 마이페이지에서 명시 OFF 한 경우. */
export function resetSignal(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* best effort */
  }
}

/** Round 15 P1 fix — signOut 시 dewy:signal:* + dewy:signal-bumped:* 일괄 wipe.
 *  공유 device cross-account leak 방지 (이전 사용자의 sensitive 추론이 다음 사용자에게
 *  false positive 트리거되던 회귀). PregnancyConfirmFlow stage / due-date key 등 user.id
 *  로 namespace 된 키는 영향 없음 (그건 user 별로 격리됨). */
export function resetAllSignals(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(STORAGE_PREFIX) || k.startsWith("dewy:signal-bumped:"))) {
        keys.push(k);
      }
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* best effort */
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DEWY 특정 신호 키 — 한 곳에서 관리해 오타·중복 방지.
// ─────────────────────────────────────────────────────────────────────────

export const SIGNAL_KEYS = {
  /** 임신 관련 콘텐츠 조회 (임산부 드레스·임신 허니문 배너·trimester 미션 등). */
  pregnancyInterest: "pregnancy-interest",
  /** 재혼 관련 콘텐츠 조회 (재혼 커뮤니티·재혼 카테고리 검색 등). */
  remarriageInterest: "remarriage-interest",
  /** 양가 분담 카드 dismiss 같이 부모 부재 시그널. */
  singleHouseholdHint: "single-household-hint",
  /** 신랑 카테고리(예복·신랑 한복) 자주 조회. */
  groomRoleHint: "groom-role-hint",
} as const;

export type SignalKey = (typeof SIGNAL_KEYS)[keyof typeof SIGNAL_KEYS];
