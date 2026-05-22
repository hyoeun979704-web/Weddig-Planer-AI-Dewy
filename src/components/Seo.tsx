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
};

const Seo = ({ title, description, path }: SeoProps) => {
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

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, path]);

  return null;
};

export default Seo;
