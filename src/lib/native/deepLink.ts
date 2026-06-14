import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { isNativeApp } from '@/lib/platform';
import { toast } from 'sonner';

// 앱이 OAuth 콜백을 받는 단일 스킴.
//
// 등록 위치는 **Supabase 한 곳**(Authentication → URL Configuration → Additional Redirect URLs)
// 만으로 충분하다. provider(Google/Kakao) 콘솔은 손대지 않는다 — 해당 콘솔의
// redirect URI 필드는 http(s) 만 허용해 커스텀 스킴 등록이 거부된다.
//
// 실제 흐름:
//   provider → https://<project>.supabase.co/auth/v1/callback (이미 등록된 웹 콜백)
//            → Supabase 가 signInWithOAuth({ redirectTo }) 값을 보고 app.dewy:// 로 302
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
    // 콜백 URL·인증 code 는 민감정보라 로깅하지 않는다(프로덕션 콘솔/크래시리포터 캡처 방지).
    if (!url || !url.startsWith('app.dewy://')) return;

    try {
      // PKCE 플로우: URL 의 ?code= 를 세션으로 교환.
      // exchangeCodeForSession 은 전체 URL 또는 code 문자열 모두 받는다.
      const parsed = new URL(url);
      const code = parsed.searchParams.get('code');
      const { error } = await supabase.auth.exchangeCodeForSession(code ?? url);
      if (error) {
        console.error('[deepLink] exchangeCodeForSession error:', error);
        toast.error('로그인 처리에 실패했어요. 다시 시도해주세요');
      }
    } catch (e) {
      console.error('[deepLink] exchange failed:', e);
      toast.error('로그인 처리에 실패했어요. 다시 시도해주세요');
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
