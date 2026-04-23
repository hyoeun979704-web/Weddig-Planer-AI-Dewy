import { useState, useEffect } from "react";
import { CategoryTab } from "./CategoryTabBar";

const bannerGradients = [
  "from-pink-200 via-pink-100 to-rose-50",
  "from-amber-200 via-yellow-100 to-orange-50",
  "from-pink-100 via-rose-50 to-pink-50",
  "from-sky-200 via-blue-100 to-sky-50",
  "from-emerald-100 via-green-50 to-teal-50",
];

interface TabHeroContentProps {
  activeTab?: CategoryTab;
}

const TabHeroContent = ({ activeTab }: TabHeroContentProps) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % bannerGradients.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "220px" }}>
      {bannerGradients.map((gradient, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-gradient-to-br ${gradient} transition-opacity duration-700`}
          style={{ opacity: current === i ? 1 : 0 }}
        />
      ))}
      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
        {bannerGradients.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${
              current === i ? "w-4 h-2 bg-gray-500" : "w-2 h-2 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default TabHeroContent;
