import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getGuide } from "@/data/aeoGuides";
import NotFound from "@/features/consumer/pages/NotFound";

// AEO 가이드 페이지(결혼어플추천 등)의 사용자용 렌더.
// 크롤러/AI 용 본문은 api/guide.ts 가 같은 데이터(src/data/aeoGuides)로 SSR 주입.
const Guide = ({ slug }: { slug: string }) => {
  const navigate = useNavigate();
  const guide = getGuide(slug);

  if (!guide) return <NotFound />;

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <Seo title={guide.title} description={guide.metaDescription} path={`/${guide.slug}`} />
      <PageHeader title={guide.breadcrumbName} />

      <main className="pb-24">
        <article className="px-4 py-5 space-y-6">
          {/* breadcrumb */}
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <button onClick={() => navigate("/")} className="hover:text-foreground">
              홈
            </button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{guide.breadcrumbName}</span>
          </nav>

          <h1 className="text-xl font-bold leading-snug">{guide.h1}</h1>

          {/* 정의형 즉답 — 가장 먼저 보이는 답변 */}
          <p className="text-[15px] leading-relaxed bg-muted rounded-2xl p-4">{guide.answer}</p>

          {/* 본문 섹션 */}
          {guide.sections.map((s, i) => (
            <section key={i} className="space-y-2">
              <h2 className="text-base font-semibold">{s.h2}</h2>
              {s.body && <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>}
              {s.list && (
                <ul className="space-y-1.5">
                  {s.list.map((item, j) => (
                    <li key={j} className="flex gap-2 text-sm leading-relaxed">
                      <span className="text-primary mt-0.5">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* 기능 비교표(플래그십) */}
          {guide.table && (
            <section className="space-y-2">
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-muted">
                      {guide.table.headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guide.table.rows.map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{r.criterion}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.why}</td>
                        <td className="px-3 py-2">{r.dewy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* FAQ */}
          {guide.faqs.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold">자주 묻는 질문</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {guide.faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="bg-card rounded-xl border border-border px-4"
                  >
                    <AccordionTrigger className="text-left text-sm font-medium py-4">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4 whitespace-pre-line">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* 관련 기능(내부 링크 + 전환 동선) */}
          {guide.related.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold">Dewy에서 바로 해보기</h2>
              <div className="grid grid-cols-2 gap-2">
                {guide.related.map((r) => (
                  <button
                    key={r.path}
                    onClick={() => navigate(r.path)}
                    className="flex items-center justify-between gap-1 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <span className="text-left">{r.label}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 관련 가이드(토픽 클러스터 상호링크) */}
          {guide.relatedGuides.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold">관련 가이드</h2>
              <ul className="space-y-1.5">
                {guide.relatedGuides.map((r) => (
                  <li key={r.path}>
                    <button
                      onClick={() => navigate(r.path)}
                      className="flex w-full items-center justify-between gap-1 text-left text-sm text-primary hover:underline"
                    >
                      <span>{r.label}</span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="pt-2 text-xs text-muted-foreground">최종 업데이트: {guide.updated}</p>
        </article>
      </main>

      <BottomNav activeTab="/" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

export default Guide;
