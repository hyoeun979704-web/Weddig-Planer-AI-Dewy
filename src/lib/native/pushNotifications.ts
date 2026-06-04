// 푸시 알림 (FCM/APNs) — 토큰 등록 + 수신/탭 처리.
//
// 실제 발송은 Firebase 프로젝트 + Supabase 시크릿(FCM_*) 연결 후 동작한다
// (docs/push-notification-setup.md). 자격증명 연결 전에도 이 코드는 안전하게
// no-op 에 가깝게 동작한다(권한 요청·토큰 수신이 실패하면 조용히 무시).

import { isNativeApp, getPlatform } from "@/lib/platform";
import { readDevicePrefs } from "@/lib/notifications/prefs";
import { routeFromNotification } from "./notificationRouter";

type PushModule = typeof import("@capacitor/push-notifications")["PushNotifications"];

let modPromise: Promise<PushModule> | null = null;
async function getMod(): Promise<PushModule> {
  if (!modPromise) {
    modPromise = import("@capacitor/push-notifications").then(
      (m) => m.PushNotifications,
    );
  }
  return modPromise;
}

let initialized = false;

/** 수신한 FCM/APNs 토큰을 device_tokens 에 upsert. 로그인 여부와 무관하게 저장 가능. */
async function upsertToken(token: string): Promise<void> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const platform = getPlatform(); // 'ios' | 'android'
    await (supabase as any)
      .from("device_tokens")
      .upsert(
        {
          token,
          user_id: user?.id ?? null,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" },
      );
  } catch (e) {
    // 테이블 미배포/네트워크 등 — 푸시 미활성 단계에서는 조용히 무시.
    console.warn("[push] token upsert skipped:", (e as Error)?.message);
  }
}

/**
 * 푸시 초기화 — 권한 요청 → register() → 토큰/수신/탭 리스너 등록.
 * 앱 부팅 시(네이티브) 1회 호출. 마스터 push 토글 OFF 면 등록 생략.
 */
export async function initPushNotifications(): Promise<void> {
  if (!isNativeApp() || initialized) return;
  if (!readDevicePrefs().push) return;
  initialized = true;

  try {
    const PN = await getMod();

    const perm = await PN.checkPermissions();
    let status = perm.receive;
    if (status === "prompt" || status === "prompt-with-rationale") {
      status = (await PN.requestPermissions()).receive;
    }
    if (status !== "granted") {
      initialized = false; // 다음 기회에 다시 시도 가능
      return;
    }

    await PN.addListener("registration", (t) => {
      void upsertToken(t.value);
    });
    await PN.addListener("registrationError", (err) => {
      console.warn("[push] registration error:", err?.error);
    });
    // 포그라운드 수신 — 시스템 트레이에 안 뜨므로 토스트로 노출.
    await PN.addListener("pushNotificationReceived", async (notif) => {
      const { toast } = await import("sonner");
      if (notif.title || notif.body) {
        toast(notif.title ?? "새 알림", { description: notif.body ?? undefined });
      }
    });
    // 탭 → 딥링크 라우팅.
    await PN.addListener("pushNotificationActionPerformed", (action) => {
      const route = (action.notification.data as { route?: string; deeplink?: string } | undefined);
      routeFromNotification(route?.route ?? route?.deeplink);
    });

    await PN.register();
  } catch (e) {
    initialized = false;
    console.warn("[push] init skipped:", (e as Error)?.message);
  }
}

/** 로그인 직후 등 — 현재 토큰을 사용자에 재바인딩하기 위해 재등록 트리거. */
export async function refreshPushRegistration(): Promise<void> {
  if (!isNativeApp() || !initialized) return;
  try {
    const PN = await getMod();
    await PN.register();
  } catch {
    // 무시.
  }
}
