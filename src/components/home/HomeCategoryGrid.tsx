import { useNavigate } from "react-router-dom";

interface CategoryItem {
  label: string;
  emoji: string;
  path: string;
}

const categories: CategoryItem[] = [
  { label: "웨딩홀", emoji: "🏛️", path: "/vendors/웨딩홀" },
  { label: "스드메", emoji: "📸", path: "/vendors/스드메" },
  { label: "한복", emoji: "👘", path: "/vendors/한복" },
  { label: "예복", emoji: "🤵", path: "/vendors/예복" },
  { label: "허니문", emoji: "🏝️", path: "/vendors/허니문" },
  { label: "예물예단", emoji: "💍", path: "/vendors/혼수" },
  { label: "혼수가전", emoji: "🏠", path: "/vendors/혼수" },
  { label: "청첩장·모임", emoji: "💌", path: "/vendors/청첩장" },
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
            <span className="text-[28px] leading-none">{cat.emoji}</span>
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
