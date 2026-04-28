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

// Headlines are intentional design placeholders ("AI 플래너 버튼 CTA",
// etc.) per the user's design spec — the carousel slot is reserved for
// marketing copy that will be filled in later. Don't replace with
// finished copy without sign-off.
const slides: Slide[] = [
  {
    headline: "AI 플래너 버튼 CTA",
    path: "/ai-planner",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD4DC 55%, #F6909B 110%)",
  },
  {
    headline: "AI 스튜디오 버튼 CTA",
    path: "/ai-studio",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FCE3BE 55%, #F5BE7A 110%)",
  },
  {
    headline: "포인트 게임 안내",
    path: "/merge-game",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD0E0 55%, #F58FBC 110%)",
  },
  {
    headline: "친구 초대하면 둘 다 포인트",
    path: "/points",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #DCEEFB 55%, #A8D2F0 110%)",
  },
  {
    headline: "신규가입 1달 유료혜택 안내",
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
          <p className="text-[16px] font-medium text-black/75 leading-tight whitespace-pre-line text-center">
            {slide.headline}
          </p>
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
