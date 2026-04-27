import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Slide {
  label: string;
  path: string;
  background: string;
}

const slides: Slide[] = [
  {
    label: "AI 플래너 버튼 CTA",
    path: "/ai-planner",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD4DC 55%, #F6909B 110%)",
  },
  {
    label: "AI 스튜디오 버튼 CTA",
    path: "/ai-studio",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FCE3BE 55%, #F5BE7A 110%)",
  },
  {
    label: "포인트 게임 안내",
    path: "/points",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD0E0 55%, #F58FBC 110%)",
  },
  {
    label: "공유 이벤트 안내",
    path: "/events/share",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #DCEEFB 55%, #A8D2F0 110%)",
  },
  {
    label: "신규가입 1달 유료혜택 안내",
    path: "/events/welcome",
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
          key={slide.label}
          onClick={() => navigate(slide.path)}
          aria-label={slide.label}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
            i === index ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ background: slide.background }}
        >
          <span className="text-base font-medium text-black/80">
            {slide.label}
          </span>
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
