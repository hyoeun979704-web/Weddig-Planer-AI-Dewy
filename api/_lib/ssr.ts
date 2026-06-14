// api/ssr.ts 와 api/guide.ts 가 공유하는 SSR 헬퍼.
// (이전엔 esc/inject/bareDoc/getTemplate/headTags 가 두 파일에 거의 동일하게 복붙)
// Vercel edge function 은 supabase/functions/_shared 를 import 할 수 없어 별도 위치.

export const SITE = "https://dewy-wedding.com";

// Supabase 공개 접속 상수(anon 키 = 설계상 공개값). api/ssr.ts·api/sitemap.ts 공용 단일 소스
// — 같은 값을 여러 edge 함수에 복붙하면 프로젝트 전환 시 드리프트가 생기므로 여기로 모은다.
export const SUPABASE_URL = "https://qabeywyzjsgyqpjqsvkd.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhYmV5d3l6anNneXFwanFzdmtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTg4MzUsImV4cCI6MjA5MTEzNDgzNX0.ae0GIokaeczwm0-FaVSoCnkNqBgagsdD1-1I_BP90Jo";

const DEFAULT_OG_IMAGE = `${SITE}/dewy-logo.png?v=3`;

export type Rendered = {
  title: string;
  description: string;
  canonical: string;
  head: string;
  body: string;
};

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function headTags(
  title: string,
  desc: string,
  canonical: string,
  jsonLd: Record<string, unknown>,
  image: string = DEFAULT_OG_IMAGE,
): string {
  return [
    `<meta name="description" content="${esc(desc)}" />`,
    // 검색·AI 엔진이 전체 길이 스니펫과 큰 이미지 프리뷰를 쓰도록 허용(AEO 노출 강화).
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    // `<` 를 유니코드로 이스케이프해 데이터에 든 `</script>` 가 스크립트 태그를
    // 탈출하는 것(XSS)을 막는다.
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}

export function inject(template: string, r: Rendered): string {
  // 치환 문자열을 함수로 넘겨, 본문 데이터에 든 `$&`/`$1`/`$$` 같은 시퀀스가
  // String.replace 의 특수 치환 패턴으로 해석돼 출력이 깨지는 것을 막는다.
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(r.title)}</title>`);
  html = html
    .replace(/<meta name="description"[^>]*>/, "")
    .replace(/<link rel="canonical"[^>]*>/, "");
  html = html.replace("</head>", () => `    ${r.head}\n  </head>`);
  html = html.replace('<div id="root">', () => `<div id="root">\n      ${r.body}`);
  return html;
}

// 템플릿 확보 실패 시 사용할, 리다이렉트 없는 최소 문서.
export function bareDoc(r: Rendered): string {
  return `<!doctype html><html lang="ko"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${esc(r.title)}</title>\n    ${r.head}\n  </head><body><div id="root">${r.body}</div></body></html>`;
}

export async function getTemplate(origin: string): Promise<string | null> {
  try {
    const t = await fetch(`${origin}/index.html`);
    if (!t.ok) return null;
    return await t.text();
  } catch {
    return null;
  }
}
