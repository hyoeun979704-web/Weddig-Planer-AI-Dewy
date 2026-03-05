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
  { label: "웨딩홀", image: weddingHallImg, path: "/vendors/웨딩홀" },
  { label: "스드메", image: studioImg, path: "/vendors/스드메" },
  { label: "한복", image: hanbokImg, path: "/vendors/한복" },
  { label: "예복", image: suitImg, path: "/vendors/예복" },
  { label: "허니문", image: honeymoonImg, path: "/vendors/허니문" },
  { label: "예물예단", image: jewelryImg, path: "/vendors/혼수" },
  { label: "혼수가전", image: applianceImg, path: "/vendors/혼수" },
  { label: "청첩장·모임", image: invitationImg, path: "/vendors/청첩장" },
];

const HomeCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5">
      <div className="grid grid-cols-4 gap-y-4 gap-x-2">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => navigate(cat.path)}
            className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <img src={cat.image} alt={cat.label} className="w-10 h-10 object-contain" />
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
