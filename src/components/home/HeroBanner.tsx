import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import weddingHallImg from "@/assets/categories/wedding-hall.png";
import studioImg from "@/assets/categories/studio.png";
import honeymoonImg from "@/assets/categories/honeymoon.png";
import jewelryImg from "@/assets/categories/jewelry.png";
import invitationImg from "@/assets/categories/invitation.png";

interface Slide {
  image: string | { src: string };
  label: string;
  path: string;
}

const slides: Slide[] = [
  { image: weddingHallImg, label: "웨딩홀", path: "/venues" },
  { image: studioImg, label: "스드메", path: "/studios" },
  { image: honeymoonImg, label: "신혼여행", path: "/honeymoon" },
  { image: jewelryImg, label: "예물·예단", path: "/honeymoon-gifts" },
  { image: invitationImg, label: "청첩장 모임", path: "/invitation-venues" },
];

const HeroBanner = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(id);
  }, []);

  const bg = "linear-gradient(155.47deg, #FFFFFF 21.36%, #F6909B 111.33%)";

  return (
    <div
      className="relative w-full h-[261px] overflow-hidden"
      style={{ background: bg }}
    >
      {slides.map((slide, i) => {
        const src = typeof slide.image === "string" ? slide.image : slide.image.src;
        return (
          <button
            key={slide.label}
            onClick={() => navigate(slide.path)}
            aria-label={slide.label}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={src}
              alt={slide.label}
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div
              className="absolute inset-0"
              style={{ background: bg, mixBlendMode: "soft-light", opacity: 0.6 }}
            />
          </button>
        );
      })}

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
