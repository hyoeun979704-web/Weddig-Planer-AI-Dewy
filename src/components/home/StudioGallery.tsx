import { ChevronRight } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";

interface GalleryItemProps {
  imageUrl: string;
  label: string;
}

const GalleryItem = ({ imageUrl, label }: GalleryItemProps) => (
  <button className="relative aspect-[3/4] rounded-xl overflow-hidden group">
    <img 
      src={imageUrl} 
      alt={label}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      onError={(e) => {
        e.currentTarget.src = "/placeholder.svg";
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    <span className="absolute bottom-2 left-2 text-xs font-medium text-white">{label}</span>
  </button>
);

interface GalleryData {
  title: string;
  subtitle: string;
  items: GalleryItemProps[];
}

const galleryDataMap: Record<string, GalleryData> = {
  "wedding-hall": {
    title: "실시간 웨딩홀 갤러리",
    subtitle: "실제 예식장 사진",
    items: [
      { imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300", label: "더채플앳청담" },
      { imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=300", label: "그랜드힐튼" },
      { imageUrl: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=300", label: "루벨아뜨리움" },
      { imageUrl: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=300", label: "아펠가모" },
      { imageUrl: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=300", label: "더플라자" },
      { imageUrl: "https://images.unsplash.com/photo-1510076857177-7470076d4098?w=300", label: "롯데호텔" },
    ],
  },
  "sdm": {
    title: "실시간 스드메 화보",
    subtitle: "스튜디오·드레스·메이크업",
    items: [
      { imageUrl: "https://images.unsplash.com/photo-1595407753234-0882f1e77954?w=300", label: "스튜디오A" },
      { imageUrl: "https://images.unsplash.com/photo-1594463750939-ebb28c3f7f75?w=300", label: "드레스샵B" },
      { imageUrl: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=300", label: "메이크업C" },
      { imageUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=300", label: "스튜디오D" },
      { imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300", label: "드레스샵E" },
      { imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=300", label: "메이크업F" },
    ],
  },
};

interface StudioGalleryProps {
  activeTab?: CategoryTab;
}

const StudioGallery = ({ activeTab = "sdm" }: StudioGalleryProps) => {
  const data = galleryDataMap[activeTab] || galleryDataMap["sdm"];

  return (
    <section className="py-6 bg-muted/30">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{data.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{data.subtitle}</p>
        </div>
        <button className="flex items-center gap-1 text-sm text-primary font-medium">
          더보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 px-4">
        {data.items.map((item, index) => (
          <GalleryItem key={index} {...item} />
        ))}
      </div>
    </section>
  );
};

export default StudioGallery;
