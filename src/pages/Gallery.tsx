import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const galleryItems = [
  { imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400", label: "더채플앳청담", category: "웨딩홀" },
  { imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400", label: "그랜드힐튼", category: "웨딩홀" },
  { imageUrl: "https://images.unsplash.com/photo-1595407753234-0882f1e77954?w=400", label: "스튜디오A", category: "스튜디오" },
  { imageUrl: "https://images.unsplash.com/photo-1594463750939-ebb28c3f7f75?w=400", label: "드레스샵B", category: "드레스" },
  { imageUrl: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=400", label: "루벨아뜨리움", category: "웨딩홀" },
  { imageUrl: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=400", label: "아펠가모", category: "웨딩홀" },
  { imageUrl: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400", label: "메이크업C", category: "메이크업" },
  { imageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=400", label: "스튜디오D", category: "스튜디오" },
  { imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400", label: "드레스샵E", category: "드레스" },
  { imageUrl: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=400", label: "더플라자", category: "웨딩홀" },
  { imageUrl: "https://images.unsplash.com/photo-1510076857177-7470076d4098?w=400", label: "롯데호텔", category: "웨딩홀" },
  { imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400", label: "메이크업F", category: "메이크업" },
];

const Gallery = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">갤러리</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 px-4 py-4">
        <p className="text-sm text-muted-foreground mb-6">
          실제 예식장 및 스튜디오 사진
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          {galleryItems.map((item, index) => (
            <button
              key={index}
              className="relative aspect-[3/4] rounded-xl overflow-hidden group"
            >
              <img 
                src={item.imageUrl} 
                alt={item.label}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <span className="text-xs font-medium text-white block">{item.label}</span>
                <span className="text-xs text-white/70">{item.category}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Gallery;
