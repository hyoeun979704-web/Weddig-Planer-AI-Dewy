import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { CONSUMER_NAV } from "@/data/consumerGuides";

// 소비자 앱 사용 가이드 목록(목차) — /help. 주제별 가이드를 골라 슬라이드로 본다.
// 기업 가이드 목록(BusinessGuideIndex)과 동일한 카드 레이아웃.
const ConsumerGuideIndex = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col font-sans break-keep">
      <Seo title="듀이 사용 가이드" description="둘러보기·문의·견적·예산·AI·청첩장까지 — 듀이로 결혼 준비하는 법을 단계별로 안내해요." path="/help" />
      <PageHeader title="사용 가이드" />

      <div className="px-4 lg:px-8 py-5 lg:py-8">
        <div className="mb-5 lg:mb-8">
          <h2 className="text-xl lg:text-3xl font-extrabold tracking-tight text-foreground text-balance">
            듀이로 결혼 준비, 이렇게 해요
          </h2>
          <p className="mt-1.5 text-sm lg:text-base text-muted-foreground text-pretty">
            보고 싶은 주제를 골라 단계별로 따라 해보세요.
          </p>
        </div>

        <ul className="space-y-3">
          {CONSUMER_NAV.map((g, i) => (
            <li key={g.id}>
              <button
                onClick={() => navigate(g.route)}
                className="w-full flex items-center gap-4 text-left rounded-2xl border border-border bg-card p-3 lg:p-4 hover:border-primary/40 hover:bg-primary/[0.03] active:scale-[0.995] transition-all"
              >
                <div className="shrink-0 w-16 h-[5.3rem] lg:w-20 lg:h-[6.6rem] rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={g.cover} alt="" className="w-full h-full object-cover block" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[11px] font-bold text-primary/80 mb-1">STEP {i + 1}</span>
                  <p className="text-base lg:text-lg font-extrabold text-foreground leading-snug text-balance">{g.title}</p>
                  <p className="mt-1 text-[13px] lg:text-sm text-muted-foreground line-clamp-2">{g.summary}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <BottomNav />
    </div>
  );
};

export default ConsumerGuideIndex;
