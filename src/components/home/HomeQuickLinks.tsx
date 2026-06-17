import { useNavigate } from "react-router-dom";
import { ClipboardList, Scale, FileText } from "lucide-react";
import { trackHomeNav } from "@/lib/track";

// 홈에서 주요 도구로 바로 가는 단축 줄. 홈이 AI 플래너 중심이라 보드·견적·비교 같은
// 신규 핵심 기능 발견성이 낮던 문제를 해소(가로 스크롤, 상단 노출).
// 일정·예산은 하단 탭, 찜은 헤더 하트에 이미 있어 여기선 중복이라 제외(드리프트 방지).
const LINKS: { label: string; href: string; Icon: typeof ClipboardList }[] = [
  { label: "업체보드", href: "/board", Icon: ClipboardList },
  { label: "내 견적", href: "/quote", Icon: FileText },
  { label: "업체비교", href: "/compare", Icon: Scale },
];

const HomeQuickLinks = () => {
  const navigate = useNavigate();
  return (
    <nav aria-label="주요 기능 바로가기" className="px-4 pt-3 pb-1">
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
        {LINKS.map(({ label, href, Icon }) => (
          <button
            key={href}
            type="button"
            onClick={() => {
              trackHomeNav("quick_links", href);
              navigate(href);
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 w-[58px] active:scale-95 transition-transform"
          >
            <span className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </span>
            <span className="text-[11px] font-medium text-foreground/80 whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default HomeQuickLinks;
