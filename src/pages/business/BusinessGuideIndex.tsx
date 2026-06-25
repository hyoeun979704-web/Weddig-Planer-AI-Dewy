import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { GUIDE_NAV } from "@/data/businessGuides";

// 사용 가이드 목록(목차). 개요 + 주제별 상세 가이드 전체를 한 페이지에서 고른다.
// 소비자 마이페이지 · 기업 대시보드 양쪽에서 진입. 각 가이드는 블로그식 이전/다음으로
// 이어 볼 수 있다(공용 GuideView).
const BusinessGuideIndex = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background app-col mx-auto flex flex-col font-sans break-keep">
      <PageHeader title="사용 가이드" />

      <div className="px-4 lg:px-8 py-5 lg:py-8">
        <div className="mb-5 lg:mb-8">
          <h2 className="text-xl lg:text-3xl font-extrabold tracking-tight text-foreground text-balance">
            웨딩 업체 사용 가이드
          </h2>
          <p className="mt-1.5 text-sm lg:text-base text-muted-foreground text-pretty">
            전체 흐름부터 기능별 따라 하기까지 — 보고 싶은 가이드를 골라 보세요.
          </p>
        </div>

        <ul className="space-y-3">
          {GUIDE_NAV.map((g, i) => (
            <li key={g.id}>
              <button
                onClick={() => navigate(g.route)}
                className="w-full flex items-center gap-4 text-left rounded-2xl border border-border bg-card p-3 lg:p-4 hover:border-primary/40 hover:bg-primary/[0.03] active:scale-[0.995] transition-all"
              >
                <div className="shrink-0 w-16 h-[5.3rem] lg:w-20 lg:h-[6.6rem] rounded-xl overflow-hidden border border-border bg-muted">
                  <img src={g.cover} alt="" className="w-full h-full object-cover block" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[11px] font-bold text-primary/80 mb-1">
                    {i === 0 ? "전체 개요" : `상세 ${i}`}
                  </span>
                  <p className="text-base lg:text-lg font-extrabold text-foreground leading-snug text-balance">{g.title}</p>
                  <p className="mt-1 text-[13px] lg:text-sm text-muted-foreground line-clamp-2">{g.summary}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BusinessGuideIndex;
