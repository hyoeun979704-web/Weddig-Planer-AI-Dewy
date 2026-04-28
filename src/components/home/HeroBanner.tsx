import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Slide {
  /** Bold headline shown center-stage. */
  headline: string;
  /** Optional supporting line under the headline. */
  sub?: string;
  /** Where the slide navigates on tap. */
  path: string;
  /** Inline radial gradient background. */
  background: string;
}

const slides: Slide[] = [
  {
    headline: "막막한 결혼 준비,\nAI가 같이 정리해드려요",
    sub: "Dewy AI 플래너 →",
    path: "/ai-planner",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD4DC 55%, #F6909B 110%)",
  },
  {
    headline: "청첩장 · 드레스 시안,\nAI로 5분 만에",
    sub: "AI 스튜디오 둘러보기 →",
    path: "/ai-studio",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FCE3BE 55%, #F5BE7A 110%)",
  },
  {
    headline: "꽃 모으면서\n진짜 포인트 적립",
    sub: "포인트 게임 시작 →",
    path: "/merge-game",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD0E0 55%, #F58FBC 110%)",
  },
  {
    headline: "친구 초대하면\n둘 다 포인트",
    sub: "친구 초대 혜택 →",
    path: "/points",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #DCEEFB 55%, #A8D2F0 110%)",
  },
  {
    headline: "신규 가입 시\n1달 프리미엄 무료",
    sub: "프리미엄 둘러보기 →",
    path: "/premium",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #DDEEDC 55%, #B6D8B2 110%)",
  },
];

const HeroBanner = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 2800);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative w-full h-[261px] overflow-hidden"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <button
          key={slide.headline}
          onClick={() => navigate(slide.path)}
          aria-label={slide.headline.replace(/\n/g, " ")}
          className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-opacity duration-500 ${
            i === index ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ background: slide.background }}
        >
          <p className="text-[19px] font-bold text-black/85 leading-tight whitespace-pre-line text-center">
            {slide.headline}
          </p>
          {slide.sub && (
            <span className="mt-3 inline-flex items-center text-[13px] font-medium text-black/70 px-3 py-1 rounded-full bg-white/40 backdrop-blur-sm">
              {slide.sub}
            </span>
          )}
        </button>
      ))}

      {/* Page control */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex items-center gap-5 px-3 py-2 rounded-full">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}번째 슬라이드로 이동`}
            className={`w-2 h-2 rounded-full bg-black transition-opacity ${
              i === index ? "opacity-100" : "opacity-30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroBanner;
