import PageHeader from "@/components/PageHeader";

// 주요 오픈소스 라이브러리와 라이선스 고지. 전체 의존성의 라이선스 원문은 각 프로젝트
// 저장소(아래 링크)에서 확인할 수 있다. 핵심 의존성을 큐레이션해 표기한다.
interface Lib {
  name: string;
  license: string;
  url: string;
}

const GROUPS: { title: string; libs: Lib[] }[] = [
  {
    title: "프레임워크 · UI",
    libs: [
      { name: "React / React DOM", license: "MIT", url: "https://github.com/facebook/react" },
      { name: "Vite", license: "MIT", url: "https://github.com/vitejs/vite" },
      { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
      { name: "Radix UI", license: "MIT", url: "https://github.com/radix-ui/primitives" },
      { name: "lucide-react", license: "ISC", url: "https://github.com/lucide-icons/lucide" },
      { name: "framer-motion", license: "MIT", url: "https://github.com/framer/motion" },
      { name: "sonner", license: "MIT", url: "https://github.com/emilkowalski/sonner" },
      { name: "react-router", license: "MIT", url: "https://github.com/remix-run/react-router" },
    ],
  },
  {
    title: "데이터 · 백엔드",
    libs: [
      { name: "@supabase/supabase-js", license: "MIT", url: "https://github.com/supabase/supabase-js" },
      { name: "@tanstack/react-query", license: "MIT", url: "https://github.com/TanStack/query" },
      { name: "axios", license: "MIT", url: "https://github.com/axios/axios" },
      { name: "date-fns", license: "MIT", url: "https://github.com/date-fns/date-fns" },
      { name: "zod", license: "MIT", url: "https://github.com/colinhacks/zod" },
    ],
  },
  {
    title: "미디어 · 캔버스",
    libs: [
      { name: "Konva", license: "MIT", url: "https://github.com/konvajs/konva" },
      { name: "html2canvas", license: "MIT", url: "https://github.com/niklasvh/html2canvas" },
      { name: "jsPDF", license: "MIT", url: "https://github.com/parallax/jsPDF" },
      { name: "qrcode", license: "MIT", url: "https://github.com/soldair/node-qrcode" },
      { name: "matter-js", license: "MIT", url: "https://github.com/liabru/matter-js" },
      { name: "DOMPurify", license: "Apache-2.0 / MPL-2.0", url: "https://github.com/cure53/DOMPurify" },
    ],
  },
  {
    title: "네이티브 (Capacitor)",
    libs: [
      { name: "@capacitor/core · android · ios", license: "MIT", url: "https://github.com/ionic-team/capacitor" },
      { name: "@capacitor-community/admob", license: "MIT", url: "https://github.com/capacitor-community/admob" },
    ],
  },
];

const OssLicenses = () => (
  <div className="min-h-screen bg-background app-col mx-auto relative">
    <PageHeader title="오픈소스 라이선스" />
    <main className="px-5 py-6 pb-24 text-[13px] leading-7 text-foreground">
      <p className="mb-5 text-muted-foreground">
        Dewy는 아래 오픈소스 소프트웨어를 사용합니다. 각 프로젝트와 라이선스 전문은 링크에서
        확인하실 수 있어요. 표기는 주요 의존성을 정리한 것으로, 전체 목록은 저장소의
        <code className="mx-1 px-1 rounded bg-muted">package.json</code>을 참고하세요.
      </p>
      <div className="space-y-6">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-sm font-bold text-foreground mb-2">{g.title}</h2>
            <ul className="space-y-1.5">
              {g.libs.map((lib) => (
                <li key={lib.name} className="flex items-start justify-between gap-3">
                  <a
                    href={lib.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary underline-offset-2 hover:underline min-w-0 break-words"
                  >
                    {lib.name}
                  </a>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{lib.license}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 text-[12px] text-muted-foreground">
        각 라이브러리는 해당 라이선스 조건에 따라 사용됩니다. 저작권은 각 저작권자에게 있습니다.
      </p>
    </main>
  </div>
);

export default OssLicenses;
