import type { StaticImageData } from "next/image";
import { useNavigate } from "react-router-dom";
import weddingHallImg from "@/assets/categories/wedding-hall.png";
import studioImg from "@/assets/categories/studio.png";
import hanbokImg from "@/assets/categories/hanbok.png";
import suitImg from "@/assets/categories/suit.png";
import honeymoonImg from "@/assets/categories/honeymoon.png";
import jewelryImg from "@/assets/categories/jewelry.png";
import applianceImg from "@/assets/categories/appliance.png";
import invitationImg from "@/assets/categories/invitation.png";

type ImageSrc = string | { src: string; width: number; height: number };

interface CategoryItem {
  label: string;
  image: ImageSrc;
  path: string;
  emoji: string;
}

const categories: CategoryItem[] = [
  { label: "웨딩홀", image: weddingHallImg, path: "/venues", emoji: "🏛️" },
  { label: "스드메", image: studioImg, path: "/studios", emoji: "📸" },
  { label: "한복", image: hanbokImg, path: "/hanbok", emoji: "👘" },
  { label: "예복", image: suitImg, path: "/suit", emoji: "🤵" },
  { label: "허니문", image: honeymoonImg, path: "/honeymoon", emoji: "✈️" },
  { label: "예물예단", image: jewelryImg, path: "/honeymoon-gifts", emoji: "💍" },
  { label: "혼수가전", image: applianceImg, path: "/appliances", emoji: "🏠" },
  { label: "청첩장·모임", image: invitationImg, path: "/invitation-venues", emoji: "💌" },
];

const HomeCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-4">
      <div className="grid grid-cols-4 gap-y-4 gap-x-3">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => navigate(cat.path)}
            className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-1 ring-border group-hover:ring-primary/40 transition-all shadow-sm bg-muted">
              <img
                src={typeof cat.image === "string" ? cat.image : cat.image.src}
                alt={cat.label}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl flex items-center justify-center w-full h-full">${cat.emoji}</span>`;
                }}
              />
            </div>
            <span className="text-xs font-medium text-foreground leading-tight text-center">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HomeCategoryGrid;
