import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { CONSUMER_GUIDE } from "@/data/consumerGuide";

// 소비자(예비부부) 앱 사용 가이드 — /help. 단일 소스 src/data/consumerGuide.ts 를 렌더.
// 업체용 가이드(/business/guides)와 별개.
const ConsumerGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative font-sans break-keep">
      <Seo title="듀이 사용 가이드" description="듀이로 결혼 준비하는 법 — 둘러보기·문의·혜택·AI 도구·예산·청첩장까지 한눈에." path="/help" />
      <PageHeader title="사용 가이드" />

      <main className="pb-24">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-extrabold text-foreground">듀이로 결혼 준비, 이렇게 해요</h1>
          <p className="text-sm text-muted-foreground mt-1">둘러보기부터 문의·혜택·AI 체험·청첩장까지 — 핵심만 모았어요.</p>
        </div>

        <div className="px-4 py-2 space-y-3">
          {CONSUMER_GUIDE.map((s) => {
            const Icon = s.icon;
            return (
              <section key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-bold text-foreground">{s.title}</h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.summary}</p>
                  </div>
                </div>

                <ol className="mt-3 space-y-2">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[11px] font-bold text-foreground shrink-0 mt-0.5">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground">{step.title}</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                {s.cta && (
                  <button
                    type="button"
                    onClick={() => navigate(s.cta!.target)}
                    className="mt-3 w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-primary/10 text-primary text-[13px] font-bold active:opacity-80"
                  >
                    {s.cta.label}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </section>
            );
          })}
        </div>

        <p className="px-4 pt-2 text-center text-xs text-muted-foreground">
          더 궁금한 점은 마이페이지 → 고객 지원에서 문의해 주세요.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default ConsumerGuide;
