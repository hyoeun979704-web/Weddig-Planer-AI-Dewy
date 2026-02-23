import { useNavigate } from "react-router-dom";

interface CategoryItem {
  label: string;
  emoji: string;
  path: string;
}

const categories: CategoryItem[] = [
  { label: "웨딩홀", emoji: "🏛️", path: "/venues" },
  { label: "스드메", emoji: "📸", path: "/studios" },
  { label: "혼수·골든타임", emoji: "🎁", path: "/honeymoon-gifts" },
  { label: "허니문", emoji: "🌴", path: "/honeymoon" },
  { label: "가전·예물", emoji: "💍", path: "/appliances" },
  { label: "예복", emoji: "👔", path: "/suit" },
  { label: "한복", emoji: "👗", path: "/hanbok" },
  { label: "청첩장 모임", emoji: "✉️", path: "/invitation-venues" },
];

const HomeCategoryGrid = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5">
      <div className="grid grid-cols-4 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.path}
            onClick={() => navigate(cat.path)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-accent/50 transition-colors"
          >
            <span className="text-2xl">{cat.emoji}</span>
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
