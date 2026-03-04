import { useNavigate } from "react-router-dom";
import { categoryRouteMap } from "@/hooks/useVendors";

interface CategoryItem {
  label: string;
  emoji: string;
  path: string;
}

const categories: CategoryItem[] = Object.entries(categoryRouteMap).map(([, config]) => ({
  label: config.label,
  emoji: config.emoji,
  path: config.listPath,
}));

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
