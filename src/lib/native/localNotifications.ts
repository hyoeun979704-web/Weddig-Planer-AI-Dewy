// 로컬 알림 (Firebase 불필요) — D-day / 일정 / 예산 리마인더.
//
// @capacitor/local-notifications 는 네이티브에서만 동적 import 한다(웹 번들 제외).
// 순수 계획 생성은 src/lib/notifications/schedulePlan.ts, 토글 게이팅은
// src/lib/notifications/prefs.ts 가 담당하고, 이 모듈은 기기 예약/취소/탭처리만 한다.

import { isNativeApp } from "@/lib/platform";
import {
  ID_RANGES,
  type NotificationCategory,
  type PlannedNotification,
} from "@/lib/notifications/schedulePlan";
import { isLocalCategoryEnabled, readDevicePrefs } from "@/lib/notifications/prefs";
import { routeFromNotification } from "./notificationRouter";

type LocalNotificationsModule =
  typeof import("@capacitor/local-notifications")["LocalNotifications"];

let modPromise: Promise<LocalNotificationsModule> | null = null;
async function getMod(): Promise<LocalNotificationsModule> {
  if (!modPromise) {
    modPromise = import("@capacitor/local-notifications").then(
      (m) => m.LocalNotifications,
    );
  }
  return modPromise;
}

let tapHandlerRegistered = false;

/** 권한 확인 후 미허용 시 1회 요청. 허용 여부 반환. */
export async function ensureLocalPermission(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const LN = await getMod();
  const cur = await LN.checkPermissions();
  if (cur.display === "granted") return true;
  if (cur.display === "denied") return false;
  const req = await LN.requestPermissions();
  return req.display === "granted";
}

/** 알림 탭 → 앱 내 라우팅. 앱 부팅 시 1회 등록. */
export async function registerLocalTapHandler(): Promise<void> {
  if (!isNativeApp() || tapHandlerRegistered) return;
  tapHandlerRegistered = true;
  const LN = await getMod();
  await LN.addListener("localNotificationActionPerformed", (action) => {
    const route = (action.notification.extra as { route?: string } | undefined)?.route;
    routeFromNotification(route);
  });
}

const ALL_CATEGORIES: NotificationCategory[] = ["dday", "schedule", "budget"];

/** 카테고리 ID 레인지의 예약된 알림을 취소. */
async function cancelCategories(
  LN: LocalNotificationsModule,
  categories: NotificationCategory[],
): Promise<void> {
  const pending = await LN.getPending();
  const ids = pending.notifications
    .map((n) => (typeof n.id === "number" ? n.id : Number(n.id)))
    .filter((id) =>
      categories.some((c) => {
        const { base, size } = ID_RANGES[c];
        return id >= base && id < base + size;
      }),
    );
  if (ids.length) {
    await LN.cancel({ notifications: ids.map((id) => ({ id })) });
  }
}

/**
 * 계획된 로컬 알림을 기기에 재예약. 기존 동일 카테고리 알림은 먼저 취소(중복 방지).
 * - 마스터 push 토글 OFF → 전체 취소만.
 * - 카테고리별 토글 OFF → 해당 카테고리 제외.
 */
export async function rescheduleLocalNotifications(
  plans: PlannedNotification[],
): Promise<void> {
  if (!isNativeApp()) return;
  const granted = await ensureLocalPermission();
  const LN = await getMod();

  const prefs = readDevicePrefs();

  // 토글 OFF 거나 권한 미허용이면 전부 취소.
  if (!granted || !prefs.push) {
    await cancelCategories(LN, ALL_CATEGORIES);
    return;
  }

  const enabled = ALL_CATEGORIES.filter((c) => isLocalCategoryEnabled(c, prefs));
  const disabled = ALL_CATEGORIES.filter((c) => !enabled.includes(c));

  // 비활성 카테고리는 취소.
  if (disabled.length) await cancelCategories(LN, disabled);
  // 활성 카테고리는 일단 취소 후 재예약(항목 변경 반영).
  await cancelCategories(LN, enabled);

  const toSchedule = plans.filter((p) => enabled.includes(p.category));
  if (!toSchedule.length) return;

  await LN.schedule({
    notifications: toSchedule.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      schedule: {
        at: p.at,
        ...(p.repeatEvery ? { every: p.repeatEvery, allowWhileIdle: true } : {}),
      },
      extra: { route: p.route },
    })),
  });
}
