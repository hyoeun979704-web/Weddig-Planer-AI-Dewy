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

const row1: CategoryItem[] = [
  { label: "웨딩홀", image: weddingHallImg, path: "/venues", emoji: "🏛️" },
  { label: "스드메", image: studioImg, path: "/studios", emoji: "📸" },
  { label: "예복", image: suitImg, path: "/suit", emoji: "🤵" },
  { label: "한복", image: hanbokImg, path: "/hanbok", emoji: "👘" },
];

const row2: CategoryItem[] = [
  { label: "청첩장 모임", image: invitationImg, path: "/invitation-venues", emoji: "💌" },
  { label: "가전·혼수", image: applianceImg, path: "/appliances", emoji: "🏠" },
  { label: "예물·예단", image: jewelryImg, path: "/honeymoon-gifts", emoji: "💍" },
  { label: "신혼여행", image: honeymoonImg, path: "/honeymoon", emoji: "✈️" },
];

const Tile = ({ item, onClick }: { item: CategoryItem; onClick: () => void }) => {
  const src = typeof item.image === "string" ? item.image : item.image.src;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
    >
      <div className="w-[68.25px] h-[68.25px] rounded-[20px] overflow-hidden bg-white">
        <img
          src={src}
          alt={item.label}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl flex items-center justify-center w-full h-full">${item.emoji}</span>`;
          }}
        />
      </div>
      <span className="text-[12px] leading-[15px] text-black text-center">
        {item.label}
      </span>
    </button>
  );
};

const HomeCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <>
      <section className="bg-[hsl(var(--pink-50))] px-[30px] pt-[30px] pb-[10px]">
        <div className="grid grid-cols-4 gap-x-5 gap-y-[5px]">
          {row1.map((cat) => (
            <Tile key={cat.label} item={cat} onClick={() => navigate(cat.path)} />
          ))}
        </div>
      </section>
      <section className="bg-[hsl(var(--pink-50))] px-[30px] pt-[10px] pb-[30px]">
        <div className="grid grid-cols-4 gap-x-5 gap-y-[5px]">
          {row2.map((cat) => (
            <Tile key={cat.label} item={cat} onClick={() => navigate(cat.path)} />
          ))}
        </div>
      </section>
    </>
  );
};

export default HomeCategoryGrid;
