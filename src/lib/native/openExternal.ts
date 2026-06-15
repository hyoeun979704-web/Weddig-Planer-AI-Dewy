import { Browser } from '@capacitor/browser';
import { isNativeApp } from '@/lib/platform';

// 외부 URL(지도, 카카오, 토스 결제 위젯 redirect 등) 열기를 한 곳에서 처리한다.
// 이 어댑터를 쓰는 이유:
//  - WebView 안에서 결제·OAuth·앱 스킴(tel:, intent: 등)을 띄우면 정책 위반·실패가 잦다.
//  - 네이티브에선 Custom Tabs / SFSafariViewController 로 띄워 시스템 브라우저 세션을 공유.
//  - 웹에선 새 탭(또는 동일 탭) 으로 폴백.
//
// tel:/mailto:/intent: 같은 비-http(s) 스킴은 OS 가 직접 처리해야 하므로 Browser 대신
// location.href 로 보내고, 호스트 브라우저가 알아서 외부 앱으로 넘긴다.

export async function openExternal(
  url: string,
  opts: { target?: '_blank' | '_self' } = {},
): Promise<void> {
  if (!url) return;

  const isHttp = /^https?:\/\//i.test(url);

  if (isNativeApp() && isHttp) {
    await Browser.open({ url, presentationStyle: 'popover' });
    return;
  }

  if (typeof window === 'undefined') return;
  if (!isHttp) {
    // tel:, mailto:, intent:, market:, app://... — OS 가 라우팅.
    // 단, javascript:/data:/vbscript:/file: 같은 위험 스킴은 차단(XSS·유출 방지).
    // DB write 경로는 이미 http(s) 만 허용하지만, location.href 진입점을 한 번 더 가드한다.
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
    if (!scheme || ['javascript', 'data', 'vbscript', 'file'].includes(scheme)) {
      console.warn('openExternal: blocked unsafe/unknown scheme', scheme);
      return;
    }
    window.location.href = url;
    return;
  }
  window.open(url, opts.target ?? '_blank', 'noopener,noreferrer');
}
