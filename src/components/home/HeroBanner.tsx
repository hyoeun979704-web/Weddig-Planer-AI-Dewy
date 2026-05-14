import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Slide {
  label: string;
  path: string;
  background: string;
  /** When true, slide is hidden for already-signed-in users. */
  guestOnly?: boolean;
}

const ALL_SLIDES: Slide[] = [
  {
    label: "AI 플래너에게 결혼 준비 질문하기",
    path: "/ai-planner",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD4DC 55%, #F6909B 110%)",
  },
  {
    label: "AI 스튜디오에서 드레스 미리 입어보기",
    path: "/ai-studio",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FCE3BE 55%, #F5BE7A 110%)",
  },
  {
    label: "포인트 게임으로 결혼 준비 보상 받기",
    path: "/points",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #FBD0E0 55%, #F58FBC 110%)",
  },
  {
    label: "친구 초대하고 혜택 받기",
    path: "/referral",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #DCEEFB 55%, #A8D2F0 110%)",
  },
  // Guest-only: signed-in users have already passed this funnel.
  {
    label: "신규가입 1달 유료혜택 안내",
    path: "/auth",
    background:
      "radial-gradient(circle at 20% 15%, #FFFFFF 0%, #DDEEDC 55%, #B6D8B2 110%)",
    guestOnly: true,
  },
];

/**
 * Marketing carousel at the top of the home page.
 *
 * UX changes:
 *  - No longer auto-rotates by default. Tap/swipe to advance, dots to jump.
 *    Auto-rotation forced the user's eye away from the PersonaDashboard
 *    (the actual primary surface for onboarded users) every 2.8s.
 *  - Guest-only slides are filtered out for signed-in users — no point
 *    pitching "신규가입 혜택" to someone who's already signed in.
 *  - Manual swipe support via touch events.
 */
const HeroBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const slides = useMemo(
    () => ALL_SLIDES.filter(s => !s.guestOnly || !user),
    [user]
  );

  // Reset the index if the visible slide count shrinks (e.g. user signs in
  // and the guest-only slide disappears).
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 30) return;
    if (dx < 0) setIndex(i => (i + 1) % slides.length);
    else setIndex(i => (i - 1 + slides.length) % slides.length);
  };

  return (
    <div
      className="relative w-full h-[261px] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
          <span className="text-base font-medium text-black/80 px-6 text-center">
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
