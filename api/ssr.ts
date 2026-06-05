// 공개 상세 페이지(업체·상품) 전용 서버 사이드 렌더링.
// CSR SPA라 크롤러가 빈 #root만 받던 문제를, 검색에 중요한 상세 페이지에 한해
// 요청 시점에 Supabase 데이터를 가져와 실제 본문 + 구조화 데이터를 HTML에 주입해
// 해결한다. 사용자에게는 기존 SPA 스크립트가 그대로 부팅돼 #root 내용을 대체한다.
// vercel.json 의 rewrite 가 /venue/:id 등 특정 경로만 이 함수로 보낸다.

export const config = { runtime: "edge" };

const SITE = "https://dewy-wedding.com";
const SUPABASE_URL = "https://qabeywyzjsgyqpjqsvkd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhYmV5d3l6anNneXFwanFzdmtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTg4MzUsImV4cCI6MjA5MTEzNDgzNX0.ae0GIokaeczwm0-FaVSoCnkNqBgagsdD1-1I_BP90Jo";

const CATEGORY_LABEL: Record<string, string> = {
  wedding_hall: "웨딩홀",
  studio: "스튜디오",
  dress_shop: "드레스",
  makeup_shop: "메이크업",
  hanbok: "한복",
  tailor_shop: "예복",
  honeymoon: "신혼여행",
  jewelry: "예물·예단",
  appliance: "혼수·가전",
  invitation_venue: "청첩장 모임",
};

const CARD_KEY: Record<string, string> = {
  wedding_hall: "place_wedding_halls",
  studio: "place_studios",
  dress_shop: "place_dress_shops",
  makeup_shop: "place_makeup_shops",
  hanbok: "place_hanboks",
  tailor_shop: "place_tailor_shops",
  honeymoon: "place_honeymoons",
  jewelry: "place_jewelry",
  appliance: "place_appliances",
  invitation_venue: "place_invitation_venues",
};

const PLACE_SELECT = [
  "*",
  "place_details(*)",
  "place_wedding_halls(*)",
  "place_studios(*)",
  "place_dress_shops(*)",
  "place_makeup_shops(*)",
  "place_hanboks(*)",
  "place_tailor_shops(*)",
  "place_honeymoons(*)",
  "place_appliances(*)",
  "place_jewelry(*)",
  "place_invitation_venues(*)",
].join(",");

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstRow(json: unknown): Record<string, unknown> | null {
  return Array.isArray(json) && json.length && typeof json[0] === "object"
    ? (json[0] as Record<string, unknown>)
    : null;
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
}

async function sb(path: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  return res.json();
}

type Rendered = { title: string; description: string; canonical: string; head: string; body: string };

function advantages(d: Record<string, unknown> | null): string[] {
  if (!d) return [];
  const out: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const t = d[`advantage_${i}_title`];
    if (typeof t === "string" && t.trim()) out.push(t.trim());
  }
  return out;
}

