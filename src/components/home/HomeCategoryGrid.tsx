import { useNavigate } from "react-router-dom";
import { Building2, Camera, Shirt, Briefcase, Palmtree, Gift, Home, Mail } from "lucide-react";

interface CategoryItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const categories: CategoryItem[] = [
  { label: "웨딩홀", icon: Building2, path: "/vendors/웨딩홀" },
  { label: "스드메", icon: Camera, path: "/vendors/스드메" },
  { label: "한복", icon: Shirt, path: "/vendors/한복" },
  { label: "예복", icon: Briefcase, path: "/vendors/예복" },
  { label: "허니문", icon: Palmtree, path: "/vendors/허니문" },
  { label: "예물예단", icon: Gift, path: "/vendors/혼수" },
  { label: "혼수가전", icon: Home, path: "/vendors/혼수" },
  { label: "청첩장·모임", icon: Mail, path: "/vendors/청첩장" },
];

const HomeCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5">
      <div className="grid grid-cols-4 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => navigate(cat.path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <cat.icon className="w-5 h-5 text-primary" />
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
