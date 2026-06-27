// 자체 블로그(/blog/<slug>) 전용 서버 사이드 렌더링.
// CSR SPA라 크롤러/AI가 빈 #root만 받던 문제를, 발행된 블로그 글에 한해 요청 시점에
// 실제 본문(content_html) + 구조화 데이터(Article·BreadcrumbList·FAQPage)를 HTML 에
// 주입해 해결한다. 사용자에겐 기존 SPA 가 부팅돼 #root 를 동일 내용으로 교체한다.
// vercel.json 의 rewrite 가 /blog/<slug> 를 이 함수로 보낸다.
//
// 콘텐츠 = Supabase blog_post_drafts(status='published'). 본문은 발행 시 저장된
// content_html 스냅샷을 그대로 쓴다(서버에서 마크다운 재파싱 안 함 → 의존성 0).

export const config = { runtime: "edge" };

import { SITE, SUPABASE_URL, SUPABASE_ANON_KEY, esc, headTags, inject, bareDoc, getTemplate, type Rendered } from "./_lib/ssr";

interface BlogRow {
  title: string;
  slug: string | null;
  excerpt: string | null;
  content_html: string | null;
  content_markdown: string | null;
  canonical_url: string | null;
  featured_image_url: string | null;
  categories: string[] | null;
  tags: string[] | null;
  updated_at: string | null;
  wp_published_at: string | null;
}

async function fetchPublished(slug: string): Promise<BlogRow | null> {
  const sel =
    "select=title,slug,excerpt,content_html,content_markdown,canonical_url,featured_image_url,categories,tags,updated_at,wp_published_at";
  const url =
    `${SUPABASE_URL}/rest/v1/blog_post_drafts?${sel}` +
    `&status=eq.published&slug=eq.${encodeURIComponent(slug)}&order=wp_published_at.desc&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as BlogRow[];
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// content_markdown 에서 FAQ(질문-답)를 best-effort 추출해 FAQPage 스키마로.
// 생성기 포맷: "**Q. 질문?**\n답변..." (자주 묻는 질문 섹션). 실패하면 빈 배열.
function extractFaqs(md: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  if (!md) return out;
  const re = /\*\*Q\.\s*(.+?)\*\*\s*\n+([^\n]+(?:\n(?!\s*\*\*Q\.)[^\n]+)*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const q = m[1].trim();
    const a = m[2].replace(/\s+/g, " ").trim();
    if (q && a) out.push({ q, a });
    if (out.length >= 8) break;
  }
  return out;
}

function jsonLdGraph(row: BlogRow, canonical: string, faqs: { q: string; a: string }[]): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "블로그", item: `${SITE}/blog` },
        { "@type": "ListItem", position: 3, name: row.title, item: canonical },
      ],
    },
    {
      "@type": "Article",
      headline: row.title,
      description: row.excerpt ?? "",
      inLanguage: "ko-KR",
      datePublished: row.wp_published_at ?? row.updated_at ?? undefined,
      dateModified: row.updated_at ?? row.wp_published_at ?? undefined,
      image: row.featured_image_url ?? undefined,
      author: { "@type": "Organization", name: "Dewy", url: `${SITE}/` },
      publisher: {
        "@type": "Organization",
        name: "Dewy",
        logo: { "@type": "ImageObject", url: `${SITE}/dewy-logo.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    },
  ];
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function renderBlog(row: BlogRow): Rendered {
  const slug = row.slug ?? "";
  // 자체 발행이 기준 — canonical 은 우리 URL. (다른 채널 선게시 원본이 있으면 그 URL 우선)
  const canonical = row.canonical_url?.trim() ? row.canonical_url.trim() : `${SITE}/blog/${encodeURIComponent(slug)}`;
  const metaDesc = (row.excerpt ?? row.title).slice(0, 160);
  const faqs = extractFaqs(row.content_markdown ?? "");
  const head = headTags(
    row.title,
    metaDesc,
    canonical,
    jsonLdGraph(row, canonical, faqs),
    row.featured_image_url?.trim() || undefined,
  );

  const tagsHtml = (row.tags ?? []).length
    ? `<p style="color:#888;font-size:13px;">${(row.tags ?? []).map((t) => `#${esc(t)}`).join(" ")}</p>`
    : "";
  const imgHtml = row.featured_image_url?.trim()
    ? `<img src="${esc(row.featured_image_url)}" alt="${esc(row.title)}" style="width:100%;border-radius:12px;margin:12px 0;" />`
    : "";

  // content_html 은 우리 어드민에서 react-markdown 으로 렌더한 신뢰 가능한 본문.
  const body = `
    <main style="max-width:480px;margin:0 auto;padding:20px;font-family:'Noto Sans KR',sans-serif;color:#3b3b3b;line-height:1.7;">
      <nav aria-label="breadcrumb" style="font-size:13px;color:#888;"><a href="${SITE}/" style="color:#888;">홈</a> &gt; <a href="${SITE}/blog" style="color:#888;">블로그</a> &gt; ${esc(row.title)}</nav>
      <h1>${esc(row.title)}</h1>
      ${row.excerpt ? `<p style="background:#f5f5f5;border-radius:12px;padding:12px;">${esc(row.excerpt)}</p>` : ""}
      ${imgHtml}
      ${row.content_html ?? ""}
      ${tagsHtml}
    </main>`;

  return { title: row.title, description: metaDesc, canonical, head, body };
}

function resolveSlug(url: URL): string | null {
  const q = url.searchParams.get("slug");
  if (q) return q;
  const path = decodeURIComponent(url.pathname).replace(/^\/+blog\/?/, "").replace(/^\/+|\/+$/g, "");
  return path || null;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const slug = resolveSlug(url);
  const origin = url.origin;
  const htmlHeaders = { "content-type": "text/html; charset=utf-8" } as const;

  const row = slug ? await fetchPublished(slug) : null;

  // 미발행/없는 slug → SPA 템플릿 폴백(앱이 처리/404).
  if (!row) {
    const template = await getTemplate(origin);
    if (template) return new Response(template, { headers: htmlHeaders });
    return new Response("<!doctype html><title>Dewy 블로그</title>", { status: 200, headers: htmlHeaders });
  }

  const rendered = renderBlog(row);
  const template = await getTemplate(origin);
  if (template) {
    return new Response(inject(template, rendered), {
      headers: { ...htmlHeaders, "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }
  return new Response(bareDoc(rendered), { headers: htmlHeaders });
}
