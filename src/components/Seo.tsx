import { useEffect } from "react";

// CSR SPA라 페이지별 <title>/메타가 없으면 JS 렌더링 크롤러(Googlebot)가
// 모든 경로를 동일한 메타로 본다. 라우트 마운트 시 head를 갱신해 페이지별
// 제목·설명·canonical·OG 를 제공한다. (무JS 크롤러용 본문은 index.html noscript 담당)
const SITE = "https://dewy-wedding.com";

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

type SeoProps = {
  title: string;
  description: string;
  path: string;
  /**
   * 색인 거부할 때 true. 개인 데이터 페이지(마이페이지·장바구니·주문) 처럼
   * Google 검색 결과에 노출될 가치가 없거나, 노출되면 사생활·보안 문제가 있는
   * 경로에 사용. SPA 라 라우트 마다 동적으로 meta robots 를 갱신해야 한다.
   */
  noIndex?: boolean;
};

const Seo = ({ title, description, path, noIndex = false }: SeoProps) => {
  useEffect(() => {
    const url = `${SITE}${path}`;
    const prevTitle = document.title;
    document.title = title;

    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    // robots / canonical 은 noIndex 페이지에서 다르게 처리
    const robotsContent = noIndex ? "noindex, nofollow" : "index, follow";
    setMeta('meta[name="robots"]', "name", "robots", robotsContent);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (noIndex) {
      // noindex 페이지는 canonical 도 제거 — Google 에게 "이 URL 은 색인 대상 아님"
      // 신호를 일관되게 줘서 중복 시그널 방지.
      if (canonical) canonical.remove();
    } else {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", url);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, path, noIndex]);

  return null;
};

export default Seo;
