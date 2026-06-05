// AEO 정보 페이지(결혼어플추천 등) 전용 서버 사이드 렌더링.
// CSR SPA라 크롤러/AI가 빈 #root만 받던 문제를, 검색·AI 인용에 중요한 가이드
// 페이지에 한해 요청 시점에 실제 본문 + 구조화 데이터(FAQPage·BreadcrumbList·
// MobileApplication)를 HTML에 주입해 해결한다. 사용자에게는 기존 SPA가 부팅돼
// #root 를 대체한다. vercel.json 의 rewrite 가 한글 슬러그 경로를 이 함수로 보낸다.
//
// 콘텐츠는 src/data/aeoGuides.ts 단일 소스를 React 페이지와 공유한다.

import { aeoGuides, getGuide, BRAND_DEFINITION, type AeoGuide } from "../src/data/aeoGuides";

export const config = { runtime: "edge" };

const SITE = "https://dewy-wedding.com";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Rendered = { title: string; description: string; canonical: string; head: string; body: string };

function jsonLdGraph(g: AeoGuide, canonical: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "홈", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: g.breadcrumbName, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: g.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "MobileApplication",
        name: "Dewy",
        alternateName: ["듀이 웨딩", "Dewy Wedding", "AI 웨딩플래너 Dewy"],
        applicationCategory: "LifestyleApplication",
        operatingSystem: "ANDROID, iOS, Web",
        description: BRAND_DEFINITION,
        url: `${SITE}/`,
        inLanguage: "ko-KR",
        offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
        publisher: { "@type": "Organization", name: "Dewy" },
      },
    ],
  };
}

function headTags(title: string, desc: string, canonical: string, jsonLd: Record<string, unknown>): string {
  const image = `${SITE}/dewy-logo.png?v=3`;
  return [
    `<meta name="description" content="${esc(desc)}" />`,
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

function renderGuide(g: AeoGuide): Rendered {
  // canonical/sitemap/React Seo 모두 raw 한글 슬러그로 통일(크롤러가 동일 URL 로 정규화).
  const canonical = `${SITE}/${g.slug}`;
  const metaDesc = g.metaDescription.slice(0, 160);

  const sectionsHtml = g.sections
    .map((s) => {
      const body = s.body ? `<p>${esc(s.body)}</p>` : "";
      const list = s.list?.length ? `<ul>${s.list.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "";
      return `<h2>${esc(s.h2)}</h2>${body}${list}`;
    })
    .join("");

  const tableHtml = g.table
    ? `<table><thead><tr>${g.table.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` +
      `<tbody>${g.table.rows
        .map((r) => `<tr><td>${esc(r.criterion)}</td><td>${esc(r.why)}</td><td>${esc(r.dewy)}</td></tr>`)
        .join("")}</tbody></table>`
    : "";

  const faqHtml = g.faqs.length
    ? `<h2>자주 묻는 질문</h2><dl>${g.faqs
        .map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`)
        .join("")}</dl>`
    : "";

  const relatedHtml = g.related.length
    ? `<h2>Dewy에서 바로 해보기</h2><nav aria-label="관련 기능"><ul>${g.related
        .map((r) => `<li><a href="${esc(r.path)}">${esc(r.label)}</a></li>`)
        .join("")}</ul></nav>`
    : "";

  const relatedGuidesHtml = g.relatedGuides.length
    ? `<h2>관련 가이드</h2><nav aria-label="관련 가이드"><ul>${g.relatedGuides
        .map((r) => `<li><a href="${esc(r.path)}">${esc(r.label)}</a></li>`)
        .join("")}</ul></nav>`
    : "";

  const head = headTags(g.title, metaDesc, canonical, jsonLdGraph(g, canonical));
  // 크롤러·비-JS 사용자에게 그대로 "보이는" 본문(숨김 텍스트 아님). 앱 부팅 시
  // React 가 #root 를 동일 내용의 화면으로 교체한다 → 사용자/크롤러에 동일 콘텐츠
  // 제공(클로킹·hidden text 시그널 회피). 구조화 데이터도 이 보이는 본문과 일치한다.
  const body = `
    <main style="max-width:480px;margin:0 auto;padding:20px;font-family:'Noto Sans KR',sans-serif;color:#3b3b3b;line-height:1.7;">
      <nav aria-label="breadcrumb" style="font-size:13px;color:#888;"><a href="${SITE}/" style="color:#888;">홈</a> &gt; ${esc(g.breadcrumbName)}</nav>
      <h1>${esc(g.h1)}</h1>
      <p>${esc(g.answer)}</p>
      ${sectionsHtml}
      ${tableHtml}
      ${faqHtml}
      ${relatedHtml}
      ${relatedGuidesHtml}
      <p>최종 업데이트: ${esc(g.updated)}</p>
    </main>`;

  return { title: g.title, description: metaDesc, canonical, head, body };
}

function inject(template: string, r: Rendered): string {
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
function bareDoc(r: Rendered): string {
  return `<!doctype html><html lang="ko"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${esc(r.title)}</title>\n    ${r.head}\n  </head><body><div id="root">${r.body}</div></body></html>`;
}

async function getTemplate(origin: string): Promise<string | null> {
  try {
    const t = await fetch(`${origin}/index.html`);
    if (!t.ok) return null;
    return await t.text();
  } catch {
    return null;
  }
}

// slug 는 query(rewrite) 또는 pathname(직접 접근) 양쪽에서 받는다.
function resolveSlug(url: URL): string | null {
  const q = url.searchParams.get("slug");
  if (q) return q;
  const path = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "");
  return path || null;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = resolveSlug(url);
  const origin = url.origin;
  const htmlHeaders = { "content-type": "text/html; charset=utf-8" } as const;

  const guide = slug ? getGuide(slug) : undefined;

  // 알 수 없는 slug → SPA 템플릿으로 폴백(앱이 처리/404).
  if (!guide) {
    const template = await getTemplate(origin);
    if (template) return new Response(template, { headers: htmlHeaders });
    return new Response("<!doctype html><title>Dewy</title>", { status: 200, headers: htmlHeaders });
  }

  const rendered = renderGuide(guide);
  const template = await getTemplate(origin);

  if (template) {
    return new Response(inject(template, rendered), {
      headers: { ...htmlHeaders, "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }
  return new Response(bareDoc(rendered), { headers: htmlHeaders });
}

// 빌드 타임 참조(번들러가 데이터 모듈을 포함하도록) — 사용처 없어도 트리셰이킹 방지.
export const _guideCount = aeoGuides.length;
