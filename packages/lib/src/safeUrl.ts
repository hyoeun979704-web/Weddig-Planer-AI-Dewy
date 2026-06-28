// 외부 URL 안전 가드.
//
// DB·스크랩 파이프라인에서 들어온 URL 필드(product.source_url, place.website_url 등)를
// <a href> 나 window.open 에 그대로 쓰면, 오염된 `javascript:`·`data:`·`vbscript:` 스킴이
// 클릭 시 실행되는 스토어드 XSS 가 된다. 외부 링크에 허용할 스킴은 http(s) 뿐이므로
// 절대 http(s) URL 만 통과시키고 나머지는 null 을 반환한다(호출부는 null 이면 링크 비활성).
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // 절대 http(s) 만 허용 — 상대경로/기타 스킴은 외부 링크로 부적절하거나 위험.
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    return null;
  }
}
