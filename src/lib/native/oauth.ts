import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';
import { APP_CALLBACK_URL } from './deepLink';

type Provider = 'google' | 'kakao' | 'apple';

/**
 * 네이티브 앱에서의 소셜 로그인 흐름.
 *
 *   1) signInWithOAuth({ skipBrowserRedirect: true }) 로 provider authorize URL 만 받는다.
 *      - WebView 자체를 OAuth 페이지로 이동시키면 in-app browser 정책 위반과
 *        세션 분리 이슈가 생기므로 절대 navigation 으로 처리하지 않는다.
 *   2) Browser.open 으로 시스템 Custom Tabs / SFSafariViewController 에 띄운다.
 *   3) provider 가 APP_CALLBACK_URL 로 돌아오면 deepLink.ts 의 appUrlOpen 리스너가
 *      ?code= 를 잡아 exchangeCodeForSession 을 호출한다.
 */
export async function signInWithOAuthNative(
  provider: Provider,
): Promise<{ error: Error | null }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: APP_CALLBACK_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    return { error: (error as Error | null) ?? new Error('OAuth URL missing') };
  }

  await Browser.open({ url: data.url, presentationStyle: 'popover' });
  return { error: null };
}
