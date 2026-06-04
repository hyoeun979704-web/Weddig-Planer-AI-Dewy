// 알림 설정 — 기기 단위 토글의 단일 출처.
//
// 설정 화면(src/pages/Notifications.tsx)과 로컬 알림 스케줄러(localNotifications.ts)가
// 같은 상수를 공유하도록 분리했다. 토글은 localStorage 에 기기 단위로 저장하고,
// 로그인 사용자에 한해 마케팅 동의는 user_consents, 서버 푸시용 카테고리는
// user_notification_prefs 테이블에 별도 동기화한다(설정 화면 참고).

export const NOTIFICATION_PREFS_STORAGE_KEY = "dewy.notification.prefs";

/** 설정 화면 토글 id. */
export type NotificationToggleId =
  | "push"
  | "marketing"
  | "chat"
  | "schedule"
  | "favorite";

export const NOTIFICATION_PREF_DEFAULTS: Record<NotificationToggleId, boolean> = {
  push: true,
  marketing: false,
  chat: true,
  schedule: true,
  favorite: true,
};

/** localStorage 에서 기기 알림 토글을 읽는다. 파싱 실패 시 기본값. */
export function readDevicePrefs(): Record<NotificationToggleId, boolean> {
  if (typeof window === "undefined") return { ...NOTIFICATION_PREF_DEFAULTS };
  try {
    const saved = window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    return saved
      ? { ...NOTIFICATION_PREF_DEFAULTS, ...JSON.parse(saved) }
      : { ...NOTIFICATION_PREF_DEFAULTS };
  } catch {
    return { ...NOTIFICATION_PREF_DEFAULTS };
  }
}

export function persistDevicePrefs(next: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFS_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    // 저장 실패는 무시 — 다음 토글에서 재시도된다.
  }
}

/**
 * 로컬 알림 카테고리가 현재 토글상 허용되는지.
 * - 마스터 `push` 가 꺼져 있으면 모든 로컬 알림 OFF.
 * - D-day/일정/예산은 "일정 알림(schedule)" 토글에 묶는다(서비스성 리마인더).
 */
export function isLocalCategoryEnabled(
  category: "dday" | "schedule" | "budget",
  prefs: Record<NotificationToggleId, boolean> = readDevicePrefs(),
): boolean {
  if (!prefs.push) return false;
  // 세 카테고리 모두 일정 리마인더 성격 → schedule 토글로 통합 게이팅.
  void category;
  return prefs.schedule;
}
