import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { CategoryTab } from "./CategoryTabBar";
import { useRecommendedItems } from "@/hooks/useRecommendedItems";
import { Skeleton } from "@/components/ui/skeleton";

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

const GallerySkeleton = () => (
  <Skeleton className="aspect-[3/4] rounded-xl w-full" />
);

const galleryMeta: Record<string, { title: string; subtitle: string; galleryPath: string }> = {
  "wedding-hall": {
    title: "실시간 웨딩홀 갤러리",
    subtitle: "실제 예식장 사진",
    galleryPath: "/gallery",
  },
  "sdm": {
    title: "실시간 스드메 화보",
    subtitle: "스튜디오·드레스·메이크업",
    galleryPath: "/gallery",
  },
};

interface StudioGalleryProps {
  activeTab?: CategoryTab;
}

const StudioGallery = ({ activeTab = "sdm" }: StudioGalleryProps) => {
  const navigate = useNavigate();
  const meta = galleryMeta[activeTab] || galleryMeta["sdm"];
  const { data: items, isLoading } = useRecommendedItems(activeTab);

  return (
    <section className="py-6 bg-muted/30">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{meta.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.subtitle}</p>
        </div>
        <button 
          onClick={() => navigate(meta.galleryPath)}
          className="flex items-center gap-1 text-sm text-primary font-medium"
        >
          더보기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 px-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <GallerySkeleton key={i} />)
        ) : items && items.length > 0 ? (
          items.slice(0, 6).map((item) => (
            <GalleryItem key={item.id} imageUrl={item.imageUrl} label={item.name} />
          ))
        ) : (
          <div className="col-span-3 flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">등록된 항목이 없습니다</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default StudioGallery;