function renderPlace(p: Record<string, unknown>, reviews: Record<string, unknown>[], prefix: string): Rendered {
  const id = String(p.place_id ?? "");
  const name = String(p.name ?? "업체");
  const category = String(p.category ?? "");
  const label = CATEGORY_LABEL[category] ?? "웨딩 업체";
  const address = [p.city, p.district].filter(Boolean).join(" ");
  const rating = Number(p.avg_rating ?? 0);
  const reviewCount = Number(p.review_count ?? 0);
  const d = (p.place_details ?? null) as Record<string, unknown> | null;
  const card = (p[CARD_KEY[category]] ?? null) as Record<string, unknown> | null;
  const image = (p.main_image_url as string) || `${SITE}/android-launchericon-512-512.png`;
  const desc = (p.description as string) || `${address} ${label} ${name}. Dewy에서 가격·후기·서비스를 확인하세요.`;

  // 제공 서비스/특징: advantages + tags + 카테고리 배열 필드를 모은다.
  const services = new Set<string>();
  for (const a of advantages(d)) services.add(a);
  for (const t of strArray(p.tags)) services.add(t);
  if (card) {
    for (const v of Object.values(card)) for (const s of strArray(v)) services.add(s);
  }
  const serviceList = Array.from(services).slice(0, 30);

  const canonical = `${SITE}/${prefix}/${id}`;
  const metaDesc = desc.slice(0, 160);

  const reviewItems = reviews.slice(0, 20);
  const bodyReviews = reviewItems
    .map((r) => {
      const author = esc(r.author ?? "익명");
      const rt = r.rating != null ? `${esc(r.rating)}점 · ` : "";
      const title = r.title ? `<strong>${esc(r.title)}</strong> ` : "";
      return `<li>${title}${rt}${esc(r.content)} <span>- ${author}</span></li>`;
    })
    .join("");

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    image,
    description: metaDesc,
    url: canonical,
    ...(address ? { address: { "@type": "PostalAddress", addressLocality: address } } : {}),
    ...(reviewCount > 0 && rating > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount } }
      : {}),
    ...(reviewItems.length
      ? {
          review: reviewItems.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: String(r.author ?? "익명") },
            ...(r.rating != null ? { reviewRating: { "@type": "Rating", ratingValue: Number(r.rating) } } : {}),
            reviewBody: String(r.content ?? ""),
          })),
        }
      : {}),
  };

  const title = `${name} - ${label} 가격·후기 | Dewy`;
  const head = headTags(title, metaDesc, canonical, image, jsonLd);
  const body = `
    <section aria-hidden="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:normal;border:0;">
      <h1>${esc(name)}</h1>
      <p>${esc(label)}${address ? ` · ${esc(address)}` : ""}</p>
      ${reviewCount > 0 ? `<p>평점 ${esc(rating.toFixed(1))} · 후기 ${esc(reviewCount)}개</p>` : ""}
      <p>${esc(desc)}</p>
      ${serviceList.length ? `<h2>제공 서비스·특징</h2><ul>${serviceList.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
      ${bodyReviews ? `<h2>실제 후기</h2><ul>${bodyReviews}</ul>` : ""}
    </section>`;

  return { title, description: metaDesc, canonical, head, body };
}

function renderProduct(p: Record<string, unknown>): Rendered {
  const id = String(p.id ?? "");
  const name = String(p.name ?? "상품");
  const price = Number(p.sale_price ?? p.price ?? 0);
  const image = (p.thumbnail_url as string) || `${SITE}/android-launchericon-512-512.png`;
  const desc = (p.description as string) || `${name} - Dewy 웨딩 쇼핑몰에서 만나보세요.`;
  const canonical = `${SITE}/store/${id}`;
  const metaDesc = desc.slice(0, 160);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image,
    description: metaDesc,
    url: canonical,
    ...(price > 0
      ? { offers: { "@type": "Offer", price, priceCurrency: "KRW", availability: "https://schema.org/InStock" } }
      : {}),
  };

  const title = `${name} | Dewy 웨딩 쇼핑몰`;
  const head = headTags(title, metaDesc, canonical, image, jsonLd);
  const body = `
    <section aria-hidden="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:normal;border:0;">
      <h1>${esc(name)}</h1>
      ${price > 0 ? `<p>${esc(price.toLocaleString("ko-KR"))}원</p>` : ""}
      <p>${esc(desc)}</p>
    </section>`;

  return { title, description: metaDesc, canonical, head, body };
}

// ── 법적/정책 페이지 SSR ────────────────────────────────────────────────
// 약관·개인정보·계정삭제 라우트는 SPA 라우트라 JS 미실행 크롤러/검수봇에게는
// 빈 #root 만 보인다. 특히 계정삭제 URL 은 Google Play 데이터보안 폼이 직접
// fetch 해 검토하므로 본문이 서버에서 나와야 안전하다. 아래는 "크롤러용 본문"
// 이며, 사용자에게는 기존 React 페이지(src/pages/{AccountDeletion,Privacy,
// Terms}.tsx)가 부팅돼 #root 를 대체한다.
//   ⚠️ 드리프트 주의: 계정삭제 항목/보관기간, 개인정보·약관의 섹션 구성을
//   바꾸면 해당 TSX 와 아래 내용을 함께 갱신할 것. (React 페이지가 사용자
//   대상 정본, 여기는 검수/색인용 요약·개요)
const LEGAL_SLUGS = ["account-deletion", "privacy", "terms"] as const;
type LegalSlug = (typeof LEGAL_SLUGS)[number];

function isLegalSlug(v: string | null): v is LegalSlug {
  return v != null && (LEGAL_SLUGS as readonly string[]).includes(v);
}

function legalRendered(slug: LegalSlug, title: string, desc: string, inner: string): Rendered {
  const canonical = `${SITE}/${slug}`;
  const metaDesc = desc.slice(0, 160);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: metaDesc,
    url: canonical,
    inLanguage: "ko-KR",
    isPartOf: { "@type": "WebSite", name: "Dewy", url: SITE },
  };
  const head = headTags(title, metaDesc, canonical, `${SITE}/dewy-logo.png`, jsonLd);
  // clip 으로 시각적 숨김(React 부팅 전 깜빡임 방지) — display:none 이 아니라
  // 크롤러·스크린리더에는 읽힌다.
  const body = `
    <section aria-hidden="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:normal;border:0;">
      ${inner}
    </section>`;
  return { title, description: metaDesc, canonical, head, body };
}

function renderLegal(slug: LegalSlug): Rendered {
  if (slug === "account-deletion") {
    return legalRendered(
      "account-deletion",
      "계정 및 데이터 삭제 요청 | Dewy",
      "Dewy(듀이) 계정 및 개인정보·서비스 이용 데이터 삭제 요청 방법, 즉시 삭제되는 항목, 법령에 따라 보관되는 항목과 보관 기간을 안내합니다.",
      `
      <h1>계정 및 데이터 삭제 요청</h1>
      <p>앱 이름: Dewy (듀이) · 개발자: Dewy</p>
      <p>Dewy 는 회원의 개인정보 보호와 데이터 통제권을 존중합니다. 본 페이지는 회원이 계정과 관련된 개인정보 및 서비스 이용 데이터의 삭제를 요청하는 방법을 안내합니다.</p>
      <h2>1. 앱 내에서 계정 삭제 (권장)</h2>
      <ol>
        <li>Dewy 앱 실행</li>
        <li>하단 메뉴에서 마이페이지 탭 선택</li>
        <li>설정 → 계정 관리 → 회원 탈퇴 메뉴 진입</li>
        <li>안내 문구 확인 후 탈퇴하기 버튼 선택</li>
        <li>본인 확인 후 탈퇴 처리가 즉시 완료됩니다</li>
      </ol>
      <h2>2. 이메일로 계정 삭제 요청</h2>
      <p>로그인이 어렵거나 앱 내 탈퇴가 불가능한 경우 kheceo@dewy-wedding.com 으로 가입 이메일, 가입 시 사용한 소셜 로그인 종류(Google/Kakao), 가입 시점 추정 일자를 포함해 요청하시면 영업일 기준 3일 이내 처리해 드립니다.</p>
      <h2>3. 즉시 삭제되는 데이터</h2>
      <ul>
        <li>회원 식별 정보 (이메일, 닉네임, 프로필 사진)</li>
        <li>결혼 정보 (예식일, 지역, 파트너 이름, 결혼 스타일, 페르소나 설정)</li>
        <li>예산 항목 및 일정 항목 (사용자가 직접 작성·체크한 모든 항목)</li>
        <li>찜·장바구니·하트·포인트 잔액</li>
        <li>커뮤니티 게시글 및 댓글 (회원 식별 정보는 비식별 처리)</li>
        <li>튜토리얼 진행 이력, AI 사용 이력 (콘텐츠 본문은 즉시 파기)</li>
        <li>광고 식별자(AdMob)와 연동된 행동 데이터</li>
      </ul>
      <h2>4. 법령에 따라 보관되는 데이터</h2>
      <p>아래 정보는 관련 법령에 따라 정해진 기간 동안 분리·암호화 보관 후 자동 파기됩니다.</p>
      <ul>
        <li>계약·결제·구매 기록 — 5년 (전자상거래법)</li>
        <li>소비자 불만·분쟁 처리 기록 — 3년 (전자상거래법)</li>
        <li>로그인·접속 기록 — 3개월 (통신비밀보호법)</li>
        <li>표시·광고 기록 — 6개월 (전자상거래법)</li>
      </ul>
      <h2>5. 데이터 일부만 삭제 요청</h2>
      <p>계정을 유지하면서 일부 데이터만 삭제하려면 위 이메일로 구체적 항목을 명시해 요청해 주세요.</p>
      <h2>6. 문의</h2>
      <p>계정 삭제 절차 문의는 kheceo@dewy-wedding.com 으로 연락해 주세요. 영업일 기준 3일 이내 답변드립니다.</p>`,
    );
  }
  if (slug === "privacy") {
    return legalRendered(
      "privacy",
      "개인정보처리방침 | Dewy",
      "Dewy(듀이)가 수집하는 개인정보 항목, 처리 목적, 보유·이용 기간, 제3자 제공·위탁·국외이전, 정보주체의 권리와 보호책임자 안내.",
      `
      <h1>개인정보처리방침</h1>
      <p>Dewy(듀이)는 정보주체의 개인정보를 「개인정보 보호법」 등 관련 법령에 따라 보호하며, 아래 항목으로 처리 방침을 안내합니다. 전체 내용은 앱/웹 화면에서 확인하실 수 있습니다.</p>
      <h2>1. 개인정보의 처리 목적</h2>
      <h2>2. 수집하는 개인정보의 항목</h2>
      <h2>3. 개인정보의 보유 및 이용 기간</h2>
      <h2>4. 개인정보의 제3자 제공</h2>
      <h2>5. 개인정보 처리의 위탁</h2>
      <h2>6. 개인정보의 국외 이전</h2>
      <h2>7. 정보주체의 권리·의무 및 행사 방법</h2>
      <h2>8. 개인정보의 안전성 확보 조치</h2>
      <h2>9. 자동 수집 정보 및 쿠키</h2>
      <h2>10. 만 14세 미만 아동의 개인정보</h2>
      <h2>11. 개인정보 보호책임자</h2>
      <p>개인정보 관련 문의: kheceo@dewy-wedding.com</p>
      <h2>12. 개인정보처리방침의 변경</h2>`,
    );
  }
  // terms
  return legalRendered(
    "terms",
    "이용약관 | Dewy",
    "Dewy(듀이) 서비스 이용약관 — 서비스 내용, 요금·결제, 하트·포인트, Premium 구독, 환불 정책, 사진 업로드·AI 결과물, 회원 의무, 분쟁 해결 등.",
    `
    <h1>이용약관</h1>
    <p>본 약관은 Dewy(듀이) 서비스 이용에 관한 회사와 회원 간 권리·의무를 규정합니다. 전체 조항은 앱/웹 화면에서 확인하실 수 있습니다.</p>
    <h2>제1조 (목적)</h2>
    <h2>제2조 (정의)</h2>
    <h2>제3조 (약관의 게시 및 개정)</h2>
    <h2>제4조 (이용계약의 성립)</h2>
    <h2>제5조 (서비스 내용)</h2>
    <h2>제6조 (요금 및 결제)</h2>
    <h2>제7조 (하트 시스템) / 제7조의2 (포인트 시스템)</h2>
    <h2>제8조 (Premium 구독)</h2>
    <h2>제9조 (환불 정책)</h2>
    <h2>제10조 (사진 업로드 및 AI 결과물)</h2>
    <h2>제11조 (회원의 의무)</h2>
    <h2>제12조 (회사의 의무 및 면책)</h2>
    <h2>제13조 (지식재산권)</h2>
    <h2>제14조 (서비스 이용 제한)</h2>
    <h2>제15조 (계약 해지)</h2>
    <h2>제16조 (분쟁 해결 및 관할)</h2>`,
  );
}

function headTags(title: string, desc: string, canonical: string, image: string, jsonLd: Record<string, unknown>): string {
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
    // `<` 를 유니코드로 이스케이프해 본문 데이터에 든 `</script>`/`<!--` 가
    // 스크립트 태그를 탈출하는 것(XSS)을 막는다.
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
}

function inject(template: string, r: Rendered): string {
  // 치환 문자열을 함수로 넘겨, 본문 데이터에 든 `$&`/`$1`/`$$` 같은 시퀀스가
  // String.replace 의 특수 치환 패턴으로 해석돼 출력이 깨지는 것을 막는다.
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(r.title)}</title>`);
  // 기존 description/canonical 제거(상세용으로 대체) 후 head 주입
  html = html
    .replace(/<meta name="description"[^>]*>/, "")
    .replace(/<link rel="canonical"[^>]*>/, "");
  html = html.replace("</head>", () => `    ${r.head}\n  </head>`);
  // #root 안에 본문 주입(앱 부팅 시 React 가 대체). noscript 는 그대로 둔다.
  html = html.replace('<div id="root">', () => `<div id="root">\n      ${r.body}`);
  return html;
}

