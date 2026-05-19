import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { isNativeApp } from '@/lib/platform';

// 앱이 OAuth 콜백을 받는 단일 스킴. Supabase / Google Cloud / Kakao 개발자 콘솔
// "허용 redirect URL" 목록에 동일하게 등록되어야 한다.
//   - Supabase: Authentication → URL Configuration → Additional Redirect URLs
//   - Google : OAuth 동의 화면 / 클라이언트 ID redirect URIs
//   - Kakao  : 내 애플리케이션 → 카카오 로그인 → Redirect URI
export const APP_CALLBACK_URL = 'app.dewy://auth/callback';

let registered = false;

/**
 * 앱 부팅 시 한 번 호출. 외부 브라우저(Custom Tabs / SFSafariViewController)에서
 * OAuth 를 마치고 돌아온 콜백 URL 을 잡아 Supabase 세션으로 교환한다.
 *
 * 콜드스타트(앱 미실행 상태에서 링크로 부팅) 케이스도 같은 리스너가 deferred 로 받으므로
 * registerDeepLinks 는 React 트리 mount 보다 먼저 실행되어야 한다.
 */
export function registerDeepLinks(): void {
  if (!isNativeApp() || registered) return;
  registered = true;

  void App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    const url = event.url;
    if (!url || !url.startsWith('app.dewy://')) return;

    try {
      // PKCE 플로우: URL 의 ?code= 를 세션으로 교환.
      // exchangeCodeForSession 은 전체 URL 또는 code 문자열 모두 받는다.
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) console.error('[deepLink] exchangeCodeForSession error:', error);
    } catch (e) {
      console.error('[deepLink] exchange failed:', e);
    } finally {
      // 외부 브라우저 탭(있다면) 정리.
      try {
        await Browser.close();
      } catch {
        // 이미 닫혔거나 미지원 — 무시.
      }
    }
  });
}
