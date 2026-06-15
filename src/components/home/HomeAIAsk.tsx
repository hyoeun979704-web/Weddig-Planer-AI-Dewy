import { useNavigate } from "react-router-dom";
import { Sparkles, Search } from "lucide-react";

// 홈 상단 AI 비서 진입 — "물어보기" 한 줄 + 자주 묻는 바로가기 칩.
// 혼합형 홈의 '행동' 진입점: 무엇을 할지 모를 때 AI 플래너로, 명확하면 칩으로 바로.
const CHIPS: { label: string; href: string }[] = [
  { label: "이번 주 할 일", href: "/schedule" },
  { label: "예산 점검", href: "/budget" },
  { label: "업체 추천", href: "/venues" },
];

const HomeAIAsk = () => {
  const navigate = useNavigate();
  return (
    <section className="px-4 pt-3 pb-1">
      <button
        type="button"
        onClick={() => navigate("/ai-planner")}
        className="w-full flex items-center gap-2.5 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-left active:scale-[0.99] transition-transform"
      >
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <span className="flex-1 text-[13px] text-muted-foreground">AI 플래너에게 물어보기 · 예: 이번 주 할 일</span>
        <Search className="w-4 h-4 text-primary shrink-0" />
      </button>
      <div className="flex gap-1.5 mt-2 overflow-x-auto -mx-1 px-1">
        {CHIPS.map(({ label, href }) => (
          <button
            key={href}
            type="button"
            onClick={() => navigate(href)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-muted text-[12px] font-medium text-foreground/80 active:scale-95 transition-transform"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default HomeAIAsk;
