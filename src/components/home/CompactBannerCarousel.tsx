import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Compact label-style carousel that replaces the full-bleed HeroBanner.
// Two slots only — 이달의 혜택 / 이벤트 — so the dashboard underneath
// stays the visual anchor. Each chip routes to a curated landing page.
interface Slide {
  key: "deals" | "events";
  icon: string;
  title: string;
  subtitle: string;
  path: string;
  bg: string;
  fg: string;
}

const SLIDES: Slide[] = [
  {
    key: "deals",
    icon: "🎁",
    title: "이달의 혜택",
    subtitle: "최대 30% 할인 + 사은품",
    path: "/deals",
    bg: "bg-gradient-to-r from-[#FFD6DD] via-[#FFC7D3] to-[#FFE1B0]",
    fg: "text-[hsl(353,75%,40%)]",
  },
  {
    key: "events",
    icon: "✨",
    title: "이벤트",
    subtitle: "신규 가입 1달 프리미엄 무료",
    path: "/events",
    bg: "bg-gradient-to-r from-[#FFE9B7] via-[#FFD891] to-[#FFC07A]",
    fg: "text-amber-700",
  },
];

const SLIDE_INTERVAL_MS = 3500;

const CompactBannerCarousel = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  const active = SLIDES[index];

  return (
    <div
      className="px-4 pt-3 pb-2 bg-background"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(active.path)}
          aria-label={`${active.title} — ${active.subtitle}`}
          className={cn(
            "flex-1 flex items-center gap-2.5 rounded-full pl-3.5 pr-3 py-2.5 active:scale-[0.98] transition-transform",
            active.bg
          )}
        >
          <span className="text-base" aria-hidden>{active.icon}</span>
          <div className="flex-1 flex flex-col items-start leading-tight">
            <span className={cn("text-[12px] font-bold", active.fg)}>{active.title}</span>
            <span className="text-[10px] font-medium text-black/55">{active.subtitle}</span>
          </div>
          <ChevronRight className={cn("w-4 h-4 flex-shrink-0", active.fg)} />
        </button>
        <div className="flex items-center gap-1" role="tablist" aria-label="배너 인디케이터">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setIndex(i)}
              aria-label={`${s.title} 슬라이드`}
              aria-selected={i === index}
              role="tab"
              className={cn(
                "h-1 rounded-full transition-all",
                i === index ? "w-3.5 bg-primary" : "w-1 bg-border"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompactBannerCarousel;
