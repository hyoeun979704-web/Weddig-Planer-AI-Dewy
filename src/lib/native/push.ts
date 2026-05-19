import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { getPlatform, isNativeApp } from '@/lib/platform';

let registered = false;

/**
 * 네이티브 앱에서 푸시 권한 → 토큰 등록 → Supabase upsert 까지 일괄 처리.
 *
 * 호출 시점: 사용자 로그인 직후. 비로그인 상태에서 호출해도 안전(권한만 요청).
 * 토큰 발급은 OS 가 비동기로 응답하므로 listener 기반 — Promise 반환은 권한 단계까지만.
 */
export async function registerPushNotifications(userId: string | null): Promise<void> {
  if (!isNativeApp()) return;

  if (!registered) {
    // 리스너는 앱 라이프사이클 동안 1회만 등록.
    void PushNotifications.addListener('registration', async (token) => {
      // 로그인 전이면 user_id 없이 토큰만 보존했다가 로그인 시 채워질 수도 있다.
      const platform = getPlatform();
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? userId;
      if (!uid) return;

      await supabase.from('device_tokens').upsert(
        {
          token: token.value,
          user_id: uid,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      );
    });

    void PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration error:', err);
    });

    // Foreground 수신 — 기본 OS 트레이가 안 뜨므로 토스트/뱃지로 직접 표시 필요.
    // 일단 console 만 기록하고, UX 정책 정해지면 알림 컴포넌트와 연결.
    void PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.info('[push] received:', notification);
    });

    void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.info('[push] action:', action);
      // 추후: action.notification.data 의 deeplink 로 라우팅.
    });

    registered = true;
  }

  const perm = await PushNotifications.checkPermissions();
  let status = perm.receive;
  if (status === 'prompt' || status === 'prompt-with-rationale') {
    status = (await PushNotifications.requestPermissions()).receive;
  }
  if (status !== 'granted') return;

  await PushNotifications.register();
}

/** 로그아웃 시 호출. 현재 디바이스 토큰을 서버에서 제거한다. */
export async function unregisterPushNotifications(token?: string): Promise<void> {
  if (!isNativeApp()) return;
  // 토큰을 직접 모르는 경우, user_id 기준으로 전체 삭제하는 건
  // 다중 기기 사용자에서 부작용이 있으므로 호출자가 token 을 넘기는 게 안전.
  if (!token) return;
  await supabase.from('device_tokens').delete().eq('token', token);
}
