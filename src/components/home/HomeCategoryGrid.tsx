import { useNavigate } from "react-router-dom";
import weddingHallImg from "@/assets/categories/wedding-hall.png";
import studioImg from "@/assets/categories/studio.png";
import hanbokImg from "@/assets/categories/hanbok.png";
import suitImg from "@/assets/categories/suit.png";
import honeymoonImg from "@/assets/categories/honeymoon.png";
import jewelryImg from "@/assets/categories/jewelry.png";
import applianceImg from "@/assets/categories/appliance.png";
import invitationImg from "@/assets/categories/invitation.png";

interface CategoryItem {
  label: string;
  image: string;
  path: string;
}

const categories: CategoryItem[] = [
  { label: "웨딩홀", image: weddingHallImg, path: "/venues" },
  { label: "스드메", image: studioImg, path: "/studios" },
  { label: "한복", image: hanbokImg, path: "/hanbok" },
  { label: "예복", image: suitImg, path: "/suit" },
  { label: "허니문", image: honeymoonImg, path: "/honeymoon" },
  { label: "예물예단", image: jewelryImg, path: "/honeymoon-gifts" },
  { label: "혼수가전", image: applianceImg, path: "/appliances" },
  { label: "청첩장·모임", image: invitationImg, path: "/invitation-venues" },
];

const HomeCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5">
      <div className="grid grid-cols-4 gap-y-5 gap-x-2">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => navigate(cat.path)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-primary/40 transition-all shadow-sm">
              <img
                src={cat.image}
                alt={cat.label}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[11px] font-medium text-foreground leading-tight text-center">
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HomeCategoryGrid;