// 템플릿(index.html) 확보 실패 시 사용할, 리다이렉트 없는 최소 문서.
// 무한 리다이렉트를 피하면서 크롤러에는 본문/구조화 데이터를 제공한다.
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

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const id = url.searchParams.get("id");
  const prefix = url.searchParams.get("prefix") ?? "venue";
  const origin = url.origin;

  // 데이터를 먼저 렌더(있으면). 템플릿은 그 다음 확보한다.
  let rendered: Rendered | null = null;
  // 법적/정책 페이지: DB 조회 없이 정적 본문을 서버 렌더.
  if (type === "legal") {
    const page = url.searchParams.get("page");
    if (isLegalSlug(page)) rendered = renderLegal(page);
  } else if (type && id) {
    try {
      if (type === "place") {
        const rows = await sb(
          `places?place_id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(PLACE_SELECT)}`,
        );
        const place = firstRow(rows);
        if (place) {
          let reviews: Record<string, unknown>[] = [];
          try {
            const rv = await sb(
              `place_reviews?place_id=eq.${encodeURIComponent(id)}&select=title,content,author,rating,review_date&order=review_date.desc.nullslast&limit=20`,
            );
            reviews = Array.isArray(rv) ? (rv as Record<string, unknown>[]) : [];
          } catch {
            reviews = [];
          }
          rendered = renderPlace(place, reviews, prefix);
        }
      } else if (type === "product") {
        const rows = await sb(`products?id=eq.${encodeURIComponent(id)}&select=*`);
        const product = firstRow(rows);
        if (product) rendered = renderProduct(product);
      }
    } catch {
      rendered = null;
    }
  }

  const template = await getTemplate(origin);
  const htmlHeaders = { "content-type": "text/html; charset=utf-8" } as const;

  if (rendered && template) {
    return new Response(inject(template, rendered), {
      headers: { ...htmlHeaders, "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }
  // 데이터는 있는데 템플릿을 못 받은 경우: 리다이렉트 없이 최소 문서로 본문 제공.
  if (rendered) return new Response(bareDoc(rendered), { headers: htmlHeaders });
  // 데이터가 없으면(존재하지 않는 id 등) SPA 템플릿으로 폴백 → 앱이 처리.
  if (template) return new Response(template, { headers: htmlHeaders });
  // 둘 다 실패한 극단적 경우에도 리다이렉트 루프 없이 종료.
  return new Response("<!doctype html><title>Dewy</title>", { status: 200, headers: htmlHeaders });
}
